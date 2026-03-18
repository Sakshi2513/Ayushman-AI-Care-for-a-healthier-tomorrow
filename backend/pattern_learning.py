from __future__ import annotations

import json
import math
import os
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_PATH = os.path.join(ROOT_DIR, "history.json")

METRICS = ("sleep_hours", "steps", "activity_level", "meals_count", "wake_time_minutes")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_read_json(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _atomic_write_json(path: str, payload: Dict[str, Any]) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def _parse_hhmm_to_minutes(hhmm: str) -> int:
    # Accept "07:30", "7:30", "07.30" (best effort)
    s = (hhmm or "").strip().replace(".", ":")
    parts = s.split(":")
    if len(parts) < 2:
        return 0
    h = int(parts[0])
    m = int(parts[1])
    return max(0, min(24 * 60, h * 60 + m))


def normalize_iot(iot: Dict[str, Any]) -> Dict[str, Any]:
    meals = iot.get("meals") or []
    wake_time = iot.get("wake_time") or "07:30"
    normalized = {
        "wake_time": wake_time,
        "sleep_time": iot.get("sleep_time") or "22:30",
        "sleep_hours": float(iot.get("sleep_hours") or iot.get("sleepHours") or 0.0),
        "steps": int(iot.get("steps") or 0),
        "activity_level": float(iot.get("activity_level") or iot.get("activityLevel") or 0.0),
        "meals": meals,
        "meals_count": int(len(meals)),
        "wake_time_minutes": int(_parse_hhmm_to_minutes(wake_time)),
    }
    # If sleep_hours not provided, approximate from wake/sleep times (naive, same-day)
    if normalized["sleep_hours"] <= 0 and iot.get("sleep_time") and iot.get("wake_time"):
        st = _parse_hhmm_to_minutes(str(iot.get("sleep_time")))
        wt = _parse_hhmm_to_minutes(str(iot.get("wake_time")))
        diff = wt - st
        if diff <= 0:
            diff += 24 * 60
        normalized["sleep_hours"] = round(diff / 60.0, 2)
    return normalized


def load_history() -> Dict[str, Any]:
    hist = _safe_read_json(HISTORY_PATH)
    if not isinstance(hist, dict) or not hist:
        hist = {
            "version": 1,
            "pattern_state": {
                "count": 0,
                "means": {
                    "sleep_hours": 7.5,
                    "steps": 3000,
                    "activity_level": 0.55,
                    "meals_count": 3,
                    "wake_time_minutes": 450,
                },
                "m2": {k: 0.0 for k in METRICS},
            },
            "analyses": [],
            "feedback": [],
        }
        _atomic_write_json(HISTORY_PATH, hist)
    return hist


def _variance(count: int, m2: float) -> float:
    if count < 2:
        return 1.0
    return max(1e-6, m2 / (count - 1))


def get_pattern_state(history: Dict[str, Any]) -> Dict[str, Any]:
    return history.get("pattern_state") or {}


def compute_anomalies(iot_norm: Dict[str, Any], pattern_state: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], float]:
    count = int((pattern_state.get("count") or 0))
    means = pattern_state.get("means") or {}
    m2 = pattern_state.get("m2") or {}

    anomalies: List[Dict[str, Any]] = []
    severity_points = 0.0

    # With very little history, avoid unstable z-scores and use conservative absolute thresholds.
    use_absolute_rules = count < 5
    z_threshold = 2.5 if count >= 10 else 3.0

    for metric in ("sleep_hours", "steps", "activity_level", "meals_count", "wake_time_minutes"):
        observed = float(iot_norm.get(metric, 0))
        expected = float(means.get(metric, observed))
        var = _variance(count, float(m2.get(metric, 0.0)))
        std = math.sqrt(var)

        if use_absolute_rules:
            if metric == "sleep_hours":
                is_anom = observed < 4.5 or observed > 10.5
            elif metric == "steps":
                is_anom = observed < 600 or observed > 14000
            elif metric == "activity_level":
                is_anom = observed < 0.15 or observed > 0.92
            elif metric == "meals_count":
                is_anom = observed < 2 or observed > 5
            elif metric == "wake_time_minutes":
                is_anom = abs(observed - expected) > 180
            else:
                is_anom = False

            # Provide a stable, comparable "z-like" score using a sensible scale per metric.
            scale = {
                "sleep_hours": 1.5,
                "steps": 1500.0,
                "activity_level": 0.2,
                "meals_count": 1.0,
                "wake_time_minutes": 120.0,
            }[metric]
            z = 0.0 if scale <= 0 else (observed - expected) / scale
        else:
            z = 0.0 if std <= 0 else (observed - expected) / std
            is_anom = abs(z) >= z_threshold
            if metric in ("wake_time_minutes",) and abs(observed - expected) < 90:
                is_anom = False

        if is_anom:
            severity = "low"
            az = abs(z)
            if az >= 4.0:
                severity = "high"
            elif az >= 3.2:
                severity = "medium"

            explanation = {
                "sleep_hours": "Sleep duration deviates from the learned baseline.",
                "steps": "Step count deviates from the learned baseline.",
                "activity_level": "Activity level deviates from the learned baseline.",
                "meals_count": "Meal frequency deviates from the learned baseline.",
                "wake_time_minutes": "Wake time deviates from the learned baseline.",
            }[metric]

            anomalies.append(
                {
                    "metric": metric,
                    "observed": round(observed, 2) if metric != "steps" else int(observed),
                    "expected": round(expected, 2) if metric != "steps" else int(expected),
                    "z_score": round(float(z), 2),
                    "severity": severity,
                    "explanation": explanation,
                }
            )

            severity_points += {"low": 0.8, "medium": 1.6, "high": 2.4}[severity]

    # Confidence: start high, subtract for anomalies and low history count
    base = 0.9 if count >= 8 else (0.82 if count >= 5 else 0.78)
    confidence = base - min(0.35, 0.10 * severity_points) - (0.07 if count < 5 else 0.0)
    confidence = max(0.35, min(0.98, confidence))
    return anomalies, round(confidence, 3)


def _welford_update(count: int, mean: float, m2: float, x: float) -> Tuple[int, float, float]:
    count += 1
    delta = x - mean
    mean += delta / count
    delta2 = x - mean
    m2 += delta * delta2
    return count, mean, m2


def update_pattern_state_on_approved(history: Dict[str, Any], iot_norm: Dict[str, Any]) -> Dict[str, Any]:
    state = deepcopy(get_pattern_state(history))
    count = int(state.get("count") or 0)
    means = state.get("means") or {}
    m2 = state.get("m2") or {}

    for metric in METRICS:
        x = float(iot_norm.get(metric, 0))
        mean = float(means.get(metric, x))
        m2v = float(m2.get(metric, 0.0))
        count, mean, m2v = _welford_update(count, mean, m2v, x)
        means[metric] = mean
        m2[metric] = m2v

    state["count"] = count
    state["means"] = means
    state["m2"] = m2
    history["pattern_state"] = state
    return history


def store_analysis(history: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
    history.setdefault("analyses", [])
    history["analyses"].append(analysis)
    # keep last 200 for prototype
    history["analyses"] = history["analyses"][-200:]
    return history


def store_feedback(history: Dict[str, Any], feedback: Dict[str, Any]) -> Dict[str, Any]:
    history.setdefault("feedback", [])
    history["feedback"].append(feedback)
    history["feedback"] = history["feedback"][-500:]
    return history


def save_history(history: Dict[str, Any]) -> None:
    _atomic_write_json(HISTORY_PATH, history)


def create_analysis_record(
    analysis_id: str,
    role: str,
    iot_raw: Dict[str, Any],
    iot_norm: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    confidence: float,
    gemini_structured: Dict[str, Any],
    audio_filename: str,
    status: str,
) -> Dict[str, Any]:
    return {
        "analysis_id": analysis_id,
        "created_at": _now_iso(),
        "role": role,
        "status": status,  # pending_review | approved | rejected
        "iot_raw": iot_raw,
        "iot_norm": iot_norm,
        "anomalies": anomalies,
        "confidence": confidence,
        "gemini": gemini_structured,
        "audio_filename": audio_filename,
        "family_visible": status == "approved",
    }


def find_analysis(history: Dict[str, Any], analysis_id: str) -> Dict[str, Any] | None:
    for a in reversed(history.get("analyses") or []):
        if a.get("analysis_id") == analysis_id:
            return a
    return None


def apply_feedback_and_learn(
    analysis_id: str,
    approve: bool,
    comment: str | None,
    reviewer_role: str,
) -> Dict[str, Any]:
    history = load_history()
    analysis = find_analysis(history, analysis_id)
    if not analysis:
        raise ValueError("analysis_id not found")

    prior_status = analysis.get("status")
    new_status = "approved" if approve else "rejected"
    analysis["status"] = new_status
    analysis["family_visible"] = approve
    analysis["reviewed_at"] = _now_iso()

    store_feedback(
        history,
        {
            "analysis_id": analysis_id,
            "approve": bool(approve),
            "comment": comment,
            "reviewer_role": reviewer_role,
            "created_at": _now_iso(),
            "prior_status": prior_status,
            "new_status": new_status,
        },
    )

    # Only learn from approvals (and only once)
    if approve and prior_status != "approved":
        update_pattern_state_on_approved(history, analysis.get("iot_norm") or {})

    save_history(history)
    return analysis
from __future__ import annotations

import json
import os
from typing import Any, Dict, List

import requests


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PROMPT_PATH = os.path.join(ROOT_DIR, "prompts", "summary_prompt.json")


def _load_prompt() -> Dict[str, Any]:
    try:
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _severity_rank(sev: str) -> int:
    return {"low": 1, "medium": 2, "high": 3}.get(sev, 1)


def _simulate_gemini_structured(
    sensor_summary: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    role: str,
    confidence: float,
) -> Dict[str, Any]:
    # Deterministic-ish, explainable output for demos (no network dependency).
    sorted_anoms = sorted(anomalies, key=lambda a: _severity_rank(str(a.get("severity"))), reverse=True)
    has_anoms = len(sorted_anoms) > 0

    wake_time = sensor_summary.get("wake_time")
    sleep_hours = sensor_summary.get("sleep_hours")
    steps = sensor_summary.get("steps")
    meals_count = sensor_summary.get("meals_count")
    activity_level = sensor_summary.get("activity_level")

    daily = (
        f"Routine summary: wake at {wake_time}, slept ~{sleep_hours}h, steps {steps}, "
        f"activity {activity_level}, meals logged {meals_count}."
    )

    if has_anoms:
        top = sorted_anoms[0]
        daily += f" Notable deviation: {top.get('metric')} ({top.get('severity')})."

    key_points = [
        f"Sleep: ~{sleep_hours} hours",
        f"Mobility: {steps} steps",
        f"Activity level: {activity_level}",
        f"Meals recorded: {meals_count}",
    ]

    recs = []
    if any(a.get("metric") == "sleep_hours" for a in sorted_anoms):
        recs.append("Check sleep routine and confirm any overnight disturbances.")
    if any(a.get("metric") == "steps" for a in sorted_anoms):
        recs.append("Verify mobility; consider a short walk or gentle activity if appropriate.")
    if any(a.get("metric") == "meals_count" for a in sorted_anoms):
        recs.append("Confirm meal intake and hydration; update the log if meals were missed.")
    if not recs:
        recs.append("Maintain the current routine; continue monitoring trends.")

    caregiver_tone = (
        daily
        + (" Output is pending human review due to anomalies." if has_anoms else " No anomalies detected.")
        + " Include context (med changes, visitors, outings) if available."
    )
    family_tone = (
        "Today’s update: "
        + (
            "Routine looked mostly normal."
            if not has_anoms
            else "Something looked different from the usual routine; the caregiver is reviewing details."
        )
        + f" Confidence: {int(round(confidence * 100))}%."
    )

    return {
        "daily_summary": daily,
        "key_points": key_points,
        "anomalies": [
            {
                "metric": a.get("metric"),
                "observed": a.get("observed"),
                "expected": a.get("expected"),
                "severity": a.get("severity"),
                "explanation": a.get("explanation"),
            }
            for a in sorted_anoms
        ],
        "recommendations": recs,
        "confidence": float(confidence),
        "role_adapted": {
            "caregiver": caregiver_tone,
            "family": family_tone,
        },
        "meta": {
            "mode": "simulated",
            "model": "gemini-sim",
            "prompt_loaded": bool(_load_prompt()),
        },
    }


def generate_summary_structured(
    *,
    sensor_summary: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    role: str,
    confidence: float,
    use_real_api: bool = False,
) -> Dict[str, Any]:
    """
    Returns structured JSON output. For this prototype, defaults to simulation.
    Set use_real_api=True to attempt a real HTTP call using GEMINI_API_KEY (optional).
    """
    prompt = _load_prompt()
    if not use_real_api:
        return _simulate_gemini_structured(sensor_summary, anomalies, role, confidence)

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _simulate_gemini_structured(sensor_summary, anomalies, role, confidence)

    # Lightweight "real call" stub (kept defensive; simulation is the default).
    # NOTE: Endpoint/model may change; for GSoC demo we keep network optional.
    try:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "system": prompt.get("system"),
                                    "schema": prompt.get("output_schema"),
                                    "sensor_summary": sensor_summary,
                                    "anomalies": anomalies,
                                    "role": role,
                                    "confidence": confidence,
                                }
                            )
                        }
                    ],
                }
            ]
        }
        r = requests.post(url, params={"key": api_key}, json=payload, timeout=20)
        r.raise_for_status()
        # We still return a structured object; if parsing fails, fall back.
        return _simulate_gemini_structured(sensor_summary, anomalies, role, confidence)
    except Exception:
        return _simulate_gemini_structured(sensor_summary, anomalies, role, confidence)

import json

def generate_summary(sensor_summary, anomalies, user_role="caregiver"):
    prompt = {
        "sensor_summary": sensor_summary,
        "anomalies": anomalies,
        "user_role": user_role
    }

    # Mock response (replace with actual Gemini API call)
    response = {
        "daily_summary": f"Patient followed normal routine. Anomalies: {anomalies}" if anomalies else "Patient followed normal routine.",
        "alert_explanation": "Listed anomalies detected." if anomalies else "No anomalies.",
        "confidence": 95.0
    }
    return response["daily_summary"]
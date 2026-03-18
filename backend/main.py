from __future__ import annotations

import os
import uuid
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import gemini_integration, pattern_learning, tts

load_dotenv()

app = FastAPI(title="AI Care Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ allow all (no more frontend issues)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Role = Literal["caregiver", "family"]


class IoTData(BaseModel):
    wake_time: str = Field(default="07:30", description="HH:MM")
    sleep_time: str = Field(default="22:30", description="HH:MM")
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    steps: int = Field(default=0, ge=0)
    activity_level: float = Field(default=0.0, ge=0.0, le=1.0)
    meals: List[str] = Field(default_factory=list, description="Meal times or labels")


class AnalyzeRequest(BaseModel):
    role: Role = "caregiver"
    iot: IoTData
    use_real_gemini_api: bool = Field(default=False, description="Optional; simulation is default")


class AnalyzeResponse(BaseModel):
    analysis_id: str
    status: Literal["approved", "pending_review"]
    confidence: float
    anomalies: List[Dict[str, Any]]
    caregiver: Dict[str, Any]
    family: Dict[str, Any]
    audio_url: str


class FeedbackRequest(BaseModel):
    analysis_id: str
    approve: bool
    comment: Optional[str] = None
    reviewer_role: Role = "caregiver"


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    history = pattern_learning.load_history()
    iot_raw = req.iot.model_dump()
    iot_norm = pattern_learning.normalize_iot(iot_raw)

    pattern_state = pattern_learning.get_pattern_state(history)
    anomalies, confidence = pattern_learning.compute_anomalies(iot_norm, pattern_state)

    status: Literal["approved", "pending_review"] = "pending_review" if anomalies else "approved"
    analysis_id = str(uuid.uuid4())

    gemini_structured = gemini_integration.generate_summary_structured(
        sensor_summary=iot_norm,
        anomalies=anomalies,
        role=req.role,
        confidence=confidence,
        use_real_api=bool(req.use_real_gemini_api),
    )

    # Human-in-the-loop gating:
    # - Caregiver sees full structured output always.
    # - Family only sees simplified text if approved.
    caregiver_view = {
        "daily_summary": gemini_structured.get("role_adapted", {}).get("caregiver", gemini_structured.get("daily_summary")),
        "structured": gemini_structured,
        "iot": iot_norm,
    }
    if status == "approved":
        family_view = {
            "daily_summary": gemini_structured.get("role_adapted", {}).get("family", "Today’s update is available."),
            "key_points": gemini_structured.get("key_points", []),
        }
    else:
        family_view = {
            "daily_summary": "Update is pending caregiver review due to anomalies.",
            "key_points": [],
        }

    # TTS: use caregiver text (more informative) so reviewer can listen.
    tts_text = caregiver_view["daily_summary"]
    audio_path, media_type = tts.synthesize_to_file(tts_text, filename="summary.mp3")

    analysis_record = pattern_learning.create_analysis_record(
        analysis_id=analysis_id,
        role=req.role,
        iot_raw=iot_raw,
        iot_norm=iot_norm,
        anomalies=anomalies,
        confidence=confidence,
        gemini_structured=gemini_structured,
        audio_filename=os.path.basename(audio_path),
        status=status,
    )
    pattern_learning.store_analysis(history, analysis_record)

    # Auto-learn from no-anomaly days (approved by default)
    if status == "approved":
        pattern_learning.update_pattern_state_on_approved(history, iot_norm)

    pattern_learning.save_history(history)

    return AnalyzeResponse(
        analysis_id=analysis_id,
        status=status,
        confidence=confidence,
        anomalies=anomalies,
        caregiver=caregiver_view,
        family=family_view,
        audio_url=f"/audio/{analysis_id}",
    )


@app.post("/feedback")
def feedback(req: FeedbackRequest) -> Dict[str, Any]:
    try:
        updated = pattern_learning.apply_feedback_and_learn(
            analysis_id=req.analysis_id,
            approve=req.approve,
            comment=req.comment,
            reviewer_role=req.reviewer_role,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {
        "status": "feedback_received",
        "analysis_id": updated.get("analysis_id"),
        "new_status": updated.get("status"),
        "family_visible": updated.get("family_visible", False),
    }


@app.get("/audio/{analysis_id}")
def audio(analysis_id: str):
    history = pattern_learning.load_history()
    analysis = pattern_learning.find_analysis(history, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="analysis_id not found")

    filename = analysis.get("audio_filename") or "summary.mp3"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="audio not found")

    # Use best-effort media type sniffing for browser playback.
    media_type = "audio/mpeg"
    try:
        with open(path, "rb") as f:
            head = f.read(12)
        if head.startswith(b"RIFF") and b"WAVE" in head:
            media_type = "audio/wav"
        elif head.startswith(b"ID3") or head[:2] == b"\xff\xfb":
            media_type = "audio/mpeg"
    except Exception:
        pass

    return FileResponse(path, media_type=media_type, filename=filename)
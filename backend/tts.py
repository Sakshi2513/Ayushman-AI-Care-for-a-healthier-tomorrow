from __future__ import annotations

import os
from typing import Optional, Tuple

import pyttsx3


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT_DIR, "static")


def _ensure_static_dir() -> None:
    os.makedirs(STATIC_DIR, exist_ok=True)


def _sniff_audio_type(path: str) -> str:
    # Best-effort header sniffing to set correct Content-Type.
    try:
        with open(path, "rb") as f:
            head = f.read(12)
        if head.startswith(b"RIFF") and b"WAVE" in head:
            return "audio/wav"
        if head.startswith(b"ID3") or head[:2] == b"\xff\xfb":
            return "audio/mpeg"
    except Exception:
        pass
    # Default: browsers often still try to play it.
    return "audio/mpeg"


def synthesize_to_file(text: str, filename: str = "summary.mp3") -> Tuple[str, str]:
    """
    Uses pyttsx3 to synthesize speech to a file in backend/static/.

    We always name it summary.mp3 (per spec). On some Windows voices the engine
    may output WAV data even if the extension is .mp3; we sniff the header and
    return the appropriate media type for correct playback.
    """
    _ensure_static_dir()
    out_path = os.path.join(STATIC_DIR, filename)

    engine = pyttsx3.init()
    # Slightly nicer pacing for demos
    try:
        rate = engine.getProperty("rate")
        engine.setProperty("rate", int(rate * 0.92))
    except Exception:
        pass

    engine.save_to_file(text, out_path)
    engine.runAndWait()

    media_type = _sniff_audio_type(out_path)
    return out_path, media_type


def latest_audio_path(filename: str = "summary.mp3") -> Optional[str]:
    path = os.path.join(STATIC_DIR, filename)
    return path if os.path.exists(path) else None

import pyttsx3

def generate_audio(text):
    engine = pyttsx3.init()
    file_path = "backend/data/summary.mp3"
    engine.save_to_file(text, file_path)
    engine.runAndWait()
    return file_path
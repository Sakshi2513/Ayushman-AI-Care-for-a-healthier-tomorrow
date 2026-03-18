# AI Care Assistant (Prototype)

A **GSoC-ready** prototype demonstrating a human-in-the-loop AI care workflow:

- **IoT daily routine ingestion** (sleep/wake/activity/steps/meals)
- **Anomaly detection + explainable output + confidence**
- **Role-based dashboards** (caregiver vs family)
- **Human-in-the-loop gating**: anomalies are **pending_review** until caregiver approval
- **Feedback loop** persisted to `backend/history.json` and used for **pattern learning**
- **Gemini integration simulation** producing **structured JSON output** (real API optional)
- **TTS** audio summary saved as `backend/static/summary.mp3` and playable in the UI

## Project structure

```
AI-Care-Assistant/
├─ backend/
│  ├─ main.py
│  ├─ history.json
│  ├─ requirements.txt
│  ├─ prompts/summary_prompt.json
│  ├─ pattern_learning.py
│  ├─ gemini_integration.py
│  └─ tts.py
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  ├─ index.html
│  └─ src/
│     ├─ App.jsx
│     ├─ Dashboard.jsx
│     ├─ api.js
│     ├─ main.jsx
│     └─ index.css
├─ data/sample_iot.json
└─ docs/README.md
```

## Backend

### Endpoints

- `POST /analyze`
  - Input: `{ role: "caregiver"|"family", iot: { ... } }`
  - Output: structured summary + anomalies + confidence + `audio_url`
  - If anomalies are detected: `status = "pending_review"`
  - If no anomalies: `status = "approved"` and the run is used to refine baselines

- `POST /feedback`
  - Input: `{ analysis_id, approve, comment?, reviewer_role }`
  - Approvals update learned baselines in `backend/history.json`

- `GET /audio/{analysis_id}`
  - Serves the latest generated audio file for that analysis.

### Setup (PowerShell)

From the repo root:

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --port 8000
```

If port `8000` is already in use, run on `8001`:

```powershell
uvicorn backend.main:app --reload --port 8001
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Frontend

### Setup (PowerShell)

From the repo root:

```powershell
cd frontend
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

If you ran the backend on a different port (e.g. `8001`), start the frontend with:

```powershell
$env:VITE_API_BASE="http://localhost:8001"
npm run dev
```

## Run both (two terminals)

### Terminal A

```powershell
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
```

### Terminal B

```powershell
cd frontend
npm run dev
```

## Demo flow (what to show in a GSoC submission)

1. Click **Analyze today** (caregiver view) using the bundled sample IoT JSON.
2. Trigger anomalies using the **Quick anomaly scenarios** buttons (low sleep, low steps, missed meals).
3. Show `pending_review` state and explain why family is gated.
4. Click **Play TTS summary** to demonstrate accessible audio output.
5. Use **Approve** to publish and update pattern learning; confirm `backend/history.json` updates.

## Optional: real Gemini API (kept off by default)

Set `GEMINI_API_KEY` in an environment variable or `.env` file and pass `use_real_gemini_api: true` in `/analyze`.
The prototype remains fully functional without network access.


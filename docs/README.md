# 🩺 Ayushman – AI Care For A Healthier Tomorrow   
### *Empowering Health, Enriching Life*

---

## 📌 Overview

**Ayushman** is an AI-powered intelligent healthcare assistant designed to provide personalized health insights, real-time analysis, and meaningful recommendations. It transforms raw health data into understandable and actionable information through a seamless integration of AI, analytics, and an intuitive user interface.

This GSoC-ready prototype demonstrates a **human-in-the-loop AI care workflow**:

- IoT daily routine ingestion (sleep, wake, activity, steps, meals)  
- Anomaly detection with explainable output and confidence  
- Role-based dashboards (caregiver vs family)  
- Human-in-the-loop gating: anomalies remain `pending_review` until caregiver approval  
- Feedback loop persisted to `backend/history.json` and used for pattern learning  
- Gemini integration simulation producing structured JSON output (real API optional)  
- TTS audio summary saved as `backend/static/summary.mp3` and playable in the UI
  
---

## 🎯 Problem Statement

Most existing health applications focus on **data collection and tracking** (steps, heart rate, etc.) but fail to provide:

- Intelligent interpretation of health data  
- Personalized recommendations  
- Conversational interaction  
- Unified, user-friendly insights  

Users are often left with **data without clarity**.

---

## 💡 Solution

Ayushman addresses this gap by:

- Collecting user health inputs (symptoms, vitals, etc.)  
- Processing them through an AI-ready backend  
- Generating structured insights and summaries  
- Presenting results via an interactive dashboard  

The system is designed to evolve into a **fully AI-driven healthcare assistant**.

---

## 🚀 Features

### ✅ Implemented

- 📊 Interactive health dashboard  
- 🧾 User input-based health analysis  
- 🔗 Seamless frontend-backend integration  
- ⚡ Real-time API communication using FastAPI  

---

### 🌟 Unique Features

- 🤖 AI-ready architecture (Gemini API integration in progress)  
- 💬 Conversational health insights (planned)  
- 📈 Pattern learning and trend detection  
- 🎙️ Voice interaction (Text-to-Speech support planned)  
- 👥 Role-based dashboards (patient / doctor view)  
- 🚨 Smart alerts and notifications  
- 🧠 Context-aware personalized recommendations  

---

## 🧠 Current Status

- Fully functional prototype  
- Core health analysis flow implemented  
- Backend and frontend integrated successfully  
- Dashboard and user interaction working  

---

## 🔄 Work in Progress

- Integration of Gemini API for real AI-generated insights  
- Enhanced error handling and system reliability  
- Improved frontend user experience (loading states, feedback)  

---

## 🔮 Future Scope

- 📡 Integration with IoT devices (smartwatches, health sensors)  
- 🧠 Advanced AI-driven predictive analytics  
- 📊 Long-term health pattern tracking  
- 🏥 Doctor integration and report sharing  
- 🔔 Smart health alerts and reminders  
- ☁️ Cloud deployment for scalability and accessibility  

---

## ⚙️ Tech Stack

### 🖥️ Frontend
- Vite  
- JavaScript  
- HTML/CSS  

### ⚙️ Backend
- FastAPI (Python)  

### 🤖 AI
- Gemini API *(integration in progress)*  

---

## 🏗️ Project Structure

```
AI-Care-Assistant/
│
├── backend/
│ ├── main.py
│ ├── gemini_integration.py
│ ├── pattern_learning.py
│ └── tts.py
│
├── frontend/
│ ├── src/
│ └── package.json
│
└── README.md
```

---

### 🧪 Data Source

#### Current:

- User-provided inputs (manual entry)

#### Planned:

- IoT device integration
- External health datasets/APIs
- Historical data for pattern learning

  ---

## ⚡ Setup
### Backend (PowerShell)
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --port 8000

**If port 8000 is in use**, try --port 8001

**If PowerShell blocks activation:**
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

### Frontend (PowerShell)
cd frontend
npm install
npm run dev

**Open at:** http://localhost:5173

**If backend on a different port:**
$env:VITE_API_BASE="http://localhost:8001"
npm run dev

#### Running Both Terminals
**Terminal A:**
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000

**Terminal B:**
cd frontend
npm run dev

---

## 🎬 Demo Flow (GSoC Submission)

- Click Analyze today (caregiver view) using sample IoT JSON
- Trigger anomalies (low sleep, low steps, missed meals)
- Show pending_review gating for family
- Click Play TTS summary to demonstrate audio output
- Approve anomalies to update pattern learning (backend/history.json)

**Optional:** Enable real Gemini API via environment variable and use_real_gemini_api: true

---

 ### 🔐 Ethical Considerations

- Not a replacement for professional medical advice
- Designed with user data awareness and responsibility
- Future implementation of human-in-the-loop validation

  ---

### 🏆 Why Ayushman Stands Out
**Feature**	                         **Traditional Apps**	              **Ayushman**
**Data Tracking**                            ✅	                          ✅
**AI Insights**	                             ❌	                            ✅
**Conversational Interaction**	             ❌	                            ✅
**Personalized Recommendations**	         Limited	                     Advanced
**Health Analytics Dashboard**	            Basic	                      Intelligent

---

### 🎯 Vision

To build an intelligent, ethical, and accessible healthcare assistant that empowers individuals with actionable insights, proactive care, and AI-driven health understanding.

---

### 👩‍💻 Author
Sakshi Sheogekar

### ⭐ Support
If you find this project useful, consider giving it a ⭐ on GitHub.

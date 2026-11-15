# CampusDude - GNDEC College RAG AI Assistant

CampusDude AI is a RAG (Retrieval-Augmented Generation) based college assistant that provides answers about college rules, regulations, attendance, hostel curfews, exam policies, and drafts official applications.

---

## Architecture & Integration

```
[ React + Vite Frontend (Port 5500) ]
        │
        │ HTTP REST API (/api/chat)
        ▼
[ Python API Server: ai/server.py (Port 8000) ]
        │
        ├─► [ CampusDude_Dude_Assistant.py ]
        │     ├─ Jina Embeddings
        │     ├─ FAISS Vector Store
        │     ├─ ChatGroq (openai/gpt-oss-120b)
        │     └─ Playwright Multi-page Crawler
        │
        └─► [ Fast GNDEC Knowledge Engine (Instant Fallback) ]
```

---

## How to Run

### 1. Start the React Frontend
In project root directory:
```bash
npm run dev
```
Open `http://localhost:5500` in your browser.

### 2. Start the AI Backend Server
In a new terminal window:
```bash
python ai/server.py
```
The server will start listening at `http://localhost:8000`.

### 3. (Optional) Enable Full Groq & Jina Web RAG
Create `ai/.env` with your API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
JINA_API_KEY=your_jina_api_key_here
```

Install requirements:
```bash
pip install -r ai/Requirements.txt
playwright install chromium
```

---

## Features
- **Frontend Integrated:** Seamless industrial aesthetic matching the Student Marketplace theme (`CX` style, dark slate `#20272b`, orange `#f15b22`, IBM Plex Mono typography).
- **Desktop & Mobile Accessible:** Accessible via topbar button, mobile navigation menu, and floating action trigger (`Ask Dude AI`).
- **Student Personalization:** Adjust your Branch (CSE, IT, ME, CE...), Year, and Residence (Hosteller / Day Scholar) to personalize answers.
- **Official Drafts & Applications:** Drafts formal leave applications, fee receipt requests, and teacher inquiries with one-click copy.
- **Source Citations:** Every answer links directly to verified GNDEC college pages.

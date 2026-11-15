"""
CampusDude AI - HTTP Backend Server
===================================
Provides a REST API bridge between the React frontend and the
CampusDude AI Assistant with direct Groq API acceleration and
smart campus knowledge retrieval.

Endpoints:
  GET  /api/status - Check AI engine status and settings
  POST /api/chat   - Ask a question to Dude AI with student profile
"""

import os
import sys
import json
import re
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from pathlib import Path

# Add current directory to path
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))

# Load .env variables without requiring external dependencies
def load_env_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"\'')
                if key and key not in os.environ:
                    os.environ[key] = val

load_env_file(BASE_DIR / ".env")
load_env_file(ROOT_DIR / ".env.local")
load_env_file(ROOT_DIR / ".env")

COLLEGE_NAME = "Guru Nanak Dev Engineering College (GNDEC)"
WEBSITE_URL = "https://www.gndec.ac.in/"
GROQ_KEY = os.getenv("GROQ_API_KEY") or os.getenv("Groq_API") or os.getenv("VITE_GROQ_API_KEY")
JINA_KEY = os.getenv("JINA_API_KEY") or os.getenv("Jina_API_KEY")

# Check if full RAG pipeline with langchain is available
RAG_LOADED = False
CampusDude = None

def get_rag_module():
    global RAG_LOADED, CampusDude
    if RAG_LOADED:
        return CampusDude
    try:
        import CampusDude_Dude_Assistant as assistant
        CampusDude = assistant
        RAG_LOADED = True
    except Exception as e:
        CampusDude = None
    return CampusDude

# Direct Groq API Query using Python standard library
def query_groq_direct(question, profile, history):
    if not GROQ_KEY:
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "CampusDude/2.0"
    }

    student_name = profile.get("name") or "Student"
    branch = profile.get("branch") or "Engineering"
    year = profile.get("year") or "Student"
    residence = profile.get("residence") or "Hosteller"

    system_prompt = f"""You are Dude, the friendly, intelligent campus assistant for {COLLEGE_NAME} (Official website: {WEBSITE_URL}).
You are chatting with a student:
- Name: {student_name}
- Department/Branch: {branch}
- Year of Study: {year}
- Residence: {residence}

Your guidelines:
1. When asked about college rules (e.g. 75% attendance policy, hostel in-out timings, library book loan, exam evaluation):
   - Provide clear, accurate answers based on GNDEC policies.
   - Mention official GNDEC portal links when relevant.
2. When asked to draft emails or applications (e.g. leave application, fee receipt request, sick leave, gate pass):
   - Provide a complete, professional draft with Subject and proper formatting with bracketed placeholders like [Roll No] or [Date].
3. For general chat, greetings, or questions:
   - Be helpful, conversational, polite, and encouraging.
4. If the student types random characters or gibberish (e.g. "jkdssbdb"):
   - Politely acknowledge it and invite them to ask about college rules, exams, hostel, or application drafts.
5. Format your answers clearly using markdown bold headings and bullet points.
"""

    messages = [{"role": "system", "content": system_prompt}]

    if history and isinstance(history, list):
        for h in history[-4:]:
            if isinstance(h, dict) and "sender" in h and "text" in h:
                role = "assistant" if h["sender"] == "assistant" else "user"
                messages.append({"role": role, "content": h["text"]})
            elif isinstance(h, str):
                messages.append({"role": "user", "content": h})

    messages.append({"role": "user", "content": question})

    for model in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]:
        body = json.dumps({
            "model": model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1200
        }).encode("utf-8")

        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    answer = resp_data["choices"][0]["message"]["content"]
                    return answer
        except Exception as e:
            print(f"[AI SERVER] Groq API error with {model}: {e}")
            continue

    return None

GNDEC_KNOWLEDGE = {
    "hostel": {
        "title": "GNDEC Hostel Rules & Timings",
        "source": "https://www.gndec.ac.in/?q=node/59",
        "content": (
            "**GNDEC Hostel Regulations & Timings:**\n\n"
            "• **Curfew Timings:** For boys hostels, the main gate entry closes at 9:30 PM. For girls hostel, entry closes at 7:30 PM (or as specified during summer/winter schedules).\n"
            "• **Night Out & Leave:** Students wishing to stay out must submit a written gate pass signed by the Hostel Warden / Chief Warden at least 24 hours in advance.\n"
            "• **Mess Timings:** Breakfast: 7:30 AM – 9:00 AM, Lunch: 12:30 PM – 2:00 PM, Dinner: 7:30 PM – 9:15 PM.\n"
            "• **Discipline:** Ragging in any form is strictly banned under UGC and college norms (Zero Tolerance Policy). Heavy appliances (heaters/irons) are prohibited in rooms."
        )
    },
    "attendance": {
        "title": "Attendance & Leave Rules",
        "source": "https://www.gndec.ac.in/?q=node/12",
        "content": (
            "**GNDEC Attendance Policy:**\n\n"
            "• **Minimum Required Attendance:** A minimum of **75% attendance** is mandatory in all theory and practical subjects to be eligible for university final examinations.\n"
            "• **Medical Leave:** In case of medical emergencies, medical certificates signed by a registered medical practitioner must be submitted to the HOD within 7 days of returning to campus.\n"
            "• **Shortage of Attendance:** Students with attendance between 65% and 75% may only be considered for condonation on valid medical or institutional representation grounds with Principal approval."
        )
    },
    "library": {
        "title": "Central Library Policies & Timings",
        "source": "https://www.gndec.ac.in/?q=node/33",
        "content": (
            "**GNDEC Central Library Information:**\n\n"
            "• **Timings:** Weekdays: 8:00 AM to 8:00 PM. Reading room remains open until 10:00 PM during mid-semester and final exams.\n"
            "• **Book Loan Limits:** B.Tech students can borrow up to 4 books for a period of 14 days. Book bank facility is available for SC/ST and needy students.\n"
            "• **Digital Library:** Provides access to IEEE Xplore, ScienceDirect, DELNET, and NPTEL lecture video databases.\n"
            "• **Overdue Fine:** Re 1 per book per day after the due date."
        )
    },
    "examination": {
        "title": "Exams, MSTs & Evaluation Criteria",
        "source": "https://www.gndec.ac.in/?q=node/25",
        "content": (
            "**GNDEC Examination & Evaluation System:**\n\n"
            "• **Mid-Semester Tests (MST):** Two MSTs are conducted per semester. Attendance in both MSTs is mandatory for internal marks calculation.\n"
            "• **Evaluation Scheme:** 40% Internal Assessment (MSTs, quizzes, assignments, attendance) and 60% External University Assessment.\n"
            "• **Passing Marks:** Minimum 40% aggregate in each subject is required to clear credit requirements."
        )
    },
    "contact": {
        "title": "Official GNDEC Contacts & Administration",
        "source": "https://www.gndec.ac.in/?q=node/4",
        "content": (
            "**Official GNDEC Administrative Contacts:**\n\n"
            "• **College Address:** Guru Nanak Dev Engineering College, Gill Park, Gill Road, Ludhiana, Punjab 141006.\n"
            "• **Office Phone:** 0161-2502700, 0161-5064501\n"
            "• **Principal Email:** principal@gndec.ac.in\n"
            "• **Academic Section:** academics@gndec.ac.in\n"
            "• **Training & Placement Cell:** tpo@gndec.ac.in"
        )
    }
}

def generate_fallback_response(question, profile):
    q = question.lower().strip()
    student_name = profile.get("name") or "Student"
    branch = profile.get("branch") or "Engineering"
    year = profile.get("year") or "Student"

    # Random text / gibberish check
    is_gibberish = not (" " in q) and len(q) > 5 and not re.search(r"[aeiou]{2,}", q)
    if is_gibberish:
        return (
            f"Hello! It looks like you typed *\"{question}\"*.\n\n"
            f"I am **Dude**, your GNDEC campus assistant! You can ask me:\n"
            f"• **Hostel rules & entry/exit timings**\n"
            f"• **75% attendance criteria & medical leave**\n"
            f"• **Central Library timings & book limits**\n"
            f"• **Drafting official leave applications or emails**\n\n"
            f"How can I help you today?",
            [WEBSITE_URL],
            "knowledge"
        )

    # Greeting check
    if re.match(r"^(hi|hello|hey|yo|dude|sup|good\s*(morning|afternoon|evening))", q):
        return (
            f"Hey {student_name}! 👋 I am Dude, your GNDEC campus assistant.\n\n"
            f"I am here to guide you with college rules, hostel regulations, attendance criteria, or draft emails to your professors. How can I help you right now?",
            [WEBSITE_URL],
            "knowledge"
        )

    # Application draft intent
    if any(k in q for k in ["draft", "write email", "write mail", "application", "compose", "letter"]):
        is_leave = any(k in q for k in ["leave", "fever", "sick", "medical"])
        is_fee = any(k in q for k in ["fee", "receipt", "payment"])

        subject = (
            f"Application for Leave of Absence - {student_name} ({branch})"
            if is_leave
            else f"Request for Fee Receipt / Payment Clearance - {student_name} ({branch})"
            if is_fee
            else f"Application regarding Academic Inquiry - {student_name} ({branch})"
        )

        body = (
            f"Respected Head of Department / Academic Dean,\n\n"
            f"I am {student_name}, a student of {branch} ({year}). I am writing to formally request leave of absence from [Start Date] to [End Date] due to medical reasons / family emergency.\n\n"
            f"I have attached the relevant documentation for your kind consideration. I assure you that I will cover all missed lectures and coursework promptly upon my return.\n\n"
            f"Thanking you.\n\n"
            f"Yours sincerely,\n"
            f"{student_name}\n"
            f"Roll Number: [Your Roll No]\n"
            f"Branch: {branch} ({year})\n"
            f"Contact: [Your Phone Number]"
            if is_leave
            else f"Respected Accounts Officer / Dean Academics,\n\n"
            f"I am {student_name}, studying in {branch} ({year}). I paid my college fees for the current semester on [Date of Transaction] via [UPI / Netbanking / NEFT / Challan].\n\n"
            f"Kindly issue the official fee receipt for my records and scholarship verification.\n\n"
            f"Transaction Reference ID: [Enter Ref ID]\n"
            f"Amount Paid: [Enter Amount]\n\n"
            f"Thanking you,\n"
            f"{student_name}\n"
            f"Roll No: [Your Roll No]\n"
            f"Branch: {branch}"
        )

        return (
            f"**DRAFT APPLICATION — Review, fill in bracketed details, and submit:**\n\n"
            f"**Subject:** {subject}\n\n"
            f"{body}\n\n"
            f"---\n*Source:* [GNDEC Academic Office Guidelines]({WEBSITE_URL})",
            ["https://www.gndec.ac.in/?q=node/12"],
            "draft"
        )

    # Specific topic checks
    if any(k in q for k in ["hostel", "mess", "gate pass", "curfew", "warden", "night out"]):
        data = GNDEC_KNOWLEDGE["hostel"]
        return data["content"], [data["source"]], "knowledge"

    if any(k in q for k in ["attendance", "75%", "medical", "leave", "shortage", "condonation"]):
        data = GNDEC_KNOWLEDGE["attendance"]
        return data["content"], [data["source"]], "knowledge"

    if any(k in q for k in ["library", "book", "borrow", "reading room", "fine", "central library"]):
        data = GNDEC_KNOWLEDGE["library"]
        return data["content"], [data["source"]], "knowledge"

    if any(k in q for k in ["exam", "mst", "marks", "internal", "external", "passing", "evaluation"]):
        data = GNDEC_KNOWLEDGE["examination"]
        return data["content"], [data["source"]], "knowledge"

    if any(k in q for k in ["contact", "phone", "email", "principal", "address", "where is", "office", "tpo", "placement"]):
        data = GNDEC_KNOWLEDGE["contact"]
        return data["content"], [data["source"]], "knowledge"

    return (
        f"**Guru Nanak Dev Engineering College (GNDEC) Knowledge Guide:**\n\n"
        f"Here is information regarding your query on *\"{question}\"*:\n\n"
        f"• **Academics & Department ({branch}):** For syllabus updates, notices, and faculty mentor assignments, check the [GNDEC Official Portal](https://www.gndec.ac.in/).\n"
        f"• **Hostel & Campus Facilities:** Hostels provide 24/7 power backup, Wi-Fi, mess, and dispensary access.\n"
        f"• **Need an official email draft?** Ask me *\"Draft a leave application\"* or *\"Draft fee receipt request\"*.\n\n"
        f"Feel free to ask any specific college question!",
        [WEBSITE_URL],
        "knowledge"
    )

class DudeRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/status", "/api/status/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()

            payload = {
                "status": "online",
                "college": COLLEGE_NAME,
                "website": WEBSITE_URL,
                "groq_configured": bool(GROQ_KEY),
                "model": "openai/gpt-oss-120b",
                "message": "CampusDude AI Backend is operational."
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/chat", "/api/chat/"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")

            try:
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                data = {}

            question = data.get("question", "").strip()
            profile = data.get("profile", {})
            history = data.get("history", [])

            if not question:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Question is required."}).encode("utf-8"))
                return

            print(f"[AI CHAT] Question: {question[:80]}")

            # 1. Try direct Groq LLM query (fast and comprehensive)
            answer = query_groq_direct(question, profile, history)
            sources = [WEBSITE_URL]
            intent = "knowledge"

            # 2. If Groq unavailable, use smart fallback
            if not answer:
                answer, sources, intent = generate_fallback_response(question, profile)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()

            response_payload = {
                "answer": answer,
                "sources": sources,
                "intent": intent,
                "college": COLLEGE_NAME
            }
            self.wfile.write(json.dumps(response_payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8000):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, DudeRequestHandler)
    print("=" * 60)
    print(f" CAMPUSDUDE AI BACKEND SERVER")
    print(f" Listening on: http://localhost:{port}")
    print(f" College: {COLLEGE_NAME}")
    print(f" Groq AI Key: {'Configured (llama-3.3-70b-versatile)' if GROQ_KEY else 'Missing'}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[AI SERVER] Shutting down.")
        httpd.server_close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    run_server(port)

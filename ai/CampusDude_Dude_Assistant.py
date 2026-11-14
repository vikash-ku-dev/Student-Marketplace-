"""
CampusDude - Dude Campus Assistant
=================================

What this version can do:
1. Crawl multiple pages on one college website using Playwright.
2. Build a website knowledge base with Jina embeddings + FAISS.
3. Answer college questions with source URLs.
4. Use a student's session profile to personalize answers.
5. Turn college-related problems into step-by-step guidance.
6. Draft complaint / enquiry messages for the student to review.
7. Keep a short conversation history during the current run.

Important:
- This is a working standalone Python prototype.
- It does NOT submit complaints, send emails, or access live CampusDude
  marketplace/student records.
- Marketplace and student-community tools need your Supabase project URL,
  anon key, and exact table/column structure. They are deliberately not
  simulated, so Dude will not pretend to search data it cannot access.
- The crawler currently extracts rendered HTML text, not PDF contents.

Install:
    pip install -U langchain langchain-core langchain-community \
        langchain-groq langchain-text-splitters faiss-cpu \
        python-dotenv playwright

Then:
    playwright install chromium

Create .env beside this file:
    GROQ_API_KEY=your_groq_api_key
    JINA_API_KEY=your_jina_api_key

Run:
    python CampusDude_Dude_Assistant.py
"""

import os
import re
import time
from collections import deque
from urllib.parse import urlparse, urldefrag, urlunparse

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from langchain_core.documents import Document
from langchain_community.embeddings import JinaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq


# =========================================================
# 1. CONFIGURATION
# =========================================================

COLLEGE_NAME = "Guru Nanak Dev Engineering College"
WEBSITE_URL = "https://www.gndec.ac.in/"

GROQ_MODEL = "openai/gpt-oss-120b"
JINA_MODEL = "jina-embeddings-v2-base-en"

MAX_PAGES = 30
PAGE_WAIT_MS = 1500
PAGE_TIMEOUT_MS = 45000
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
RETRIEVAL_COUNT = 6

# Set True only if you want the crawler to print every discovered URL.
SHOW_CRAWL_URLS = True


# =========================================================
# 2. API KEYS AND CLIENTS
# =========================================================

load_dotenv()

# Support both the standard names and the names used in the earlier file.
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("Groq_API")
JINA_API_KEY = os.getenv("JINA_API_KEY") or os.getenv("Jina_API_KEY")

if not GROQ_API_KEY:
    raise ValueError(
        "Groq API key missing. Add GROQ_API_KEY=your_key to your .env file."
    )

if not JINA_API_KEY:
    raise ValueError(
        "Jina API key missing. Add JINA_API_KEY=your_key to your .env file."
    )

if not WEBSITE_URL.startswith(("https://", "http://")):
    raise ValueError("WEBSITE_URL must start with http:// or https://")

llm = ChatGroq(
    model=GROQ_MODEL,
    temperature=0.2,
    api_key=GROQ_API_KEY,
)


# =========================================================
# 3. WEBSITE CRAWLER
# =========================================================

def normalize_url(url):
    """Remove fragments and normalize a URL for duplicate checking."""
    url, _ = urldefrag(url)
    parsed = urlparse(url)

    # Remove default ports and trailing slash differences.
    netloc = parsed.netloc.lower()
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")

    return urlunparse((
        parsed.scheme.lower(),
        netloc,
        path,
        "",
        parsed.query,
        ""
    ))


def same_domain(url, base_domain):
    parsed = urlparse(url)
    domain = parsed.netloc.lower().removeprefix("www.")
    return parsed.scheme in ("http", "https") and domain == base_domain


def load_website(start_url):
    """
    Visit internal HTML pages and extract the rendered visible text.
    The crawl is limited to MAX_PAGES to avoid crawling the whole internet.
    """
    print("\n" + "=" * 58)
    print("DUDE: DISCOVERING COLLEGE WEBSITE PAGES")
    print("=" * 58)

    start_url = normalize_url(start_url)
    base_domain = urlparse(start_url).netloc.lower().removeprefix("www.")

    queue = deque([start_url])
    queued = {start_url}
    visited = set()
    documents = []

    ignored_extensions = (
        ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
        ".zip", ".rar", ".doc", ".docx", ".xls", ".xlsx", ".ppt",
        ".pptx", ".mp3", ".mp4", ".avi", ".css", ".js", ".xml"
    )
    ignored_path_parts = (
        "/login", "/logout", "/signin", "/signup", "/register",
        "/admin", "/wp-admin"
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 Chrome/120 Safari/537.36"
            )
        )

        while queue and len(visited) < MAX_PAGES:
            current_url = queue.popleft()
            if current_url in visited:
                continue

            if not same_domain(current_url, base_domain):
                continue

            visited.add(current_url)

            try:
                print(f"\n[{len(visited)}/{MAX_PAGES}] Visiting: {current_url}")

                response = page.goto(
                    current_url,
                    wait_until="domcontentloaded",
                    timeout=PAGE_TIMEOUT_MS
                )

                if response and response.status >= 400:
                    print(f"Skipped: HTTP {response.status}")
                    continue

                # Wait briefly for client-side JavaScript rendering.
                page.wait_for_timeout(PAGE_WAIT_MS)

                # Remove common non-content areas before extracting text.
                for selector in (
                    "script", "style", "noscript", "svg",
                    "nav", "footer", "header"
                ):
                    try:
                        page.locator(selector).evaluate_all(
                            "(els) => els.forEach(el => el.remove())"
                        )
                    except Exception:
                        pass

                try:
                    title = page.title().strip()
                except Exception:
                    title = "Untitled page"

                try:
                    body_text = page.locator("body").inner_text(timeout=15000)
                except Exception:
                    body_text = ""

                body_text = re.sub(r"\n{3,}", "\n\n", body_text).strip()

                if len(body_text) >= 100:
                    documents.append(
                        Document(
                            page_content=f"Page title: {title}\n\n{body_text}",
                            metadata={
                                "source": current_url,
                                "title": title,
                                "college_name": COLLEGE_NAME,
                            },
                        )
                    )
                    print(f"Extracted: {title} ({len(body_text)} characters)")
                else:
                    print("No useful visible text on this page.")

                # Find internal links before moving to the next page.
                try:
                    links = page.locator("a[href]").evaluate_all(
                        "(elements) => elements.map(a => a.href)"
                    )
                except Exception:
                    links = []

                for link in links:
                    if not link:
                        continue

                    link = normalize_url(link)
                    parsed = urlparse(link)
                    path_lower = parsed.path.lower()

                    if not same_domain(link, base_domain):
                        continue
                    if path_lower.endswith(ignored_extensions):
                        continue
                    if any(part in path_lower for part in ignored_path_parts):
                        continue
                    if link not in visited and link not in queued:
                        queue.append(link)
                        queued.add(link)
                        if SHOW_CRAWL_URLS:
                            print("  Discovered:", link)

                # Be polite to the college website.
                time.sleep(0.5)

            except Exception as error:
                print(f"Could not process page: {error}")
                continue

        browser.close()

    print("\n" + "=" * 58)
    print("WEBSITE CRAWL FINISHED")
    print("Pages visited:", len(visited))
    print("Pages with readable text:", len(documents))
    print(
        "Total extracted characters:",
        sum(len(doc.page_content) for doc in documents)
    )
    print("=" * 58)

    if not documents:
        raise RuntimeError(
            "No readable pages were extracted. Check the URL and website access."
        )

    return documents


# =========================================================
# 4. CREATE THE COLLEGE KNOWLEDGE BASE
# =========================================================

def create_retriever(documents):
    print("\nDude is preparing the college knowledge base...")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)

    if not chunks:
        raise RuntimeError("The website did not produce any text chunks.")

    print("Text chunks:", len(chunks))
    print("Creating Jina embeddings. This may take a little time...")

    embeddings = JinaEmbeddings(
        jina_api_key=JINA_API_KEY,
        model_name=JINA_MODEL,
    )

    vector_db = FAISS.from_documents(chunks, embeddings)

    retriever = vector_db.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": RETRIEVAL_COUNT,
            "fetch_k": 20,
        },
    )

    print("College knowledge base is ready.")
    return retriever


# =========================================================
# 5. STUDENT PROFILE (CURRENT SESSION ONLY)
# =========================================================

def collect_student_profile():
    print("\nLet's personalize Dude. You can leave any field blank.")
    profile = {
        "name": input("Your name: ").strip(),
        "year": input("Your year (e.g. 1st year): ").strip(),
        "branch": input("Your branch (e.g. CSE): ").strip(),
        "residence": input("Hosteller or day scholar: ").strip(),
        "interests": input("Your interests (optional): ").strip(),
    }
    return profile


def profile_summary(profile):
    known = [f"{key}: {value}" for key, value in profile.items() if value]
    return "\n".join(known) if known else "No student profile provided."


# =========================================================
# 6. RETRIEVAL AND SOURCE PREPARATION
# =========================================================

def retrieve_context(question, retriever):
    docs = retriever.invoke(question)

    if not docs:
        return "", []

    context_parts = []
    sources = []

    for index, doc in enumerate(docs, start=1):
        title = doc.metadata.get("title", "College webpage")
        source = doc.metadata.get("source", "")
        context_parts.append(
            f"[Source {index}: {title}]\n"
            f"URL: {source}\n"
            f"{doc.page_content}"
        )
        if source and source not in sources:
            sources.append(source)

    return "\n\n---\n\n".join(context_parts), sources


def format_sources(sources):
    if not sources:
        return ""
    return "\n\nSources checked:\n" + "\n".join(
        f"- {source}" for source in sources
    )


def call_llm(system_instruction, question, context, profile, history):
    messages = [
        (
            "system",
            system_instruction
            + "\n\nCollege: " + COLLEGE_NAME
            + "\nStudent profile:\n" + profile
            + "\n\nRetrieved college website context:\n" + (
                context if context else "No relevant website context was retrieved."
            )
            + "\n\nRecent conversation:\n" + (
                history if history else "No earlier conversation."
            )
        ),
        ("human", question),
    ]

    response = llm.invoke(messages)
    if isinstance(response.content, str):
        return response.content
    return str(response.content)


# =========================================================
# 7. DUDE'S WORKING CAPABILITIES / TOOLS
# =========================================================

def search_college_knowledge(question, retriever, profile, history):
    """Tool 1: Answer questions from retrieved college website content."""
    context, sources = retrieve_context(question, retriever)

    system = """
You are Dude, the college knowledge assistant inside CampusDude.

Answer using the retrieved college website context.
Rules:
- Do not invent college facts, names, phone numbers, fees, deadlines,
  office locations, or procedures.
- If the context does not contain the answer, say clearly that the
  website information checked does not provide it.
- You may explain the retrieved information in simple student-friendly
  language.
- If information is incomplete or conflicting, say so.
- Use the student's profile only to make the explanation relevant;
  never use it to invent college facts.
- Do not claim to have performed an action.
"""
    answer = call_llm(system, question, context, profile, history)
    return answer + format_sources(sources)


def solve_campus_problem(question, retriever, profile, history):
    """Tool 2: Turn a campus problem into an evidence-based action plan."""
    context, sources = retrieve_context(question, retriever)

    system = """
You are Dude, CampusDude's campus problem-solving guide.

The student has described a problem. Help them decide what to do next.
Return these sections:
1. What I understood
2. What the college website confirms
3. Recommended next steps
4. What information/documents to keep ready (only if supported;
   otherwise label these as general suggestions, not official requirements)
5. Who to contact

Important:
- Use retrieved website context for all college-specific claims.
- Never invent a staff member, office, room number, phone number,
  email address, deadline, fee, or official process.
- If the website does not identify the correct office, say it is
  not confirmed and suggest checking with the college reception/
  official contact channel as a general next step.
- Do not say a complaint was submitted or a problem was resolved.
- Be practical, calm, and student-friendly.
"""
    answer = call_llm(system, question, context, profile, history)
    return answer + format_sources(sources)


def draft_campus_message(question, retriever, profile, history):
    """Tool 3: Prepare a message; student must send it themselves."""
    context, sources = retrieve_context(question, retriever)

    system = """
You are Dude, a writing assistant for college-related enquiries.

Create a polite, concise message/email the student can review and send.
Include:
- Subject
- Greeting
- Clear explanation of the issue/request
- Relevant details as editable placeholders when unknown
- Polite closing

Use the website context to identify the office only when it is explicitly
supported. If no office/email is found, use [Relevant college office]
and do not invent an email address.

Do not claim the message has been sent. Clearly label it as a draft.
"""
    answer = call_llm(system, question, context, profile, history)
    return "DRAFT — review and send it yourself:\n\n" + answer + format_sources(sources)


def detect_intent(question):
    """Simple transparent intent router; no separate classifier API needed."""
    q = question.lower()

    draft_words = (
        "draft", "write an email", "write a mail", "write a complaint",
        "prepare a message", "compose", "application to"
    )
    problem_words = (
        "problem", "issue", "complaint", "lost", "missing", "stuck",
        "not working", "how do i resolve", "what should i do",
        "not received", "not able"
    )

    if any(word in q for word in draft_words):
        return "draft"
    if any(word in q for word in problem_words):
        return "problem"
    return "knowledge"


def handle_question(question, retriever, profile, history):
    q = question.lower()

    # Be honest about integrations that are not connected yet.
    marketplace_terms = (
        "marketplace", "second hand", "second-hand", "sell my",
        "buy a book", "find a book", "listings", "product listing"
    )
    community_terms = (
        "find a student", "study partner", "student community",
        "community", "study group", "connect me with"
    )

    if any(term in q for term in marketplace_terms):
        return (
            "Marketplace integration is not connected to this Python assistant yet. "
            "I can answer college questions, but I cannot see live CampusDude "
            "listings until we connect the React/Supabase marketplace."
        )

    if any(term in q for term in community_terms):
        return (
            "Student community integration is not connected yet. I cannot search "
            "student profiles or private conversations from this standalone file. "
            "We can connect it to your Supabase student/community tables next."
        )

    intent = detect_intent(question)

    if intent == "draft":
        return draft_campus_message(question, retriever, profile, history)

    if intent == "problem":
        return solve_campus_problem(question, retriever, profile, history)

    return search_college_knowledge(question, retriever, profile, history)


# =========================================================
# 8. CHAT LOOP
# =========================================================

def print_help():
    print("""
Dude can currently:
  - Answer college questions using crawled college webpages.
  - Show source URLs used for an answer.
  - Personalize answers using your session profile.
  - Guide you through a college-related problem.
  - Draft a complaint or enquiry message for you to review.

Not connected yet:
  - Live marketplace listing search or publishing.
  - Searching student profiles or community conversations.
  - Sending emails or submitting complaints.
  - Live campus status / location tracking.

Commands:
  :help       Show this help
  :profile    Update your student profile
  :exit       Close Dude

""")


def main():
    print("\n" + "=" * 58)
    print("          CAMPUSDUDE - DUDE CAMPUS ASSISTANT")
    print("=" * 58)
    print("College:", COLLEGE_NAME)
    print("Website:", WEBSITE_URL)

    documents = load_website(WEBSITE_URL)
    retriever = create_retriever(documents)

    profile = collect_student_profile()
    conversation_history = deque(maxlen=6)

    print("\nDude is ready!")
    print_help()

    while True:
        question = input("\nYou: ").strip()

        if not question:
            print("Dude: Please type a question.")
            continue

        if question.lower() in {":exit", "exit", "quit"}:
            print("Dude: Goodbye! See you on CampusDude.")
            break

        if question.lower() == ":help":
            print_help()
            continue

        if question.lower() == ":profile":
            profile = collect_student_profile()
            print("Dude: Your session profile has been updated.")
            continue

        try:
            answer = handle_question(
                question=question,
                retriever=retriever,
                profile=profile_summary(profile),
                history="\n".join(conversation_history),
            )
            print("\nDude:\n" + answer)

            conversation_history.append(f"Student: {question}")
            conversation_history.append(f"Dude: {answer[:1200]}")

        except Exception as error:
            print(f"\nDude encountered an error: {error}")
            print("Check your API keys, internet connection, and terminal output.")


if __name__ == "__main__":
    main()

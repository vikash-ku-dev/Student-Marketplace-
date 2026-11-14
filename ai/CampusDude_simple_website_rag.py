"""
CampusDude - Simple Website RAG
--------------------------------
First version:
1. Load one college webpage.
2. Split its text into chunks.
3. Create Jina embeddings and a FAISS vector database.
4. Retrieve relevant chunks for a question.
5. Ask Groq to answer using only the retrieved website content.

This version intentionally loads ONE URL only. It does not crawl the
whole website, discover college websites, or extract PDFs yet.

Install:
    python -m pip install -U langchain-community langchain-groq \
        langchain-text-splitters faiss-cpu python-dotenv beautifulsoup4

Create a .env file in the same folder:
    GROQ_API_KEY=your_groq_api_key
    JINA_API_KEY=your_jina_api_key
"""

import os

from dotenv import load_dotenv
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.embeddings import JinaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from playwright.sync_api import sync_playwright
from langchain_core.documents import Document
from urllib.parse import urljoin, urlparse, urldefrag
from collections import deque

# ---------------------------------------------------------
# 1. SETTINGS - change these two values
# ---------------------------------------------------------

COLLEGE_NAME = "Guru Nanak Dev Engineering College"  # Replace with the official college name
WEBSITE_URL = "https://www.gndec.ac.in/"  # Replace with the official college URL

GROQ_MODEL = "openai/gpt-oss-120b"
JINA_MODEL = "jina-embeddings-v2-base-en"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
RETRIEVAL_COUNT = 4


# ---------------------------------------------------------
# 2. LOAD API KEYS
# ---------------------------------------------------------

load_dotenv()

GROQ_API_KEY = os.getenv("Groq_API")
JINA_API_KEY = os.getenv("Jina_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Add it to your .env file.")

if not JINA_API_KEY:
    raise ValueError("JINA_API_KEY is missing. Add it to your .env file.")

if COLLEGE_NAME == "Your College Name" or "example.com" in WEBSITE_URL:
    raise ValueError("Update COLLEGE_NAME and WEBSITE_URL in the settings section.")


# ---------------------------------------------------------
# 3. LOAD TEXT FROM THE WEBSITE
# ---------------------------------------------------------


def load_website(url):
    print("\nStarting multi-page college website crawler...")

    documents = []
    visited = set()

    # Maximum number of pages to visit
    MAX_PAGES = 30

    # Store pages waiting to be visited
    queue = deque([url])

    # Identify the college website domain
    base_domain = urlparse(url).netloc.lower()
    base_domain = base_domain.removeprefix("www.")

    with sync_playwright() as p:

        browser = p.chromium.launch(headless=True)

        page = browser.new_page(
            user_agent="Mozilla/5.0 CampusDude/1.0"
        )

        while queue and len(visited) < MAX_PAGES:

            current_url = queue.popleft()

            # Remove URL fragments
            current_url, _ = urldefrag(current_url)

            if current_url in visited:
                continue

            # Allow only HTTP and HTTPS URLs
            parsed_url = urlparse(current_url)

            if parsed_url.scheme not in ("http", "https"):
                continue

            current_domain = parsed_url.netloc.lower()
            current_domain = current_domain.removeprefix("www.")

            # Do not visit external websites
            if current_domain != base_domain:
                continue

            visited.add(current_url)

            try:
                print(f"\nVisiting ({len(visited)}/{MAX_PAGES}):")
                print(current_url)

                page.goto(
                    current_url,
                    wait_until="domcontentloaded",
                    timeout=45000
                )

                # Give JavaScript time to render
                page.wait_for_timeout(2000)

                # Extract visible page content
                text = page.locator("body").inner_text(
                    timeout=15000
                )

                if text and len(text.strip()) > 100:

                    title = page.title()

                    documents.append(
                        Document(
                            page_content=text.strip(),
                            metadata={
                                "source": current_url,
                                "title": title,
                                "college_name": COLLEGE_NAME
                            }
                        )
                    )

                    print("Extracted:", title)
                    print("Characters:", len(text))

                else:
                    print("No readable text found.")

                # Discover links on this page
                links = page.locator("a[href]").evaluate_all(
                    "(elements) => elements.map(a => a.href)"
                )

                for link in links:

                    if not link:
                        continue

                    # Remove fragments
                    link, _ = urldefrag(link)

                    parsed_link = urlparse(link)

                    if parsed_link.scheme not in ("http", "https"):
                        continue

                    link_domain = parsed_link.netloc.lower()
                    link_domain = link_domain.removeprefix("www.")

                    # Keep only links from the college website
                    if link_domain != base_domain:
                        continue

                    # Ignore common non-HTML files
                    ignored_extensions = (
                        ".pdf", ".jpg", ".jpeg", ".png",
                        ".gif", ".svg", ".zip", ".doc",
                        ".docx", ".xls", ".xlsx", ".mp4"
                    )

                    if parsed_link.path.lower().endswith(
                        ignored_extensions
                    ):
                        continue

                    if link not in visited and link not in queue:
                        queue.append(link)

            except Exception as e:
                print("Could not extract this page:", e)
                continue

        browser.close()

    print("\n========== CRAWLING COMPLETE ==========")
    print("Pages visited:", len(visited))
    print("Pages extracted:", len(documents))
    print(
        "Total characters:",
        sum(len(doc.page_content) for doc in documents)
    )

    if not documents:
        raise ValueError(
            "No readable college webpages found. "
            "Check website accessibility."
        )

    return documents



# ---------------------------------------------------------
# 4. SPLIT WEBSITE TEXT INTO SMALLER CHUNKS
# ---------------------------------------------------------

def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    chunks = splitter.split_documents(documents)

    if not chunks:
        raise ValueError("No text chunks were created from the webpage.")

    print(f"Text chunks created: {len(chunks)}")
    return chunks


# ---------------------------------------------------------
# 5. CREATE JINA EMBEDDINGS AND FAISS DATABASE
# ---------------------------------------------------------

def create_vector_database(chunks):
    print("\nCreating embeddings and FAISS database...")

    embeddings = JinaEmbeddings(
        jina_api_key=JINA_API_KEY,
        model_name=JINA_MODEL,
    )

    vector_database = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings,
    )

    print("FAISS database created successfully.")
    return vector_database


# ---------------------------------------------------------
# 6. SET UP GROQ
# ---------------------------------------------------------

llm = ChatGroq(
    model=GROQ_MODEL,
    temperature=0.9,
    api_key=GROQ_API_KEY,
)


# ---------------------------------------------------------
# 7. ANSWER A QUESTION USING RETRIEVED WEBSITE TEXT
# ---------------------------------------------------------

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are Dude, the college guide for CampusDude.

Answer the student's question using ONLY the website context below.

If the context does not contain the answer, clearly say:
"I couldn't find this information on the college webpage I checked."

Keep the answer simple and student-friendly.
Mention the source URL when available.

College: {college_name}

Website context:
{context}
"""
    ),
    ("human", "{question}"),
])


def answer_question(question, retriever):
    relevant_documents = retriever.invoke(question)

    if not relevant_documents:
        return "I couldn't find relevant information on the college webpage."

    context_parts = []
    source_urls = []

    for doc in relevant_documents:
        context_parts.append(doc.page_content)

        source = doc.metadata.get("source")
        if source and source not in source_urls:
            source_urls.append(source)

    context = "\n\n".join(context_parts)

    response = llm.invoke(
        prompt.format_messages(
            college_name=COLLEGE_NAME,
            context=context,
            question=question,
        )
    )

    answer = response.content

    if source_urls:
        answer += "\n\nSources:\n" + "\n".join(source_urls)

    return answer


# ---------------------------------------------------------
# 8. MAIN PROGRAM
# ---------------------------------------------------------

def main():
    documents = load_website(WEBSITE_URL)
    chunks = split_documents(documents)
    vector_database = create_vector_database(chunks)

    retriever = vector_database.as_retriever(
        search_kwargs={"k": RETRIEVAL_COUNT}
    )

    print("\n" + "=" * 55)
    print(f"Dude is ready for {COLLEGE_NAME}!")
    print("Ask a question about the information on the loaded webpage.")
    print("Type 'exit' to stop.")
    print("=" * 55)

    while True:
        question = input("\nYou: ").strip()

        if question.lower() in {"exit", "quit"}:
            print("Dude: Goodbye!")
            break

        if not question:
            print("Dude: Please enter a question.")
            continue

        try:
            answer = answer_question(question, retriever)
            print(f"\nDude: {answer}")
        except Exception as error:
            print(f"\nError while answering: {error}")


if __name__ == "__main__":
    main()

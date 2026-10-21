# AI Technical Mock Interviewer

An intelligent, state-machine driven technical interview simulator designed to deliver rigorous, reproducible mock technical screens for software engineering candidates. Powered by FastAPI, React 19, PostgreSQL, and Google Gemini API structured outputs.

---

## 📌 Overview & Problem Statement

Technical interviews evaluate problem-solving ability, domain architecture, edge-case vigilance, and communication clarity. However, candidates typically encounter two major limitations when preparing:
1. **Human Mock Interviews** are expensive, difficult to schedule, and often subject to subjective bias and inconsistent rubrics.
2. **Generic LLM Chatbots** lack interview state management, produce hallucinated scores, fail to enforce follow-up constraints, and cannot maintain authoritative lifecycle transitions across a multi-turn technical screen.

The **AI Technical Mock Interviewer** addresses this by combining a backend-authoritative finite state machine with structured AI evaluations. The platform persists primary interview questions, validates candidate answers, triggers adaptive follow-ups, and computes deterministic weighted scorecards across four standardized engineering dimensions.

> [!IMPORTANT]
> **Zero Code Execution Security Policy**: Candidate-submitted code and explanations are treated strictly as untrusted text data. The system evaluates submissions through static AI review and never compiles, executes, or runs candidate code in a sandbox or host runtime.

---

## 🌟 Key Features

- **Role & Seniority Customization**: Configure mock interviews tailored to specific roles (e.g., Backend Systems, Full-Stack, Data & Pipeline Engineering), seniority tiers (`Junior`, `Mid`, `Senior`, `Staff`), coding languages (`Python`, `Java`, `SQL`), and question counts (3 to 10 challenges).
- **Backend-Authoritative State Progression**: State transitions (`configured` → `in_progress` → `completed`) are governed by the backend. Advancement requires submitting valid answers and resolving all requested follow-ups.
- **Adaptive Follow-Up System**: Dynamically generates context-aware follow-up challenges (capped strictly at a maximum of 2 per primary question) based on the candidate's answer and identified conceptual gaps.
- **Authoritative 4-Dimensional Scoring Rubric**:
  - **Technical Correctness (40%)**: Algorithmic accuracy, language syntax, and logical soundness.
  - **Architectural Depth (25%)**: Scalability considerations, time/space complexity, and concurrency.
  - **Edge-Case Awareness (20%)**: Null handling, empty bounds, throughput limits, and failure modes.
  - **Communication Clarity (15%)**: Problem framing, concise explanations, and structured rationale.
  *Weighted scores are calculated directly on the backend (0.0 to 10.0 scale) to prevent LLM calculation inaccuracies.*
- **Idempotent Executive Interview Report**:
  - Synthesizes an executive performance assessment upon session completion.
  - Provides categorical performance badges (e.g., *Excellent (Strong Pass)*, *Proficient*, *Needs Improvement*).
  - Categorizes verified strengths, omitted concepts, and actionable study recommendations.
  - Includes an interactive accordion drilldown displaying problem statements, candidate answers, and critique scores per question.
- **Deterministic Offline Mode**: When a Gemini API key is not configured, the backend automatically switches to deterministic offline mock generators, enabling cost-free testing and offline development.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client["Frontend (React 19 + Vite + Tailwind CSS)"]
        UI["Landing & Setup Modal"]
        InterviewView["Active Interview View"]
        ReportView["Executive Performance Report"]
    end

    subgraph Server["Backend (FastAPI + Async Python)"]
        Router["API Gateway (/api/v1/interviews)"]
        FSM["Interview Lifecycle & State Engine"]
        ScoreEngine["Authoritative Score Calculation (40/25/20/15)"]
        GeminiService["Gemini AI Service (gemini-2.5-flash)"]
        OfflineMock["Deterministic Offline Fallback"]
    end

    subgraph Storage["Persistence Layer (PostgreSQL 14+)"]
        SessionsTable[("interview_sessions")]
        QuestionsTable[("primary_questions")]
        AnswersTable[("candidate_answers")]
        EvaluationsTable[("answer_evaluations")]
        FollowUpsTable[("follow_up_questions")]
        ReportsTable[("interview_reports")]
    end

    UI -->|"POST /api/v1/interviews/config"| Router
    InterviewView -->|"POST .../start, answer, next"| Router
    ReportView -->|"GET .../report"| Router

    Router --> FSM
    FSM --> ScoreEngine
    FSM --> GeminiService
    GeminiService -.->|"No API Key / Unset"| OfflineMock

    FSM -->|"Async ORM (SQLAlchemy 2.x + asyncpg)"| Storage
    SessionsTable --- QuestionsTable
    QuestionsTable --- AnswersTable
    AnswersTable --- EvaluationsTable
    QuestionsTable --- FollowUpsTable
    SessionsTable --- ReportsTable
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React | High-performance responsive client with dark theme aesthetic and real-time state feedback |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, Pydantic-Settings, Uvicorn | Asynchronous REST API with strict request/response validation and transactional integrity |
| **Database** | PostgreSQL, SQLAlchemy 2.0 (asyncio), asyncpg, Alembic | Relational database schema with async migrations and cascade isolation |
| **AI Evaluation** | Google Gemini API (`gemini-2.5-flash`), HTTPX | Structured JSON output generation validated through Pydantic schemas |
| **Testing** | Pytest, AnyIO, Starlette TestClient | Comprehensive automated testing covering unit, integration, and transactional rollback paths |

---

## 📁 Project Structure

```
PROJECT/
├── README.md                      # Project documentation and setup guide
├── .gitignore                     # Git ignore rules for Python, Node, and environment files
├── .env.example                   # Root environment template
│
├── backend/                       # FastAPI backend service
│   ├── .env.example               # Backend environment template
│   ├── requirements.txt           # Python dependency specifications
│   ├── alembic.ini                # Alembic database migration configuration
│   ├── alembic/
│   │   ├── env.py                 # Async migration runner
│   │   └── versions/              # Migration revisions (001 through 006)
│   ├── app/
│   │   ├── main.py                # Application entrypoint & CORS middleware
│   │   ├── core/
│   │   │   └── config.py          # Pydantic BaseSettings & env parsing
│   │   ├── db/
│   │   │   ├── base.py            # SQLAlchemy declarative Base
│   │   │   └── session.py         # Async engine & sessionmaker
│   │   ├── models/
│   │   │   ├── __init__.py        # ORM model registry
│   │   │   └── interview.py       # Session, question, answer, evaluation, report models
│   │   ├── schemas/
│   │   │   ├── __init__.py        # Pydantic schema exports
│   │   │   └── interview.py       # Request, response, and structured Gemini output schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── gemini_service.py  # Gemini API integration & deterministic offline generator
│   │   └── api/
│   │       └── v1/
│   │           ├── router.py      # Route aggregator
│   │           └── endpoints/
│   │               ├── health.py  # GET /api/health and /api/health/db
│   │               └── interviews.py # Lifecycle endpoints (config, start, answer, report)
│   └── tests/                     # Pytest suite (94 automated tests)
│       ├── test_health.py         # Health checks & CORS headers
│       ├── test_interviews.py     # Configuration validation bounds
│       ├── test_session_lifecycle.py # State machine transitions & rollback
│       ├── test_answers.py        # Candidate answer submission
│       ├── test_evaluations.py    # Scoring rubric & AI evaluation
│       ├── test_follow_ups.py     # Adaptive follow-up turns & limits
│       ├── test_question_progression.py # Advancement & interview completion
│       ├── test_interview_reports.py # Final report aggregation & idempotency
│       └── test_gemini_service.py # Gemini prompts & offline mocks
│
└── frontend/                      # React client application
    ├── package.json               # Frontend dependencies and npm scripts
    ├── vite.config.ts             # Vite configuration with /api proxy
    ├── index.html                 # HTML template
    └── src/
        ├── main.tsx               # Client entrypoint
        ├── App.tsx                # Main application component & query routing
        ├── index.css              # Tailwind CSS styling
        ├── types/                 # Shared TypeScript interfaces
        │   └── index.ts
        └── components/            # UI components
            ├── Navbar.tsx         # Top bar with backend health indicator
            ├── Hero.tsx           # Product value proposition
            ├── FeatureGrid.tsx    # Rubric breakdown & feature cards
            ├── InterviewSetupModal.tsx # Configuration & session launch modal
            ├── ActiveInterviewView.tsx # Active interview challenge, code editor & final report
            └── Footer.tsx         # Platform footer
```

---

## 📋 Prerequisites

Before setting up locally, ensure you have the following installed:
- **Python**: version `3.10` or higher (`python --version`)
- **Node.js**: version `20.x` or higher (`node --version`)
- **npm**: version `10.x` or higher (`npm --version`)
- **PostgreSQL**: version `14` or higher running locally or accessible via network
- **Git**: version `2.x` or higher

---

## ⚙️ Local Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/sumithmullangi/ai-technical-mock-interviewer.git
cd ai-technical-mock-interviewer
```

---

### 2. Database Preparation

Create a dedicated database in your PostgreSQL instance:

```sql
-- Using psql or your preferred database client:
CREATE DATABASE mock_interviewer;
```

---

### 3. Backend Setup

From the repository root, change directory into `backend`:

#### Windows (PowerShell)
```powershell
# From the project root:
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create environment configuration file from template
Copy-Item .env.example .env
```

#### macOS / Linux (Bash/Zsh)
```bash
# From the project root:
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration file from template
cp .env.example .env
```

#### Environment Variables Configuration
Edit `backend/.env` with your local settings. Use your actual local database credentials:

```dotenv
PROJECT_NAME="AI Technical Mock Interviewer API"
VERSION="0.1.0"
ENVIRONMENT="development"
HOST="127.0.0.1"
PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# PostgreSQL asyncpg connection string
# Format: postgresql+asyncpg://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/mock_interviewer

# Optional: Google Gemini API Key
# If omitted or left empty, the application runs in deterministic offline mock mode.
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
```

> [!NOTE]
> **Gemini API Key & Offline Mock Behavior**:
> - **When `GEMINI_API_KEY` is omitted or left empty (`""`)**: The backend operates in deterministic offline mock mode. Questions and reports are generated locally without external network requests, enabling cost-free testing and continuous development.
> - **When `GEMINI_API_KEY` is set**: The backend makes live calls to Google's Gemini API. If the API key is invalid, network connectivity fails, or the Gemini rate limit/quota is exhausted (`HTTP 429`), the service returns an explicit `HTTP 502 Bad Gateway` error (`GeminiProviderError`). It will never silently fabricate simulated responses when a real API call fails.

#### Run Database Migrations
Make sure you are in the `backend/` directory with the virtual environment activated:

```powershell
# In the backend directory:
alembic upgrade head
```

*Applied migrations create the following tables:*
- `001_interview_sessions`
- `002_candidate_answers`
- `003_answer_evaluations`
- `004_follow_up_questions`
- `005_primary_questions`
- `006_interview_reports`

#### Start the Backend Server
```powershell
# In the backend directory:
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:
- **Interactive OpenAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Service Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Database Connectivity Status**: [http://127.0.0.1:8000/api/health/db](http://127.0.0.1:8000/api/health/db)

---

### 4. Frontend Setup

Open a separate terminal window. From the repository root, change directory into `frontend`:

```powershell
# From the project root:
cd frontend

# Install Node dependencies
npm install
```

#### Environment Variables Configuration (Optional)
By default, Vite's dev server automatically proxies `/api` requests to `http://localhost:8000` (configured in `frontend/vite.config.ts`).

If you are pointing to a custom API host or port, you may optionally create `frontend/.env`:
```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

#### Start Vite Development Server
```powershell
# In the frontend directory:
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing Instructions

### Run Backend Pytest Suite
Run the full test suite (94 automated unit and integration tests covering health checks, session lifecycle, answer submissions, evaluations, follow-ups, and final reports):

```powershell
# In the backend directory with virtual environment activated:
pytest -v
```

### Run Frontend Verification & Production Build
Validate TypeScript typings and generate the production bundle:

```powershell
# In the frontend directory:
npm run build
```

Run frontend linter:
```powershell
# In the frontend directory:
npm run lint
```

---

## 📡 Key API Endpoints

All interview endpoints are prefixed with `/api/v1/interviews` (and aliased under `/api/interviews` for backward compatibility):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Application operational health check |
| `GET` | `/api/health/db` | Database connectivity check (sanitized, no credentials exposed) |
| `POST` | `/api/v1/interviews/config` | Validate and register interview session configuration |
| `GET` | `/api/v1/interviews/{session_id}` | Retrieve session status and configuration |
| `POST` | `/api/v1/interviews/{session_id}/start` | Transition session to `in_progress` and generate Question 1 |
| `GET` | `/api/v1/interviews/{session_id}/questions` | List persisted primary questions for the session |
| `POST` | `/api/v1/interviews/{session_id}/answer` | Submit and persist candidate answer for the current question |
| `POST` | `/api/v1/interviews/{session_id}/evaluate` | Trigger AI evaluation across the 4 scoring dimensions |
| `POST` | `/api/v1/interviews/{session_id}/follow-up` | Generate adaptive follow-up challenge (max 2 per primary question) |
| `POST` | `/api/v1/interviews/{session_id}/questions/{q_num}/follow-up` | Generate adaptive follow-up for specific question (alias) |
| `POST` | `/api/v1/interviews/{session_id}/follow-ups/{id}/answer` | Submit candidate response to a follow-up inquiry |
| `GET` | `/api/v1/interviews/{session_id}/questions/{q_num}/follow-ups` | List follow-up questions for a primary challenge |
| `POST` | `/api/v1/interviews/{session_id}/next` | Advance to next primary question or complete interview if final question |
| `POST` | `/api/v1/interviews/{session_id}/advance` | Advance to next question (alias) |
| `GET` | `/api/v1/interviews/{session_id}/report` | Retrieve or synthesize final executive performance assessment |
| `POST` | `/api/v1/interviews/{session_id}/report` | Explicit final report generation endpoint |

---

## 🗺️ Milestone Roadmap & Status

- [x] **Milestone 1: Scaffold & Baseline**
  - Greenfield project initialization with Git and safety rules
  - FastAPI backend structure with `GET /api/health` and CORS middleware
  - React 19 + TypeScript + Tailwind CSS developer-tool landing page
  - Unit tests for backend health check and CORS headers
- [x] **Milestone 2: Interview Configuration & Validation**
  - Setup preview modal wired to application state
  - Pydantic v2 validation for role, seniority, coding language, and bounded question count (3–10)
  - `POST /api/v1/interviews/config` endpoint with structured ephemeral session generation
  - Automated tests covering valid configurations, boundary counts, and invalid inputs
- [x] **Milestone 3: PostgreSQL Database & Async Migrations**
  - Async SQLAlchemy 2.x setup (`app/db/session.py`, `app/db/base.py`)
  - Initial `interview_sessions` ORM model (`app/models/interview.py`)
  - Alembic asynchronous migration engine (`001_interview_sessions`)
  - Safe connectivity endpoint `GET /api/health/db` without credential exposure
- [x] **Milestone 4: Question Generation & Lifecycle Progression**
  - Structured Question 1 generation via Gemini service with offline fallback
  - Session start endpoint (`POST /api/v1/interviews/{session_id}/start`)
  - State machine transitions (`configured` → `in_progress` → `completed`) with row locking
  - Primary question progression endpoint (`POST /api/v1/interviews/{session_id}/next`)
- [x] **Milestone 5: Candidate Answers, AI Evaluation, Follow-ups & Final Report**
  - **Stage 1**: Candidate answer submission and persistence (`candidate_answers` table)
  - **Stage 2**: 4-dimension AI evaluation rubric with backend score calculation (`answer_evaluations` table)
  - **Stage 3**: Adaptive follow-up generation and answers (max 2 limit, `follow_up_questions` table)
  - **Stage 4**: Primary question progression guardrails and completion logic (`primary_questions` table)
  - **Stage 5**: Final interview performance report (`interview_reports` table, idempotent report generation, frontend scorecard & drilldown)
- [ ] **Roadmap / Not Implemented**
  - **User Authentication & Profiles**: Currently operates in guest session mode only; no user accounts or JWTs.
  - **Voice Mode**: Real-time microphone audio capture and text-to-speech synthesis are not implemented.
  - **Embedded In-Browser IDE**: Currently provides a styled monospace code textarea; full Monaco/CodeMirror editor is not implemented.

---

## 📄 License & Status

This repository is currently private / unreleased. No open-source license has been formally applied. All rights are reserved by the repository owner unless stated otherwise.

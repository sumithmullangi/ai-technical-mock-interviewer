# AI Technical Mock Interviewer

A high-rigor, state-machine driven technical interview simulator powered by the Google Gemini API. Built with FastAPI (Python) and React 19 + TypeScript + Tailwind CSS.

---

## Architecture Overview

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Python 3.10+, FastAPI, WebSockets (Milestone 2)
- **Database**: PostgreSQL, SQLAlchemy 2.x, Alembic (Milestone 4)
- **AI Engine**: Gemini API with structured outputs validated by Pydantic (Milestone 2)
- **State Machine**: Backend-authoritative interview lifecycle (Milestone 2)
- **Safety Policy**: **Candidate code is never executed.** Static AI analysis only.

### Evaluation Model (0–10 Scale)
| Dimension | Weight | Description |
| :--- | :---: | :--- |
| **Technical Correctness** | 40% | Algorithmic accuracy, correct syntax, and sound mathematical reasoning |
| **Architectural Depth** | 25% | Complexity trade-offs, concurrency, and system bottlenecks |
| **Edge-Case Awareness** | 20% | Handling nulls, empty collections, scale boundaries, and failure modes |
| **Communication & Clarity** | 15% | Structured problem solving, concise explanation, and collaborative tone |

---

## Project Structure

```
PROJECT/
├── .gitignore               # Comprehensive ignores for Node, Python, and secrets
├── .env.example             # Root environment template
├── README.md                # Windows PowerShell setup & run guide
├── backend/                 # FastAPI service
│   ├── .env.example         # Backend environment variables template
│   ├── requirements.txt     # Bounded Python dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application & CORS configuration
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py    # Pydantic Settings & environment parsing
│   │   └── api/
│   │       ├── __init__.py
│   │       └── v1/
│   │           ├── __init__.py
│   │           ├── router.py
│   │           └── endpoints/
│   │               ├── __init__.py
│   │               └── health.py # GET /api/health endpoint
│   └── tests/
│       ├── __init__.py
│       └── test_health.py   # Pytest suite for health check & CORS
└── frontend/                # React 19 + Vite + TypeScript + Tailwind CSS
    ├── package.json
    ├── vite.config.ts       # Vite config with Tailwind CSS & /api proxy
    ├── index.html
    └── src/
        ├── App.tsx          # Landing page with health check & architecture roadmap
        ├── index.css        # Tailwind CSS imports & base styles
        ├── main.tsx
        ├── types/           # TypeScript interfaces
        └── components/
            ├── Navbar.tsx   # Header with live API connection indicator
            ├── Hero.tsx     # Landing hero & product value proposition
            ├── FeatureGrid.tsx # Evaluation dimensions & feature highlights
            ├── InterviewSetupModal.tsx # Setup preview modal (Milestone 1)
            └── Footer.tsx   # System specs footer
```

---

## Local Development (Windows PowerShell)

### Prerequisites
- **Python**: 3.10+ (`python --version`)
- **Node.js**: v20+ (`node --version`)
- **npm**: v10+ (`npm --version`)
- **Git**: (`git --version`)
*(Note: Docker is not required for Milestone 1)*

---

### Step 1: Backend Setup

Open a PowerShell terminal in the project root:

```powershell
# 1. Navigate to backend directory
cd c:\Users\sumit\OneDrive\Desktop\PROJECT\backend

# 2. Create virtual environment (if not already created)
python -m venv .venv

# 3. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run tests
pytest

# 6. Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Configuration Endpoint**: `POST /api/v1/interviews/config`
- **Interactive OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)


---

### Step 2: Frontend Setup

Open a second PowerShell terminal in the project root:

```powershell
# 1. Navigate to frontend directory
cd c:\Users\sumit\OneDrive\Desktop\PROJECT\frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Verify TypeScript build
npm run build

# 4. Start Vite development server
npm run dev
```

The application will be available at:
- **Vite Web App**: [http://localhost:5173](http://localhost:5173)

The frontend automatically proxies `/api` requests to `http://127.0.0.1:8000`.

---

## Milestone Roadmap

- [x] **Milestone 1: Scaffold & Baseline**
  - Greenfield project initialization with Git and safety rules
  - FastAPI backend structure with `GET /api/health` and CORS
  - React 19 + TypeScript + Tailwind CSS developer-tool landing page
  - Configurable interview preview modal (3–10 questions, default 5)
  - Unit tests for backend health check and CORS headers
- [x] **Milestone 2: Interview Configuration & Validation (Current)**
  - Fully functional Configuration Modal wired to real application state
  - Pydantic v2 validation for role, seniority, coding language, and bounded question count (3–10)
  - `POST /api/v1/interviews/config` endpoint with structured ephemeral session generation
  - Client-side validation, loading spinner, success confirmation card, and error handling
  - Automated tests covering valid configurations, boundary counts, and invalid inputs
- [ ] **Milestone 3: State Machine & Gemini Integration**
  - Backend-authoritative interview lifecycle (3–10 questions, max 2 follow-ups)
  - Gemini API structured outputs validated by Pydantic
  - Multi-modal answer submission (text, speech transcripts, non-execution code review)
- [ ] **Milestone 4: Persistence, Scoring & Auth**
  - PostgreSQL database with SQLAlchemy 2.x and Alembic
  - Guest mode and optional accounts
  - Detailed 4-dimensional score breakdown (0–10 scale)

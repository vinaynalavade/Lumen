# LUMEN — Unified Software Quality Workspace

> **ILLUMINATE QUALITY.**
> 
> *Testing does not create quality. It reveals it.*

Lumen is a unified software quality workspace designed to bring visibility, clarity, and evidence to software development and testing.

It brings testing activities across Manual Testing, Defect Tracking, API Testing, Database Validation, Automation Testing (Selenium + TestNG), and Unified Quality Analytics into one connected platform.

---

## 🏛️ Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + Custom QA Engineering Design System
- **Backend**: Python 3 + FastAPI + Pydantic v2 + SQLAlchemy 2.0
- **Database**: PostgreSQL with Alembic Migrations
- **Authentication**: JWT-based Auth with Argon2/Bcrypt password hashing & Workspace RBAC

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL 14+ running locally (or uses zero-friction SQLite fallback for local development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m app.initial_data  # Creates database tables and seeds demo data
uvicorn app.main:app --reload --port 8000
```
Backend API will run at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend application will run at `http://localhost:5173`.

### Demo Credentials
- **Email**: `demo@lumen.qa`
- **Password**: `password123`

---

## 🗺️ Roadmap Phases

- [x] **Phase 0 — Foundation**: Auth, Users, Workspaces, Projects, QA Cockpit & Design System
- [ ] **Phase 1 — Manual Testing**: Test Cases, Suites, Plans, Runs, Execution Records
- [ ] **Phase 2 — Bug Tracking**: Defect Lifecycle, Severity/Priority, Failed Test to Bug Linking
- [ ] **Phase 3 — API Testing**: Collections, Endpoints, Assertions, Response Viewer
- [ ] **Phase 4 — Database Testing**: Connection Config, Queries, Data Comparison, API-to-DB
- [ ] **Phase 5 — Selenium + TestNG Integration**: Framework Registry, Execution Runner, Extent Reports
- [ ] **Phase 6 — Cross-Testing**: Multi-layer Business Flow Validations
- [ ] **Phase 7 — Unified Reporting & Analytics**: Executive Quality Cockpit & Traceability

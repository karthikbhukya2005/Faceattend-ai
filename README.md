# FaceAttend AI

> Intelligent facial-recognition attendance management platform with role-based access control, real-time attendance tracking, analytics, and an AI/RAG attendance assistant.

## Overview

**FaceAttend AI** is a full-stack attendance management system that automates attendance using facial recognition while providing separate experiences for administrators and students.

### Core capabilities

- Facial recognition-based attendance
- JWT authentication and role-based access control (RBAC)
- Admin and Student dashboards
- Attendance history and analytics
- User/member management
- Student profile and account security
- AI attendance assistant
- Retrieval-Augmented Generation (RAG) workflow
- Document ingestion and chunking for policy knowledge
- Attendance rules and audit logging
- Responsive web interface

---

## Features

### Authentication & Authorization

- JWT-based authentication
- Protected application routes
- Active-user validation
- Admin-only backend operations
- Student-specific data access
- Password change functionality
- Logout/session handling
- Backend-enforced authorization

### Admin Portal

Administrators can access:

- Institutional Dashboard
- Face Attendance Terminal
- Attendance Records
- Users Directory
- Analytics
- AI Attendance Assistant
- Settings
- RAG document indexing and management

### Student Portal

Students receive a restricted personal portal:

- Student Dashboard
- My Attendance
- My Profile
- Personal AI Attendance Assistant
- Settings

Students are restricted from accessing other users' attendance information and institution-wide administrative analytics.

---

## Facial Recognition Attendance

The biometric workflow is:

```text
Camera Frame
     ↓
Face Detection
     ↓
Face Embedding
     ↓
Compare with Enrolled Templates
     ↓
Identity Match
     ↓
Attendance Rule Processing
     ↓
Check-in / Check-out
     ↓
Database
```

The system supports:

- Face enrollment
- Face recognition
- Recognition confidence
- Bounding-box information
- Check-in/check-out detection
- Duplicate-scan cooldown
- Unknown-face handling
- Attendance status reporting

---

## Attendance Management

Attendance records support:

- Present
- Late
- Absent
- Leave
- Check-in time
- Check-out time
- Recognition method
- Recognition confidence
- Date filtering
- Department filtering
- Status filtering
- Search and pagination
- CSV export for administrative workflows

Students see their own attendance records, while administrators can manage institutional attendance data.

---

## Analytics

The administrator dashboard provides:

- Total active users
- Today's present count
- Today's late count
- Today's absent count
- Overall attendance rate
- Attendance trends
- Department-wise statistics
- High/low attendance indicators
- Recent attendance activity

Charts are used to visualize attendance trends and department statistics.

---

# AI Attendance Assistant

FaceAttend includes a natural-language attendance assistant.

### Example Admin queries

```text
Who was absent today?

Show students with attendance below 75%.

Which department has the best attendance?

How many people were late today?

Give me a summary of this week's attendance.

What is the policy for late arrivals?
```

### Example Student queries

```text
What is my attendance rate?

Show my attendance summary.

What is my attendance status today?

How many times was I late?

What is the policy for late arrivals?

What is the 75% attendance rule?
```

### RAG pipeline

```text
User Query
    ↓
Authentication
    ↓
Role-Based Access Control
    ↓
Query Processing
    ↓
Embedding Generation
    ↓
Semantic Retrieval
    ↓
Relevant Policy / Knowledge Chunks
    ↓
Live Attendance Data (when permitted)
    ↓
Response Generation
    ↓
AI Assistant
```

The AI chat API requires an authenticated user. Administrative indexing and document management are protected by admin authorization.

Student AI access is role-aware and prevents exposure of institution-wide attendance analytics or other students' attendance records.

---

## Document Ingestion & Chunking

Supported document types:

```text
.pdf
.docx
.txt
.md
```

The ingestion pipeline is:

```text
Document
   ↓
File Validation
   ↓
Text Extraction
   ↓
Text Cleaning
   ↓
Chunking
   ↓
Metadata Preservation
   ↓
Embedding Generation
   ↓
Semantic Retrieval
```

Chunk metadata can include:

- Source filename
- File type
- Page number when available
- Chunk index
- Character boundaries
- Document type

The current local retrieval implementation keeps indexed embeddings in application memory. A persistent vector database can be added later for production-scale deployments.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React
- Recharts
- Axios

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT authentication
- Uvicorn

### AI / RAG

- Text embeddings
- Cosine similarity retrieval
- Document ingestion
- Document chunking
- Policy knowledge base
- Role-aware RAG access control

### Computer Vision

- Facial recognition
- Face embeddings
- Real-time camera processing

### Database

- SQLAlchemy-based relational database layer

---

## Project Structure

```text
faceattend-ai/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai.py
│   │   │   ├── attendance.py
│   │   │   ├── analytics.py
│   │   │   ├── face.py
│   │   │   └── ...
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   └── ...
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   │       ├── attendance_service.py
│   │       ├── face_recognition_service.py
│   │       ├── embedding_service.py
│   │       ├── chunking_service.py
│   │       ├── document_ingestion_service.py
│   │       ├── retrieval_service.py
│   │       ├── rag_service.py
│   │       └── llm_service.py
│   ├── data/
│   │   └── documents/
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## Local Setup

### Prerequisites

Install:

- Python 3.10+
- Node.js 18+
- npm
- A webcam for testing facial recognition

### Backend

Open PowerShell:

```powershell
cd C:\Users\bhuky\.gemini\antigravity\scratch\faceattend-ai\backend
```

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Install project dependencies:

```powershell
pip install -r requirements.txt
```

For document ingestion, make sure these packages are installed:

```powershell
pip install pypdf python-docx python-multipart
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger/OpenAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend

Open another terminal:

```powershell
cd C:\Users\bhuky\.gemini\antigravity\scratch\faceattend-ai\frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Demo Login

The login screen includes a **Student Demo** quick-fill option for demonstrations.

The intended demo flow is:

```text
Student Demo
     ↓
Auto-fill demo credentials
     ↓
Normal login request
     ↓
Student Dashboard
```

For a public repository, use test-only demo credentials and never expose production credentials or secrets in source code.

---

## API Overview

### Authentication

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/change-password
```

### Attendance

```text
GET  /api/attendance
GET  /api/attendance/today
POST /api/attendance
PUT  /api/attendance/{id}
```

### Facial Recognition

```text
POST /api/face/enroll
POST /api/face/recognize
GET  /api/face/status/{user_id}
```

### Users

```text
GET    /api/users
GET    /api/users/{id}
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

### Analytics

```text
GET /api/analytics/dashboard
GET /api/analytics/departments
```

### AI / RAG

```text
POST /api/ai/chat
POST /api/ai/index
POST /api/ai/documents/upload
GET  /api/ai/documents
```

> Exact endpoint availability depends on the current backend configuration.

---

## Security Design

Security is implemented at the backend level rather than relying only on frontend navigation.

```text
Login
  ↓
JWT Token
  ↓
Authenticated API Request
  ↓
Current User
  ↓
Role Check
 ┌───────────────┴───────────────┐
 ↓                               ↓
Admin                         Student
 ↓                               ↓
Institutional data             Own data
User management                Own attendance
Analytics                      Own profile
RAG management                 Restricted AI
```

Important security principles:

- Backend authorization is required for protected operations.
- Student attendance queries are scoped to the authenticated student.
- Admin-only operations require an admin role.
- Passwords are stored as hashes rather than returned in normal API responses.
- Production secrets should be stored in environment variables and excluded from Git.

---

## Built-in Attendance Policies

The knowledge base includes policies covering:

- Standard schedule and punctuality
- 75% attendance compliance
- Facial biometric scanner guidelines
- Leave and medical absence protocol

The current built-in policy examples include a 09:30 AM schedule start, late-arrival handling, a 75% minimum attendance threshold, biometric scanner guidance, and leave documentation rules.

---

## Testing Checklist

### Admin

- [ ] Admin login
- [ ] Dashboard loads
- [ ] User management works
- [ ] Face enrollment works
- [ ] Face recognition works
- [ ] Attendance is recorded
- [ ] Attendance filtering works
- [ ] Analytics loads
- [ ] AI assistant answers institutional questions
- [ ] RAG document management is admin-only
- [ ] Password change works

### Student

- [ ] Student Demo login
- [ ] Student dashboard loads
- [ ] Student sees only own attendance
- [ ] Student profile loads
- [ ] Student AI assistant works
- [ ] Student cannot access admin functionality
- [ ] Student cannot retrieve other users' attendance
- [ ] Password change works
- [ ] Logout works

### Security

- [ ] Unauthenticated users are redirected to login
- [ ] Admin-only APIs reject non-admin users
- [ ] Student attendance is scoped to the authenticated student
- [ ] AI responses respect user role
- [ ] Passwords are not returned in normal user responses
- [ ] Production secrets are not committed to Git

---

## Future Improvements

Possible production-oriented enhancements:

1. Persistent vector database such as ChromaDB or PostgreSQL + pgvector
2. Hybrid keyword + semantic retrieval
3. Dedicated reranking stage
4. Production LLM integration
5. Query rewriting
6. Multi-query retrieval
7. Contextual compression
8. Automated RAG evaluation
9. Background document indexing
10. Cloud deployment
11. Automated tests and CI/CD
12. Advanced biometric anti-spoofing/liveness detection

---

## Application Flow

```text
                         FaceAttend AI
                              │
                ┌─────────────┴─────────────┐
                │                           │
             Admin                       Student
                │                           │
        ┌───────┼────────┐          ┌───────┼────────┐
        ↓       ↓        ↓          ↓       ↓        ↓
    Dashboard Users   Analytics  Dashboard Attendance Profile
        │       │        │          │       │        │
        └───────┴────────┘          └───────┴────────┘
                │                           │
                └──────────┬────────────────┘
                           ↓
                    AI Attendance
                       Assistant
                           │
                           ↓
                       RAG Layer
```

---

## Project Status

**Status: Working development project**

The current version includes the core attendance workflow, authentication/RBAC, dashboards, facial-recognition attendance, analytics, document ingestion/chunking, and a role-aware AI/RAG assistant.

---

## License

Add the license you choose before publishing the repository.

For an open-source project, you can add an MIT license if that matches your intended usage.

---

## Author

**FaceAttend AI — Intelligent Facial Recognition Attendance Platform**

A full-stack AI-enabled attendance management project combining computer vision, backend APIs, role-based security, analytics, and RAG-based natural-language assistance.

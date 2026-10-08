import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.services.embedding_service import embedding_service
from app.services.document_ingestion_service import document_ingestion_service

logger = logging.getLogger("faceattend.retrieval_service")

DEFAULT_KNOWLEDGE_DOCS = [
    {
        "id": "policy_work_hours",
        "title": "Organization Schedule & Punctuality Policy",
        "category": "Policy",
        "content": (
            "Standard working and classroom hours are 09:30 AM to 05:00 PM Monday through Saturday. "
            "Any attendee scanning after 09:30 AM is automatically categorized as 'Late'. "
            "A grace period of up to 10 minutes (until 09:40 AM) may be excused upon supervisor review. "
            "Departures recorded before 04:30 PM without prior authorization may require manual correction."
        ),
    },
    {
        "id": "policy_attendance_threshold",
        "title": "Mandatory 75% Attendance Compliance Rule",
        "category": "Policy",
        "content": (
            "All registered students and employees are required to maintain a minimum cumulative attendance of 75%. "
            "Attendees falling below 75% are flagged as high-risk and restricted from final examinations or quarterly appraisals. "
            "Attendees with more than 3 unexcused absences in a month must provide formal justification."
        ),
    },
    {
        "id": "policy_facial_biometrics",
        "title": "Facial Biometric Scanner Guidelines",
        "category": "Policy",
        "content": (
            "The FaceAttend AI biometric station uses multi-scale computer vision facial recognition. "
            "Users must position themselves 0.5 to 1.5 meters from the camera in adequate lighting. "
            "A mandatory 60-second cooldown prevents accidental duplicate attendance logs when passing the camera repeatedly. "
            "The first valid scan logs Check-in; later scans log Check-out."
        ),
    },
    {
        "id": "policy_leave_absence",
        "title": "Leave of Absence and Medical Protocol",
        "category": "Policy",
        "content": (
            "Planned leaves must be submitted at least 24 hours in advance through the administration portal. "
            "Approved leaves are marked as 'Leave' rather than 'Absent' and do not penalize the attendee's compliance percentage. "
            "Medical absences exceeding 2 days require supporting medical documentation."
        ),
    },
]


class RetrievalService:
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self._initialize_knowledge_base()

    def _embed_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        text = f"{doc.get('title', '')}\n{doc.get('content', '')}"
        return {
            **doc,
            "embedding": embedding_service.generate_embedding(text),
        }

    def _initialize_knowledge_base(self):
        """Load built-in policies plus saved uploaded-document chunks."""
        self.documents = [
            self._embed_document(doc)
            for doc in DEFAULT_KNOWLEDGE_DOCS
        ]

        uploaded_chunks = document_ingestion_service.ingest_all()
        self.documents.extend(
            self._embed_document(chunk)
            for chunk in uploaded_chunks
        )

        logger.info(
            "RetrievalService initialized with %s policy/chunk documents.",
            len(self.documents),
        )

    def index_dynamic_database_content(self, db: Session):
        """Re-index policies, uploaded chunks, and live database summaries."""
        from app.models.user import User
        from app.models.department import Department
        from app.models.attendance import Attendance
        from datetime import date
        from sqlalchemy import func

        docs_to_keep = [
            d for d in self.documents
            if d.get("category") in {"Policy", "Uploaded Document"}
        ]

        today = date.today()

        # Department summaries
        departments = db.query(Department).all()
        for d in departments:
            member_count = (
                db.query(func.count(User.id))
                .filter(
                    User.department == d.name,
                    User.is_active == True,
                )
                .scalar() or 0
            )
            content = f"Department '{d.name}' has {member_count} registered active members."
            doc = {
                "id": f"dept_{d.id}",
                "title": f"Department Profile: {d.name}",
                "category": "Department",
                "content": content,
            }
            docs_to_keep.append(self._embed_document(doc))

        # Today's summary
        today_records = (
            db.query(Attendance)
            .filter(Attendance.date == today)
            .all()
        )
        present_cnt = sum(
            1 for r in today_records if r.status in ("Present", "Late")
        )
        late_cnt = sum(
            1 for r in today_records if r.status == "Late"
        )
        total_active = (
            db.query(func.count(User.id))
            .filter(User.is_active == True)
            .scalar() or 0
        )
        absent_cnt = max(0, total_active - present_cnt)

        content = (
            f"Attendance summary for today ({today.isoformat()}): "
            f"{present_cnt} present, {late_cnt} late arrivals, "
            f"and {absent_cnt} absent out of {total_active} total active registered members."
        )
        docs_to_keep.append(
            self._embed_document({
                "id": "today_summary",
                "title": "Today's Attendance Status",
                "category": "Daily Summary",
                "content": content,
            })
        )

        self.documents = docs_to_keep
        logger.info(
            "Re-indexed dynamic content. Total documents in vector index: %s",
            len(self.documents),
        )
        return len(self.documents)

    def index_uploaded_documents(self) -> int:
        """Rebuild the uploaded-document portion of the in-memory index."""
        policies = [
            d for d in self.documents
            if d.get("category") == "Policy"
        ]
        uploaded_chunks = document_ingestion_service.ingest_all()

        self.documents = policies + [
            self._embed_document(chunk)
            for chunk in uploaded_chunks
        ]

        logger.info(
            "Indexed %s uploaded document chunks.",
            len(uploaded_chunks),
        )
        return len(uploaded_chunks)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Semantic similarity search over policies, uploaded chunks and live summaries."""
        if not self.documents:
            return []

        q_emb = embedding_service.generate_embedding(query)
        scored_docs = []

        for doc in self.documents:
            score = embedding_service.cosine_similarity(
                q_emb,
                doc["embedding"],
            )
            scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, doc in scored_docs[:top_k]:
            results.append({
                **doc,
                "score": round(float(score), 4),
            })
        return results


retrieval_service = RetrievalService()

import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.services.retrieval_service import retrieval_service
from app.services.llm_service import llm_service

logger = logging.getLogger("faceattend.rag_service")


class RAGService:
    def __init__(self):
        self.retrieval_service = retrieval_service
        self.llm_service = llm_service

    def index_database(self, db: Session) -> int:
        """Update RAG index with policies, uploaded chunks, and live DB content."""
        return self.retrieval_service.index_dynamic_database_content(db)

    def reindex_uploaded_documents(self) -> int:
        """Refresh only the uploaded-document portion of the vector index."""
        return self.retrieval_service.index_uploaded_documents()

    def answer_query(
        self,
        query: str,
        db: Session,
        current_user=None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Run retrieval and generation with role-aware context filtering."""
        retrieved_docs = self.retrieval_service.retrieve(query, top_k=5)

        # Students/non-admins may retrieve general policy documents and
        # uploaded policy content, but never dynamic organization analytics.
        if current_user is not None and current_user.role != "admin":
            retrieved_docs = [
                doc for doc in retrieved_docs
                if doc.get("category") in {"Policy", "Uploaded Document"}
            ][:3]

        return self.llm_service.generate_response(
            query=query,
            retrieved_docs=retrieved_docs,
            db=db,
            current_user=current_user,
            conversation_history=conversation_history or [],
        )


rag_service = RAGService()

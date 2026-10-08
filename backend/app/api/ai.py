import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user, get_current_admin_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.ai import AIChatRequest, AIChatResponse, AIIndexResponse
from app.services.rag_service import rag_service
from app.services.document_ingestion_service import (
    document_ingestion_service,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
)

router = APIRouter(prefix="/api/ai", tags=["AI Attendance Assistant"])
logger = logging.getLogger("faceattend.api.ai")


@router.post("/chat", response_model=AIChatResponse)
def chat_with_assistant(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Query the AI assistant with role-aware data access."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        result = rag_service.answer_query(
            req.query,
            db,
            current_user=current_user,
            conversation_history=req.conversation_history,
        )
        return AIChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            intent=result.get("intent"),
            query_data=result.get("query_data"),
            success=True,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error executing AI RAG query")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate AI response.",
        )


@router.post("/index", response_model=AIIndexResponse)
def trigger_rag_indexing(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Re-index attendance data, policies, and uploaded documents."""
    try:
        count = rag_service.index_database(db)
        return AIIndexResponse(
            success=True,
            documents_indexed=count,
            message=f"Successfully indexed {count} documents into the RAG vector store.",
        )
    except Exception:
        logger.exception("Error indexing database")
        raise HTTPException(status_code=500, detail="Indexing failed.")


@router.post("/documents/upload")
async def upload_rag_document(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin_user),
):
    """
    Admin-only document ingestion.

    The original file is stored locally, extracted, chunked and embedded.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum allowed size is 10 MB.",
        )

    try:
        saved_path = document_ingestion_service.save_upload(
            file.filename,
            content,
        )
        chunks = document_ingestion_service.ingest_file(saved_path)

        # Update only uploaded-document chunks; dynamic database summaries
        # are refreshed by /api/ai/index.
        chunk_count = rag_service.reindex_uploaded_documents()

        return {
            "success": True,
            "filename": saved_path.name,
            "chunks_created": len(chunks),
            "uploaded_chunks_indexed": chunk_count,
            "message": f"'{saved_path.name}' was ingested and chunked successfully.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        logger.exception("Document ingestion failed")
        raise HTTPException(status_code=500, detail="Document ingestion failed.")


@router.get("/documents")
def list_rag_documents(
    admin: User = Depends(get_current_admin_user),
):
    """Admin-only list of uploaded RAG documents."""
    return {
        "documents": document_ingestion_service.list_documents()
    }

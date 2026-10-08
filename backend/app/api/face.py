import json
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.models.face_embedding import FaceEmbedding
from app.models.audit_log import AuditLog
from app.schemas.face import (
    FaceEnrollRequest,
    FaceEnrollResponse,
    FaceRecognizeRequest,
    FaceRecognizeResponse,
    FaceStatusResponse,
    BoundingBox,
)
from app.services.face_recognition_service import face_recognition_service
from app.services.attendance_service import attendance_service

router = APIRouter(prefix="/api/face", tags=["Face Recognition"])
logger = logging.getLogger("faceattend.api.face")


@router.post("/enroll", response_model=FaceEnrollResponse)
def enroll_face(
    req: FaceEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Enroll a user's face: validate exactly one face exists, generate 128D embedding, and persist."""
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    try:
        embedding_vec, face_box = face_recognition_service.validate_and_enroll(req.image_base64)
    except ValueError as e:
        logger.warning(f"Face enrollment failed for user {req.user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in face enrollment: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error during face enrollment.")

    # Check for existing face embedding for this user
    existing_embedding = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == req.user_id).first()
    embedding_json = json.dumps(embedding_vec)

    if existing_embedding:
        existing_embedding.embedding = embedding_json
        existing_embedding.model_name = face_recognition_service.model_name
    else:
        new_embedding = FaceEmbedding(
            user_id=req.user_id,
            embedding=embedding_json,
            model_name=face_recognition_service.model_name,
        )
        db.add(new_embedding)

    # Audit log entry
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="FACE_ENROLLED",
            metadata_json=f'{{"target_user_id": {req.user_id}, "model": "{face_recognition_service.model_name}"}}',
        )
    )
    db.commit()

    logger.info(f"Face successfully enrolled for user {user.name} ({user.employee_id})")

    x, y, w, h = face_box
    return FaceEnrollResponse(
        success=True,
        message=f"Facial template registered successfully for {user.name}.",
        user_id=user.id,
        model_name=face_recognition_service.model_name,
        bounding_box=BoundingBox(x=x, y=y, width=w, height=h),
    )


@router.post("/recognize", response_model=FaceRecognizeResponse)
def recognize_face(
    req: FaceRecognizeRequest,
    db: Session = Depends(get_db),
):
    """
    Process real-time video frame:
    1. Detect face and generate query embedding.
    2. Match against all enrolled user templates.
    3. If recognized, mark attendance automatically according to cooldown and rules.
    """
    # Fetch all active enrolled users with their embeddings
    enrolled_records = (
        db.query(FaceEmbedding, User)
        .join(User, FaceEmbedding.user_id == User.id)
        .filter(User.is_active == True)
        .all()
    )

    enrolled_candidates = []
    for fe, u in enrolled_records:
        enrolled_candidates.append({
            "user_id": u.id,
            "user_name": u.name,
            "employee_id": u.employee_id,
            "department": u.department,
            "embedding": fe.embedding,
        })

    try:
        recog_result = face_recognition_service.recognize_face(req.image_base64, enrolled_candidates)
    except Exception as e:
        logger.error(f"Error in recognition pipeline: {e}")
        raise HTTPException(status_code=500, detail="Error during facial recognition processing.")

    if not recog_result.get("detected"):
        return FaceRecognizeResponse(
            success=False,
            message="No face detected in camera stream.",
            recognized=False,
            attendance_marked=False,
        )

    b_box = None
    if recog_result.get("bounding_box"):
        b = recog_result["bounding_box"]
        b_box = BoundingBox(x=b["x"], y=b["y"], width=b["width"], height=b["height"])

    if not recog_result.get("recognized") or not recog_result.get("user_id"):
        return FaceRecognizeResponse(
            success=True,
            message=recog_result.get("message", "Face detected but unknown."),
            recognized=False,
            user_name="Unregistered Person",
            confidence=recog_result.get("confidence", 0.0),
            bounding_box=b_box,
            attendance_marked=False,
        )

    # User is recognized! Process attendance
    user_id = recog_result["user_id"]
    confidence = recog_result.get("confidence", 0.9)
    att_res = attendance_service.process_face_recognition(db, user_id=user_id, confidence=confidence)

    return FaceRecognizeResponse(
        success=True,
        message=att_res.get("message", recog_result["message"]),
        recognized=True,
        user_id=user_id,
        user_name=recog_result["user_name"],
        employee_id=recog_result.get("employee_id"),
        department=recog_result.get("department"),
        confidence=confidence,
        bounding_box=b_box,
        attendance_marked=att_res.get("attendance_marked", False),
        attendance_status=att_res.get("attendance_status"),
        check_in_time=att_res.get("check_in_time"),
        check_out_time=att_res.get("check_out_time"),
        cooldown_active=att_res.get("cooldown_active", False),
        cooldown_seconds_remaining=att_res.get("cooldown_seconds_remaining", 0),
    )


@router.get("/status/{user_id}", response_model=FaceStatusResponse)
def get_face_enrollment_status(user_id: int, db: Session = Depends(get_db)):
    """Check if a specific user has enrolled their face."""
    record = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).first()
    if not record:
        return FaceStatusResponse(user_id=user_id, is_enrolled=False)

    return FaceStatusResponse(
        user_id=user_id,
        is_enrolled=True,
        enrolled_at=record.created_at,
        model_name=record.model_name,
    )

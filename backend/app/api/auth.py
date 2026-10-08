import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_active_user
from app.db.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.auth import LoginRequest, TokenResponse, UserTokenProfile, ChangePasswordRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
logger = logging.getLogger("faceattend.api.auth")


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning a signed JWT access token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    # Generate JWT
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=expires_delta,
    )

    # Audit log entry
    log_entry = AuditLog(
        user_id=user.id,
        action="AUTH_LOGIN",
        metadata_json=f'{{"email": "{user.email}", "role": "{user.role}"}}',
    )
    db.add(log_entry)
    db.commit()

    logger.info(f"User {user.email} (role: {user.role}) logged in successfully")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserTokenProfile(
            id=user.id,
            name=user.name,
            email=user.email,
            employee_id=user.employee_id,
            department=user.department,
            role=user.role,
            is_active=user.is_active,
            is_enrolled=user.is_enrolled,
        ),
    )


@router.get("/me", response_model=UserTokenProfile)
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """Retrieve profile and roles for the currently authenticated user."""
    return UserTokenProfile(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        employee_id=current_user.employee_id,
        department=current_user.department,
        role=current_user.role,
        is_active=current_user.is_active,
        is_enrolled=current_user.is_enrolled,
    )


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Change password for authenticated user."""
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    logger.info(f"Password updated for user {current_user.email}")
    return {"success": True, "message": "Password updated successfully"}

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.core.security import get_current_active_user, get_current_admin_user, get_password_hash
from app.db.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserDetailsResponse,
)
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/api/users", tags=["Users"])
logger = logging.getLogger("faceattend.api.users")


@router.get("", response_model=UserListResponse)
def list_users(
    search: Optional[str] = Query(None, description="Search by name, email, or employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter active/inactive"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List users with multi-criteria filtering, search, and pagination."""
    query = db.query(User)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                User.employee_id.ilike(pattern),
            )
        )

    if department:
        query = query.filter(User.department == department)

    if role:
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    users = query.order_by(User.id).offset(offset).limit(limit).all()

    user_responses = [
        UserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            employee_id=u.employee_id,
            department=u.department,
            role=u.role,
            is_active=u.is_active,
            is_enrolled=u.is_enrolled,
            profile_image_url=u.profile_image_url,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in users
    ]

    return UserListResponse(
        users=user_responses,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Create a new user/attendee (Admin only)."""
    # Check for existing email or employee_id
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    if db.query(User).filter(User.employee_id == user_in.employee_id).first():
        raise HTTPException(status_code=400, detail="A user with this Employee/Student ID already exists.")

    password_plain = user_in.password or "Welcome@123"
    hashed_pwd = get_password_hash(password_plain)

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        employee_id=user_in.employee_id,
        department=user_in.department,
        role=user_in.role,
        password_hash=hashed_pwd,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    db.add(AuditLog(user_id=admin.id, action="USER_CREATED", metadata_json=f'{{"created_user_id": {new_user.id}}}'))
    db.commit()

    logger.info(f"User {new_user.email} created by admin {admin.email}")
    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        employee_id=new_user.employee_id,
        department=new_user.department,
        role=new_user.role,
        is_active=new_user.is_active,
        is_enrolled=False,
        profile_image_url=new_user.profile_image_url,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at,
    )


@router.get("/{user_id}", response_model=UserDetailsResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Retrieve full attendee profile along with historical attendance statistics."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    stats = analytics_service.get_user_analytics(db, user_id)

    u_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        employee_id=user.employee_id,
        department=user.department,
        role=user.role,
        is_active=user.is_active,
        is_enrolled=user.is_enrolled,
        profile_image_url=user.profile_image_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )

    return UserDetailsResponse(
        user=u_resp,
        attendance_rate=stats["attendance_rate"],
        total_days=stats["total_days"],
        total_present=stats["total_present"],
        total_late=stats["total_late"],
        total_absent=stats["total_absent"],
        total_leave=stats["total_leave"],
        recent_attendances=stats["recent_attendances"],
        monthly_trend=stats["monthly_trend"],
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Update user information (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user_in.name is not None:
        user.name = user_in.name
    if user_in.email is not None and user_in.email != user.email:
        if db.query(User).filter(User.email == user_in.email, User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email already registered to another user.")
        user.email = user_in.email
    if user_in.employee_id is not None and user_in.employee_id != user.employee_id:
        if db.query(User).filter(User.employee_id == user_in.employee_id, User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Employee ID already taken.")
        user.employee_id = user_in.employee_id
    if user_in.department is not None:
        user.department = user_in.department
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)
    logger.info(f"User {user.id} updated by admin {admin.email}")

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        employee_id=user.employee_id,
        department=user.department,
        role=user.role,
        is_active=user.is_active,
        is_enrolled=user.is_enrolled,
        profile_image_url=user.profile_image_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Deactivate or remove a user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    # Soft deactivate or delete
    user.is_active = False
    db.commit()
    logger.info(f"User {user.id} deactivated by admin {admin.email}")
    return {"success": True, "message": f"User {user.name} has been deactivated."}

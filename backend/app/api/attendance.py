import csv
import io
import logging
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, and_

from app.core.security import get_current_active_user, get_current_admin_user
from app.db.database import get_db
from app.models.user import User
from app.models.attendance import Attendance
from app.models.audit_log import AuditLog
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    AttendanceListResponse,
    TodayAttendanceSummary,
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])
logger = logging.getLogger("faceattend.api.attendance")


def _build_attendance_response(r: Attendance) -> AttendanceResponse:
    user = r.user
    return AttendanceResponse(
        id=r.id,
        user_id=r.user_id,
        user_name=user.name if user else "Unknown User",
        employee_id=user.employee_id if user else "-",
        department=user.department if user else "-",
        date=r.date,
        check_in=r.check_in,
        check_out=r.check_out,
        status=r.status,
        confidence=r.confidence,
        recognition_method=r.recognition_method,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@router.get("", response_model=AttendanceListResponse)
def list_attendance(
    search: Optional[str] = Query(None, description="Search by attendee name or ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (Present, Late, Absent, Leave)"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve filtered, paginated attendance history."""
    query = db.query(Attendance).join(User, Attendance.user_id == User.id)

    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(User.name.ilike(pattern), User.employee_id.ilike(pattern)))

    if department:
        query = query.filter(User.department == department)

    if status:
        query = query.filter(Attendance.status == status)

    if start_date:
        query = query.filter(Attendance.date >= start_date)

    if end_date:
        query = query.filter(Attendance.date <= end_date)

    if current_user.role == "admin":
        if user_id:
            query = query.filter(Attendance.user_id == user_id)
    else:
        query = query.filter(Attendance.user_id == current_user.id)

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    records = query.order_by(desc(Attendance.date), desc(Attendance.check_in)).offset(offset).limit(limit).all()

    record_responses = [_build_attendance_response(r) for r in records]

    return AttendanceListResponse(
        records=record_responses,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/today", response_model=TodayAttendanceSummary)
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch today's attendance.

    Admins receive institution-wide statistics.
    Non-admin users receive only their own attendance.
    """

    today = date.today()

    query = (
        db.query(Attendance)
        .join(User, Attendance.user_id == User.id)
        .filter(Attendance.date == today)
    )

    if current_user.role == "admin":
        records = (
            query
            .order_by(desc(Attendance.check_in))
            .all()
        )

        total_users = (
            db.query(User)
            .filter(User.is_active == True)
            .count()
        )

    else:
        records = (
            query
            .filter(Attendance.user_id == current_user.id)
            .order_by(desc(Attendance.check_in))
            .all()
        )

        total_users = 1

    present_cnt = sum(
        1 for r in records
        if r.status in ("Present", "Late")
    )

    late_cnt = sum(
        1 for r in records
        if r.status == "Late"
    )

    absent_cnt = max(
        0,
        total_users - present_cnt
    )

    rate = (
        round(
            present_cnt / total_users * 100,
            1
        )
        if total_users > 0
        else 0.0
    )

    return TodayAttendanceSummary(
        date=today.isoformat(),
        total_users=total_users,
        present=present_cnt,
        late=late_cnt,
        absent=absent_cnt,
        attendance_rate=rate,
        records=[
            _build_attendance_response(r)
            for r in records
        ],
    )


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance_record(
    att_in: AttendanceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Manually insert an attendance record (Admin only)."""
    # Prevent duplicate on same user and date
    existing = db.query(Attendance).filter(
        Attendance.user_id == att_in.user_id,
        Attendance.date == att_in.date,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance record already exists for user on {att_in.date}. Please update the existing record.",
        )

    user = db.query(User).filter(User.id == att_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    record = Attendance(
        user_id=att_in.user_id,
        date=att_in.date,
        check_in=att_in.check_in,
        check_out=att_in.check_out,
        status=att_in.status,
        confidence=att_in.confidence,
        recognition_method=att_in.recognition_method,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    db.add(
        AuditLog(
            user_id=admin.id,
            action="ATTENDANCE_MANUAL_CREATE",
            metadata_json=f'{{"attendance_id": {record.id}, "user_id": {user.id}, "date": "{att_in.date}"}}',
        )
    )
    db.commit()

    return _build_attendance_response(record)


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance_record(
    attendance_id: int,
    att_in: AttendanceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Correct or update an existing attendance record (Admin only)."""
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    if att_in.check_in is not None:
        record.check_in = att_in.check_in
    if att_in.check_out is not None:
        record.check_out = att_in.check_out
    if att_in.status is not None:
        record.status = att_in.status
    if att_in.recognition_method is not None:
        record.recognition_method = att_in.recognition_method
    else:
        record.recognition_method = "Manual"

    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    db.add(
        AuditLog(
            user_id=admin.id,
            action="ATTENDANCE_MANUAL_UPDATE",
            metadata_json=f'{{"attendance_id": {record.id}, "status": "{record.status}"}}',
        )
    )
    db.commit()

    return _build_attendance_response(record)


@router.get("/export")
def export_attendance_csv(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Export filtered attendance records as a downloadable CSV."""
    query = db.query(Attendance).join(User, Attendance.user_id == User.id)

    if department:
        query = query.filter(User.department == department)
    if status:
        query = query.filter(Attendance.status == status)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
    if current_user.role != "admin":
        query = query.filter(Attendance.user_id == current_user.id)
    records = query.order_by(desc(Attendance.date), desc(Attendance.check_in)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID",
        "Employee/Student ID",
        "Name",
        "Department",
        "Date",
        "Check-In",
        "Check-Out",
        "Status",
        "Confidence",
        "Method",
    ])

    for r in records:
        u = r.user
        writer.writerow([
            r.id,
            u.employee_id if u else "-",
            u.name if u else "-",
            u.department if u else "-",
            r.date.isoformat(),
            r.check_in.strftime("%H:%M:%S") if r.check_in else "-",
            r.check_out.strftime("%H:%M:%S") if r.check_out else "-",
            r.status,
            f"{round(r.confidence * 100, 1)}%" if r.confidence else "-",
            r.recognition_method,
        ])

    output.seek(0)
    filename = f"faceattend_export_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

import logging
from datetime import datetime, date, time, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.models.attendance import Attendance
from app.models.user import User

logger = logging.getLogger("faceattend.attendance_service")

# In-memory cooldown tracking: user_id -> datetime of last recognition
_LAST_SEEN_CACHE: Dict[int, datetime] = {}


class AttendanceService:
    @staticmethod
    def is_cooldown_active(user_id: int) -> Tuple[bool, int]:
        """
        Check if user is currently inside the attendance cooldown window.
        Returns (is_active, seconds_remaining).
        """
        now = datetime.utcnow()
        if user_id in _LAST_SEEN_CACHE:
            elapsed = (now - _LAST_SEEN_CACHE[user_id]).total_seconds()
            cooldown_seconds = settings.ATTENDANCE_COOLDOWN_SECONDS
            if elapsed < cooldown_seconds:
                remaining = int(cooldown_seconds - elapsed)
                return True, remaining
        return False, 0

    @staticmethod
    def record_last_seen(user_id: int):
        """Update last seen timestamp in cooldown cache."""
        _LAST_SEEN_CACHE[user_id] = datetime.utcnow()

    @staticmethod
    def get_attendance_status_for_time(check_in_time: time) -> str:
        """Determine if a check-in time counts as 'Present' or 'Late'."""
        try:
            start_hour, start_min = map(int, settings.WORK_START_TIME.split(":"))
            threshold_time = time(start_hour, start_min)
            return "Late" if check_in_time > threshold_time else "Present"
        except Exception:
            return "Present"

    @classmethod
    def process_face_recognition(
        cls,
        db: Session,
        user_id: int,
        confidence: float,
    ) -> Dict[str, Any]:
        """
        Process a recognized face for attendance marking:
        1. Check cooldown window.
        2. Check today's existing attendance record.
        3. Create initial check-in or update checkout.
        """
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            return {
                "attendance_marked": False,
                "message": "User not found or inactive.",
                "cooldown_active": False,
            }

        is_cooling, remaining = cls.is_cooldown_active(user_id)
        if is_cooling:
            return {
                "attendance_marked": False,
                "cooldown_active": True,
                "cooldown_seconds_remaining": remaining,
                "message": f"Recognition received inside cooldown ({remaining}s remaining).",
            }

        today = date.today()
        now_time = datetime.now().time()
        record = db.query(Attendance).filter(Attendance.user_id == user_id, Attendance.date == today).first()

        if record is None:
            # First recognition of the day -> Check-in
            status = cls.get_attendance_status_for_time(now_time)
            new_record = Attendance(
                user_id=user_id,
                date=today,
                check_in=now_time,
                check_out=None,
                status=status,
                confidence=confidence,
                recognition_method="Face Recognition",
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
            cls.record_last_seen(user_id)

            logger.info(f"Marked Check-in for {user.name} (ID: {user.employee_id}) as {status}")
            return {
                "attendance_marked": True,
                "attendance_status": status,
                "check_in_time": now_time.strftime("%H:%M:%S"),
                "check_out_time": None,
                "cooldown_active": False,
                "message": f"Check-in marked as {status} at {now_time.strftime('%H:%M:%S')}",
            }
        else:
            # Subsequent recognition -> Check-out update
            record.check_out = now_time
            if confidence and (record.confidence is None or confidence > record.confidence):
                record.confidence = confidence
            record.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(record)
            cls.record_last_seen(user_id)

            logger.info(f"Updated Check-out for {user.name} (ID: {user.employee_id}) at {now_time.strftime('%H:%M:%S')}")
            return {
                "attendance_marked": True,
                "attendance_status": record.status,
                "check_in_time": record.check_in.strftime("%H:%M:%S") if record.check_in else None,
                "check_out_time": now_time.strftime("%H:%M:%S"),
                "cooldown_active": False,
                "message": f"Check-out updated at {now_time.strftime('%H:%M:%S')}",
            }


attendance_service = AttendanceService()

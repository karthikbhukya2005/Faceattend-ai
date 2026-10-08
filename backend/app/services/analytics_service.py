import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from app.models.user import User
from app.models.attendance import Attendance
from app.models.department import Department

logger = logging.getLogger("faceattend.analytics_service")


class AnalyticsService:
    @staticmethod
    def get_dashboard_stats(db: Session) -> Dict[str, Any]:
        """Compute live dashboard KPIs, trends, department stats, and top/low attendee lists."""
        today = date.today()

        # 1. Total Active Users
        total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

        # 2. Today's Attendance Counts
        today_records = db.query(Attendance).filter(Attendance.date == today).all()
        present_today = sum(1 for r in today_records if r.status in ("Present", "Late"))
        late_today = sum(1 for r in today_records if r.status == "Late")
        absent_today = max(0, total_users - present_today)
        attendance_rate = round((present_today / total_users * 100), 1) if total_users > 0 else 0.0

        # 3. Daily Attendance Trend (Last 14 days)
        daily_trend: List[Dict[str, Any]] = []
        for i in range(13, -1, -1):
            past_date = today - timedelta(days=i)
            # Exclude Sundays if desired, or include all
            records = db.query(Attendance).filter(Attendance.date == past_date).all()
            p_count = sum(1 for r in records if r.status in ("Present", "Late"))
            l_count = sum(1 for r in records if r.status == "Late")
            a_count = max(0, total_users - p_count)
            rate = round((p_count / total_users * 100), 1) if total_users > 0 else 0.0
            daily_trend.append({
                "date": past_date.strftime("%b %d"),
                "full_date": past_date.isoformat(),
                "present": p_count,
                "late": l_count,
                "absent": a_count,
                "rate": rate,
            })

        # 4. Department-wise Attendance Statistics
        departments = db.query(Department).all()
        dept_names = [d.name for d in departments] if departments else [
            "Computer Science", "Information Technology", "Electronics & Comm", "Mechanical Eng", "HR & Admin", "Business Operations"
        ]

        department_stats: List[Dict[str, Any]] = []
        for dept in dept_names:
            dept_users = db.query(User).filter(User.department == dept, User.is_active == True).all()
            dept_total = len(dept_users)
            dept_user_ids = [u.id for u in dept_users]
            
            if dept_total > 0 and dept_user_ids:
                records = db.query(Attendance).filter(
                    Attendance.date == today,
                    Attendance.user_id.in_(dept_user_ids)
                ).all()
                p_cnt = sum(1 for r in records if r.status in ("Present", "Late"))
                l_cnt = sum(1 for r in records if r.status == "Late")
                a_cnt = max(0, dept_total - p_cnt)
                rate = round((p_cnt / dept_total * 100), 1)
            else:
                p_cnt = 0
                l_cnt = 0
                a_cnt = 0
                rate = 0.0

            department_stats.append({
                "department": dept,
                "total_users": dept_total,
                "present": p_cnt,
                "late": l_cnt,
                "absent": a_cnt,
                "attendance_rate": rate,
            })

        # 5. Status Distribution (Present, Late, Absent, Leave)
        leave_today = sum(1 for r in today_records if r.status == "Leave")
        pure_present = max(0, present_today - late_today)
        total_accounted = pure_present + late_today + absent_today + leave_today
        if total_accounted == 0:
            total_accounted = 1

        status_distribution = [
            {"name": "On Time", "value": pure_present, "percentage": round(pure_present / total_accounted * 100, 1), "color": "#10B981"},
            {"name": "Late", "value": late_today, "percentage": round(late_today / total_accounted * 100, 1), "color": "#F59E0B"},
            {"name": "Absent", "value": absent_today, "percentage": round(absent_today / total_accounted * 100, 1), "color": "#EF4444"},
            {"name": "Leave", "value": leave_today, "percentage": round(leave_today / total_accounted * 100, 1), "color": "#6366F1"},
        ]

        # 6. Top Attendees and Low Attendees (Calculated over all recorded attendance)
        # Total active distinct attendance days in DB
        total_recorded_days = db.query(func.count(func.distinct(Attendance.date))).scalar() or 1

        user_rates = []
        all_active_users = db.query(User).filter(User.is_active == True).all()
        for u in all_active_users:
            p_days = db.query(func.count(Attendance.id)).filter(
                Attendance.user_id == u.id,
                Attendance.status.in_(["Present", "Late"]),
            ).scalar() or 0
            rate = round((p_days / total_recorded_days * 100), 1)
            user_rates.append({
                "id": u.id,
                "name": u.name,
                "employee_id": u.employee_id,
                "department": u.department,
                "present_days": p_days,
                "absent_days": max(0, total_recorded_days - p_days),
                "total_days": total_recorded_days,
                "attendance_rate": rate,
            })

        # Sort users by attendance rate
        sorted_by_rate = sorted(user_rates, key=lambda x: x["attendance_rate"], reverse=True)
        top_attendees = sorted_by_rate[:5]
        low_attendees = sorted(user_rates, key=lambda x: x["attendance_rate"])[:5]

        return {
            "total_users": total_users,
            "present_today": present_today,
            "absent_today": absent_today,
            "late_today": late_today,
            "attendance_rate": attendance_rate,
            "daily_trend": daily_trend,
            "department_stats": department_stats,
            "status_distribution": status_distribution,
            "top_attendees": top_attendees,
            "low_attendees": low_attendees,
        }

    @staticmethod
    def get_user_analytics(db: Session, user_id: int) -> Dict[str, Any]:
        """Fetch individual attendee profile metrics and 30-day timeline."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        total_recorded_days = db.query(func.count(func.distinct(Attendance.date))).scalar() or 1
        user_records = db.query(Attendance).filter(Attendance.user_id == user_id).order_by(desc(Attendance.date)).all()

        total_present = sum(1 for r in user_records if r.status == "Present")
        total_late = sum(1 for r in user_records if r.status == "Late")
        total_leave = sum(1 for r in user_records if r.status == "Leave")
        total_attended = total_present + total_late
        total_absent = max(0, total_recorded_days - total_attended - total_leave)
        attendance_rate = round((total_attended / total_recorded_days * 100), 1) if total_recorded_days > 0 else 0.0

        # Recent 10 attendances
        recent = []
        for r in user_records[:10]:
            recent.append({
                "date": r.date.isoformat(),
                "check_in": r.check_in.strftime("%H:%M:%S") if r.check_in else "-",
                "check_out": r.check_out.strftime("%H:%M:%S") if r.check_out else "-",
                "status": r.status,
                "recognition_method": r.recognition_method,
                "confidence": r.confidence,
            })

        # Monthly summary
        monthly_trend = [
            {"month": "Current Month", "rate": attendance_rate, "present": total_attended, "absent": total_absent, "late": total_late}
        ]

        return {
            "attendance_rate": attendance_rate,
            "total_days": total_recorded_days,
            "total_present": total_present,
            "total_late": total_late,
            "total_absent": total_absent,
            "total_leave": total_leave,
            "recent_attendances": recent,
            "monthly_trend": monthly_trend,
        }


analytics_service = AnalyticsService()

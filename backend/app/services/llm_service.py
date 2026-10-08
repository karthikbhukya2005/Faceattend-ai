import logging
from typing import Dict, Any, List, Optional
from datetime import date, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings

logger = logging.getLogger("faceattend.llm_service")


class LLMService:
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY

    def generate_response(
        self,
        query: str,
        retrieved_docs: List[Dict[str, Any]],
        db: Session,
        current_user=None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generate a response while enforcing the current user's data scope."""
        return self._local_reasoning_engine(
            query=query,
            retrieved_docs=retrieved_docs,
            db=db,
            current_user=current_user,
            conversation_history=conversation_history or [],
        )

    @staticmethod
    def _is_admin(current_user) -> bool:
        return bool(current_user and current_user.role == "admin")

    @staticmethod
    def _is_personal_query(q: str) -> bool:
        terms = (
            "my attendance", "my attendance rate", "my records", "my record",
            "my check", "my check-in", "my check-out", "my absences",
            "my absence", "my status", "my late", "my profile",
            "how am i doing", "how am i", "am i below 75", "am i at risk",
            "what is my", "what's my", "do i have", "have i been",
            "how many times have i",
        )
        return any(term in q for term in terms)

    @staticmethod
    def _is_policy_query(q: str) -> bool:
        terms = (
            "policy", "policies", "rule", "rules", "guideline", "guidelines",
            "working hours", "work hours", "late arrival", "late arrivals",
            "grace period", "attendance threshold", "75%", "leave",
            "medical absence", "biometric", "facial scanner", "face scanner",
            "cooldown",
        )
        return any(term in q for term in terms)

    @staticmethod
    def _is_institutional_query(q: str) -> bool:
        terms = (
            "who was absent", "who is absent", "absent today", "absentees",
            "students below 75", "employees below 75", "people below 75",
            "attendees below 75", "low attendance students", "low attendance",
            "highest attendance", "top attendance", "best attendee",
            "most punctual", "best attendance", "which department",
            "department has", "compare departments", "department comparison",
            "how many people", "how many students", "how many employees",
            "people were late", "students were late", "late today",
            "late yesterday", "institutional", "overall attendance",
            "attendance summary", "weekly attendance", "this week's attendance",
            "this week", "this month",
        )
        return any(term in q for term in terms)

    def _local_reasoning_engine(
        self,
        query: str,
        retrieved_docs: List[Dict[str, Any]],
        db: Session,
        current_user=None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Deterministic attendance engine with Admin/Student isolation."""
        from app.models.user import User
        from app.models.attendance import Attendance
        from app.models.department import Department

        q = query.lower().strip()
        today = date.today()
        sources = [d.get("title", "Database") for d in retrieved_docs]
        is_admin = self._is_admin(current_user)

        # ---------------- NON-ADMIN SECURITY BOUNDARY ----------------
        if not is_admin:
            if self._is_personal_query(q):
                if current_user is None:
                    raise ValueError("Authenticated user context is required.")

                user = (
                    db.query(User)
                    .filter(
                        User.id == current_user.id,
                        User.is_active == True,
                    )
                    .first()
                )

                if not user:
                    return {
                        "answer": "I could not find your active account.",
                        "sources": ["User Directory"],
                        "intent": "PERSONAL_ATTENDANCE",
                    }

                total_days = (
                    db.query(func.count(func.distinct(Attendance.date)))
                    .filter(Attendance.user_id == user.id)
                    .scalar() or 0
                )
                present_cnt = (
                    db.query(func.count(Attendance.id))
                    .filter(
                        Attendance.user_id == user.id,
                        Attendance.status.in_(["Present", "Late"]),
                    )
                    .scalar() or 0
                )
                late_cnt = (
                    db.query(func.count(Attendance.id))
                    .filter(
                        Attendance.user_id == user.id,
                        Attendance.status == "Late",
                    )
                    .scalar() or 0
                )

                absent_cnt = max(0, total_days - present_cnt)
                rate = round((present_cnt / total_days) * 100, 1) if total_days else 0.0

                today_record = (
                    db.query(Attendance)
                    .filter(
                        Attendance.user_id == user.id,
                        Attendance.date == today,
                    )
                    .order_by(Attendance.check_in.desc())
                    .first()
                )
                today_status = today_record.status if today_record else "Not marked"

                return {
                    "answer": (
                        "### 👤 My Attendance Summary\n\n"
                        f"- **Name:** {user.name}\n"
                        f"- **ID:** `{user.employee_id}`\n"
                        f"- **Department:** {user.department or 'Not specified'}\n"
                        f"- **Attendance Rate:** **{rate}%**\n"
                        f"- **Present/Late Days:** {present_cnt}/{total_days}\n"
                        f"- **Late Arrivals:** {late_cnt}\n"
                        f"- **Recorded Absences:** {absent_cnt}\n"
                        f"- **Today's Status:** **{today_status}**\n\n"
                        "Your attendance information is limited to your own account."
                    ),
                    "sources": sources + ["Your Attendance Records"],
                    "intent": "PERSONAL_ATTENDANCE",
                    "query_data": {
                        "user_id": user.id,
                        "attendance_rate": rate,
                        "present": present_cnt,
                        "late": late_cnt,
                        "absent": absent_cnt,
                    },
                }

            if self._is_policy_query(q) and retrieved_docs:
                doc = retrieved_docs[0]
                return {
                    "answer": (
                        f"### 📖 {doc['title']}\n\n"
                        f"{doc['content']}\n\n"
                        "**Additional Details:**\n"
                        f"- Category: {doc.get('category', 'Institutional Guidelines')}\n"
                        "- For exceptions or formal amendments, please contact administration."
                    ),
                    "sources": [doc["title"]],
                    "intent": "POLICY_QUERY",
                }

            return {
                "answer": (
                    "🔒 **Access restricted**\n\n"
                    "As a student/organization member, I can provide **your own "
                    "attendance information** and general attendance policies, but "
                    "I cannot disclose other students' or employees' attendance "
                    "records, rankings, absences, or institution-wide analytics."
                ),
                "sources": ["FaceAttend Access Control"],
                "intent": "ACCESS_RESTRICTED",
            }

        # ---------------- ADMIN INSTITUTION-WIDE ANALYTICS ----------------

        if "absent" in q and "today" in q:
            all_users = db.query(User).filter(User.is_active == True).all()
            today_records = db.query(Attendance).filter(Attendance.date == today).all()
            attended_ids = {
                r.user_id for r in today_records
                if r.status in ("Present", "Late")
            }
            absent_users = [u for u in all_users if u.id not in attended_ids]
            count = len(absent_users)

            if count == 0:
                answer = "🎉 **All registered active attendees are present today!** There are currently 0 recorded absences."
            else:
                rows = "\n".join(
                    f"| {u.name} | `{u.employee_id}` | {u.department} | {u.role.title()} |"
                    for u in absent_users[:15]
                )
                pct = round(count / len(all_users) * 100, 1) if all_users else 0
                answer = (
                    f"### 📋 Absent Attendees Today ({today.strftime('%B %d, %Y')})\n\n"
                    f"A total of **{count} member{'s' if count != 1 else ''}** "
                    f"({pct}%) have not checked in today out of {len(all_users)} total active members.\n\n"
                    "| Name | ID | Department | Role |\n| :--- | :--- | :--- | :--- |\n"
                    f"{rows}\n\n"
                    + (f"*(Showing first 15 of {count} absentees)*\n\n" if count > 15 else "")
                    + "> 💡 **Policy Note**: According to organization policy, attendees missing without prior approval are marked as unexcused."
                )

            return {
                "answer": answer,
                "sources": sources + ["Live Attendance Records", "User Directory"],
                "intent": "ABSENT_TODAY",
            }

        if (
            "below 75" in q or "low attendance" in q or "< 75" in q
            or "under 75" in q or "at risk" in q
        ):
            all_users = db.query(User).filter(User.is_active == True).all()
            total_days = db.query(func.count(func.distinct(Attendance.date))).scalar() or 1
            low = []

            for u in all_users:
                present = (
                    db.query(func.count(Attendance.id))
                    .filter(
                        Attendance.user_id == u.id,
                        Attendance.status.in_(["Present", "Late"]),
                    )
                    .scalar() or 0
                )
                rate = round((present / total_days) * 100, 1)
                if rate < 75:
                    low.append({
                        "name": u.name, "id": u.employee_id,
                        "dept": u.department, "present": present,
                        "total": total_days, "rate": rate,
                    })

            low.sort(key=lambda x: x["rate"])

            if not low:
                answer = "✅ **Excellent News**: Every active attendee currently maintains an attendance rate of **75% or higher**!"
            else:
                rows = "\n".join(
                    f"| {x['name']} | `{x['id']}` | {x['dept']} | "
                    f"{x['present']}/{x['total']} days | **{x['rate']}%** |"
                    for x in low[:15]
                )
                answer = (
                    "### ⚠️ Attendees with Attendance Below 75% Threshold\n\n"
                    f"There are **{len(low)} attendee{'s' if len(low) != 1 else ''}** "
                    "whose cumulative attendance is currently below the mandatory 75% threshold:\n\n"
                    "| Attendee Name | Identifier | Department | Attended | Attendance Rate |\n"
                    "| :--- | :--- | :--- | :--- | :--- |\n"
                    f"{rows}\n\n"
                    + (f"*(Showing 15 of {len(low)} members below threshold)*\n\n" if len(low) > 15 else "")
                    + "> ⚠️ **Compliance Action Required**: Under the Mandatory 75% Attendance Compliance Rule, attendees with <75% attendance are flagged for administrative counseling."
                )

            return {
                "answer": answer,
                "sources": sources + ["Mandatory 75% Attendance Compliance Rule", "Attendance History"],
                "intent": "LOW_ATTENDANCE_COMPLIANCE",
            }

        if (
            "highest attendance" in q or "top attendance" in q
            or "best attendee" in q or "most punctual" in q
        ):
            all_users = db.query(User).filter(User.is_active == True).all()
            total_days = db.query(func.count(func.distinct(Attendance.date))).scalar() or 1
            attendees = []

            for u in all_users:
                present = (
                    db.query(func.count(Attendance.id))
                    .filter(
                        Attendance.user_id == u.id,
                        Attendance.status.in_(["Present", "Late"]),
                    )
                    .scalar() or 0
                )
                attendees.append({
                    "name": u.name, "id": u.employee_id,
                    "dept": u.department, "present": present,
                    "total": total_days,
                    "rate": round((present / total_days) * 100, 1),
                })

            attendees.sort(key=lambda x: (x["rate"], x["present"]), reverse=True)
            top = attendees[:5]

            if not top:
                return {
                    "answer": "No attendance data is available yet.",
                    "sources": sources + ["Attendance History"],
                    "intent": "TOP_ATTENDEES",
                }

            rows = "\n".join(
                f"| 🏆 #{i+1} | {x['name']} | `{x['id']}` | {x['dept']} | "
                f"**{x['rate']}%** ({x['present']}/{x['total']} days) |"
                for i, x in enumerate(top)
            )
            return {
                "answer": (
                    "### 🌟 Top 5 Attendees with Highest Attendance\n\n"
                    f"| Rank | Attendee Name | ID | Department | Attendance Rate |\n"
                    "| :--- | :--- | :--- | :--- | :--- |\n"
                    f"{rows}\n\n"
                    f"Top performer **{top[0]['name']}** ({top[0]['dept']}) "
                    f"leads with **{top[0]['rate']}%** attendance!"
                ),
                "sources": sources + ["Cumulative Attendance Aggregates"],
                "intent": "TOP_ATTENDEES",
            }

        if "department" in q or "compare" in q:
            departments = db.query(Department).all()
            dept_names = [d.name for d in departments] if departments else []

            dept_data = []
            recorded_days = db.query(func.count(func.distinct(Attendance.date))).scalar() or 1

            for dept in dept_names:
                users = db.query(User).filter(
                    User.department == dept,
                    User.is_active == True,
                ).all()
                total = len(users)

                if total:
                    ids = [u.id for u in users]
                    actual = (
                        db.query(func.count(Attendance.id))
                        .filter(
                            Attendance.user_id.in_(ids),
                            Attendance.status.in_(["Present", "Late"]),
                        )
                        .scalar() or 0
                    )
                    possible = total * recorded_days
                    dept_data.append({
                        "dept": dept,
                        "members": total,
                        "rate": round(actual / possible * 100, 1) if possible else 0,
                    })

            dept_data.sort(key=lambda x: x["rate"], reverse=True)
            rows = "\n".join(
                f"| {x['dept']} | {x['members']} members | **{x['rate']}%** |"
                for x in dept_data
            )
            best = dept_data[0] if dept_data else None

            return {
                "answer": (
                    "### 📊 Department-Wise Attendance Comparison\n\n"
                    "| Department | Active Members | Overall Attendance Rate |\n"
                    "| :--- | :--- | :--- |\n"
                    f"{rows}\n\n"
                    + (
                        f"🥇 **{best['dept']}** currently leads with **{best['rate']}%** attendance!"
                        if best else "No department attendance data is available."
                    )
                ),
                "sources": sources + ["Department Profiles", "Department Aggregates"],
                "intent": "DEPARTMENT_COMPARISON",
            }

        if "late" in q:
            target_date = today if "today" in q else today - timedelta(days=1)
            label = "today" if "today" in q else "yesterday"
            late_records = db.query(Attendance).filter(
                Attendance.date == target_date,
                Attendance.status == "Late",
            ).all()

            if not late_records:
                answer = f"⏰ **Zero late arrivals recorded {label}** ({target_date.strftime('%B %d, %Y')})."
            else:
                ids = [r.user_id for r in late_records]
                users = {u.id: u for u in db.query(User).filter(User.id.in_(ids)).all()}
                rows = "\n".join(
                    f"| {users[r.user_id].name} | `{users[r.user_id].employee_id}` | "
                    f"{users[r.user_id].department} | "
                    f"{r.check_in.strftime('%H:%M:%S') if r.check_in else 'Late'} |"
                    for r in late_records[:10] if r.user_id in users
                )
                answer = (
                    f"### ⏰ Late Arrivals {label.title()} ({target_date.strftime('%B %d, %Y')})\n\n"
                    f"A total of **{len(late_records)} person{'s' if len(late_records) != 1 else ''}** were recorded as late.\n\n"
                    "| Name | ID | Department | Check-in Time |\n| :--- | :--- | :--- | :--- |\n"
                    f"{rows}"
                )

            return {
                "answer": answer,
                "sources": sources + ["Attendance Log", "Organization Schedule & Punctuality Policy"],
                "intent": "LATE_ANALYSIS",
            }

        if "summary" in q or "week" in q or "month" in q or "rate" in q:
            total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
            last_7_days = today - timedelta(days=7)
            records = db.query(Attendance).filter(Attendance.date >= last_7_days).all()
            present = sum(1 for r in records if r.status in ("Present", "Late"))
            days = len({r.date for r in records}) or 1
            possible = total_users * days
            rate = round(present / possible * 100, 1) if possible else 0

            return {
                "answer": (
                    "### 📈 Executive Attendance Summary (Recent 7-Day Window)\n\n"
                    f"- **Active Registered Members**: {total_users}\n"
                    f"- **Distinct Recorded Days**: {days}\n"
                    f"- **Total Check-ins Logged**: {present}\n"
                    f"- **Average Weekly Attendance Rate**: **{rate}%**"
                ),
                "sources": sources + ["Weekly Attendance Aggregates"],
                "intent": "EXECUTIVE_SUMMARY",
            }

        if retrieved_docs:
            doc = retrieved_docs[0]
            return {
                "answer": (
                    f"### 📖 {doc['title']}\n\n{doc['content']}\n\n"
                    f"**Category:** {doc.get('category', 'Institutional Guidelines')}\n"
                    "For exceptions or formal amendments, please contact administration."
                ),
                "sources": [doc["title"]],
                "intent": "POLICY_QUERY",
            }

        return {
            "answer": (
                "I have queried the FaceAttend AI attendance records. "
                "You can ask about attendance, policies, late arrivals, "
                "department analytics, or compliance."
            ),
            "sources": ["FaceAttend Knowledge Base"],
            "intent": "GENERAL_HELP",
        }


llm_service = LLMService()

from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MetricCard(BaseModel):
    title: str
    value: str | int | float
    delta: Optional[str] = None
    delta_type: Optional[str] = "positive"  # positive, negative, neutral


class TrendPoint(BaseModel):
    date: str
    present: int
    late: int
    absent: int
    rate: float


class DepartmentStat(BaseModel):
    department: str
    total_users: int
    present: int
    late: int
    absent: int
    attendance_rate: float


class StatusSlice(BaseModel):
    name: str
    value: int
    percentage: float
    color: str


class TopAttendee(BaseModel):
    id: int
    name: str
    employee_id: str
    department: str
    present_days: int
    total_days: int
    attendance_rate: float


class LowAttendee(BaseModel):
    id: int
    name: str
    employee_id: str
    department: str
    absent_days: int
    total_days: int
    attendance_rate: float


class DashboardData(BaseModel):
    total_users: int
    present_today: int
    absent_today: int
    late_today: int
    attendance_rate: float
    daily_trend: List[TrendPoint]
    department_stats: List[DepartmentStat]
    status_distribution: List[StatusSlice]
    top_attendees: List[TopAttendee]
    low_attendees: List[LowAttendee]


class MonthlyAnalytics(BaseModel):
    month: str
    total_days: int
    avg_attendance_rate: float
    total_checkins: int
    late_arrivals: int
    weekly_breakdown: List[Dict[str, Any]]

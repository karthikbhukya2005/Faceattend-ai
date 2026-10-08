from datetime import date, time, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AttendanceBase(BaseModel):
    user_id: int
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str = Field(default="Present", pattern="^(Present|Late|Absent|Leave)$")
    confidence: Optional[float] = None
    recognition_method: str = Field(default="Face Recognition", pattern="^(Face Recognition|Manual)$")


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: Optional[str] = Field(None, pattern="^(Present|Late|Absent|Leave)$")
    recognition_method: Optional[str] = Field(None, pattern="^(Face Recognition|Manual)$")


class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    employee_id: str
    department: str
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str
    confidence: Optional[float] = None
    recognition_method: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttendanceListResponse(BaseModel):
    records: List[AttendanceResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class TodayAttendanceSummary(BaseModel):
    date: str
    total_users: int
    present: int
    late: int
    absent: int
    attendance_rate: float
    records: List[AttendanceResponse]

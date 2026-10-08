from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    employee_id: str = Field(..., min_length=2, max_length=50)
    department: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="student", pattern="^(admin|employee|student)$")


class UserCreate(UserBase):
    password: Optional[str] = Field(default="Welcome@123", min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    employee_id: Optional[str] = Field(None, min_length=2, max_length=50)
    department: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(admin|employee|student)$")
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    employee_id: str
    department: str
    role: str
    is_active: bool
    is_enrolled: bool
    profile_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class AttendanceSummaryItem(BaseModel):
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str
    recognition_method: str
    confidence: Optional[float] = None


class UserDetailsResponse(BaseModel):
    user: UserResponse
    attendance_rate: float
    total_days: int
    total_present: int
    total_late: int
    total_absent: int
    total_leave: int
    recent_attendances: List[AttendanceSummaryItem]
    monthly_trend: List[dict]

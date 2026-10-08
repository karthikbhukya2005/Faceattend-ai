from app.schemas.auth import LoginRequest, TokenResponse, UserTokenProfile, ChangePasswordRequest
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse, UserDetailsResponse
from app.schemas.face import (
    BoundingBox,
    FaceEnrollRequest,
    FaceEnrollResponse,
    FaceRecognizeRequest,
    FaceRecognizeResponse,
    FaceStatusResponse,
)
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    AttendanceListResponse,
    TodayAttendanceSummary,
)
from app.schemas.analytics import DashboardData, DepartmentStat, TrendPoint, TopAttendee, LowAttendee
from app.schemas.ai import AIChatRequest, AIChatResponse, AIIndexResponse

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserTokenProfile",
    "ChangePasswordRequest",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "UserDetailsResponse",
    "BoundingBox",
    "FaceEnrollRequest",
    "FaceEnrollResponse",
    "FaceRecognizeRequest",
    "FaceRecognizeResponse",
    "FaceStatusResponse",
    "AttendanceCreate",
    "AttendanceUpdate",
    "AttendanceResponse",
    "AttendanceListResponse",
    "TodayAttendanceSummary",
    "DashboardData",
    "DepartmentStat",
    "TrendPoint",
    "TopAttendee",
    "LowAttendee",
    "AIChatRequest",
    "AIChatResponse",
    "AIIndexResponse",
]

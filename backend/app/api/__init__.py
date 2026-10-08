from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.face import router as face_router
from app.api.attendance import router as attendance_router
from app.api.analytics import router as analytics_router
from app.api.ai import router as ai_router

__all__ = [
    "auth_router",
    "users_router",
    "face_router",
    "attendance_router",
    "analytics_router",
    "ai_router",
]

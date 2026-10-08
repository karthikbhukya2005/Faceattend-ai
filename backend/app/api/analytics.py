import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_admin_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.analytics import DashboardData
from app.services.analytics_service import analytics_service


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)

logger = logging.getLogger("faceattend.api.analytics")


@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Retrieve full dashboard KPI cards, 14-day trend,
    department stats, and top/low attendees.
    """

    data = analytics_service.get_dashboard_stats(db)

    return DashboardData(**data)


@router.get("/departments")
def get_department_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Retrieve detailed attendance breakdown per department."""

    data = analytics_service.get_dashboard_stats(db)

    return {
        "departments": data["department_stats"]
    }
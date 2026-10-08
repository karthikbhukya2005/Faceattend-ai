from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    status = Column(String(20), default="Present", nullable=False, index=True)  # Present, Late, Absent, Leave
    confidence = Column(Float, nullable=True)  # e.g., 0.94
    recognition_method = Column(String(50), default="Face Recognition", nullable=False)  # Face Recognition, Manual
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_date_attendance"),
    )

    user = relationship("User", back_populates="attendances")

    def __repr__(self):
        return f"<Attendance(id={self.id}, user_id={self.user_id}, date={self.date}, status='{self.status}')>"

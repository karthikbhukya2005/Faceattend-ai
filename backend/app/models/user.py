from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    role = Column(String(50), default="student", nullable=False)  # admin, employee, student
    password_hash = Column(String(255), nullable=False)
    profile_image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    face_embeddings = relationship("FaceEmbedding", back_populates="user", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_enrolled(self) -> bool:
        return len(self.face_embeddings) > 0

    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', role='{self.role}')>"

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.db.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Department(id={self.id}, name='{self.name}')>"

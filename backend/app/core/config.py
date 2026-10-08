import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FaceAttend AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./faceattend.db",
        description="Database connection URL (PostgreSQL or SQLite fallback)",
    )
    POSTGRES_DATABASE_URL: Optional[str] = None

    # JWT Authentication
    JWT_SECRET: str = Field(
        default="faceattend_production_grade_jwt_secret_key_change_in_production_987654321",
        description="Secret key for signing JWT tokens",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Face Recognition Engine
    FACE_MATCH_THRESHOLD: float = 0.65  # Cosine similarity threshold
    ATTENDANCE_COOLDOWN_SECONDS: int = 60  # Cooldown between duplicate scans

    # Organization Schedule (HH:MM format)
    WORK_START_TIME: str = "09:30"
    WORK_END_TIME: str = "17:00"

    # AI & Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    OPENAI_API_KEY: Optional[str] = ""
    GEMINI_API_KEY: Optional[str] = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:80"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

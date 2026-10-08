import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.db.database import init_db, SessionLocal
from app.db.seed import seed_database
from app.services.rag_service import rag_service
from app.models.user import User

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.face import router as face_router
from app.api.attendance import router as attendance_router
from app.api.analytics import router as analytics_router
from app.api.ai import router as ai_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("faceattend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize tables and seed data if empty
    logger.info("Initializing FaceAttend AI backend services...")
    init_db()
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Empty database detected. Running automated initial seed...")
            seed_database(db)
        # Pre-index dynamic database content for RAG
        rag_service.index_database(db)
    except Exception as e:
        logger.error(f"Startup initialization error: {e}")
    finally:
        db.close()

    logger.info(f"FaceAttend AI backend started successfully in {settings.ENVIRONMENT} mode.")
    yield
    logger.info("Shutting down FaceAttend AI backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "FaceAttend AI: Enterprise-grade Facial Recognition Biometric Attendance, "
        "Real-Time Analytics, and LangChain RAG AI Assistant."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global validation exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {"msg": "Validation error"}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": f"{first_error.get('loc', ['field'])[-1]}: {first_error.get('msg', 'Invalid input')}",
            "error_code": "VALIDATION_ERROR",
        },
    )


# Mount API routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(face_router)
app.include_router(attendance_router)
app.include_router(analytics_router)
app.include_router(ai_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

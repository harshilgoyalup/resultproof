from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import institutes, submissions, admin
import app.models  # Ensure all SQLAlchemy models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try to initialize database tables on startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Startup Warning] Could not auto-create database tables on engine ({e}). Migrations can be run via Alembic.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Configuration - strictly allow frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Format validation errors into clear, readable error messages.
    """
    errors = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err.get("loc", [])])
        msg = err.get("msg", "Invalid value")
        errors.append(f"{field}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error: " + "; ".join(errors),
            "errors": exc.errors(),
        },
    )


# Health Check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "service": "ResultProof Protocol API",
        "storage_provider": settings.STORAGE_PROVIDER,
        "docs_url": f"{settings.API_V1_STR}/docs"
    }


# Include API Routers
app.include_router(institutes.router, prefix=settings.API_V1_STR)
app.include_router(submissions.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

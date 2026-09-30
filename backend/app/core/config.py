import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ResultProof Protocol Backend"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/resultproof"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = "default_dev_secret_key_change_in_production_9f8e7d6c5b4a3"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Storage Configuration
    STORAGE_PROVIDER: str = "local"  # "s3", "supabase", or "local"
    STORAGE_BUCKET_NAME: str = "resultproof-private-documents"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_ENDPOINT_URL: str = ""  # For Supabase / MinIO S3-compatible endpoints
    LOCAL_STORAGE_DIR: str = os.path.join(os.getcwd(), "storage_uploads")
    
    # Document Retention
    DOCUMENT_RETENTION_DAYS: int = 30
    
    # Rate Limiting
    RATE_LIMIT_SUBMISSIONS_PER_MINUTE: int = 5
    
    # Privacy & Stats Rules
    MIN_APPROVED_SUBMISSIONS_FOR_STATS: int = 5
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

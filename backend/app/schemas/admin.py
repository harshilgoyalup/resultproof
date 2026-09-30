from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.submission import SubmissionStatus


class AdminLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    admin_id: Optional[str] = None
    email: Optional[str] = None


class RejectSubmissionRequest(BaseModel):
    reject_reason: str = Field(..., min_length=3, max_length=1000, description="Mandatory audit reason for rejecting submission")


class AdminSubmissionResponse(BaseModel):
    id: str
    institute_id: str
    exam: str
    year: int
    course_type: str
    duration_months: int
    is_paid: bool
    fee_paid: float
    result_value: str
    status: SubmissionStatus
    reject_reason: Optional[str] = None
    is_duplicate_flag: bool
    receipt_hash: str
    consent_given_at: datetime
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    documents_purged_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SignedDocumentUrlsResponse(BaseModel):
    submission_id: str
    receipt_url: Optional[str] = None
    scorecard_url: Optional[str] = None
    expires_in_seconds: int
    documents_purged: bool


class AdminLogResponse(BaseModel):
    id: str
    admin_id: str
    action: str
    target_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

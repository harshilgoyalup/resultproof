from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.submission import SubmissionStatus


class SubmissionCreateResponse(BaseModel):
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
    is_duplicate_flag: bool
    created_at: datetime
    message: str

    model_config = ConfigDict(from_attributes=True)


class SubmissionResponse(BaseModel):
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
    is_duplicate_flag: bool
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DeletionRequestResponse(BaseModel):
    success: bool
    message: str
    submission_id: str

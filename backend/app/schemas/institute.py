from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InstituteBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Official institute name")
    city: str = Field(..., min_length=2, max_length=100, description="City / Region")
    exams: List[str] = Field(default_factory=list, description="Target exams taught at this institute")


class InstituteCreate(InstituteBase):
    pass


class InstituteResponse(InstituteBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExamBreakdown(BaseModel):
    exam: str
    sample_size: int = Field(..., description="Number of verified receipts for this exam")
    qualified_count: int
    conversion_rate_percent: float


class YearBreakdown(BaseModel):
    year: int
    sample_size: int = Field(..., description="Number of verified receipts for this year")
    qualified_count: int
    conversion_rate_percent: float


class CourseTypeBreakdown(BaseModel):
    course_type: str
    sample_size: int = Field(..., description="Number of verified receipts for this course type")
    qualified_count: int
    conversion_rate_percent: float


class InstituteStatsResponse(BaseModel):
    institute_id: str
    institute_name: str
    sample_size: int = Field(..., description="Total verified submissions sample size")
    has_sufficient_data: bool = Field(
        ...,
        description="True if total approved submissions >= 5, False if insufficient data (< 5)"
    )
    status: str = Field(
        ...,
        description="'sufficient' or 'insufficient_data'"
    )
    message: Optional[str] = None
    
    # Statistical indicators provided strictly when has_sufficient_data is True
    conversion_rate_percent: Optional[float] = None
    qualified_count: Optional[int] = None
    average_fee_paid: Optional[float] = None
    min_fee_paid: Optional[float] = None
    max_fee_paid: Optional[float] = None
    
    # Granular subgroups (each with its own sample size)
    exam_breakdowns: Optional[List[ExamBreakdown]] = None
    yearly_breakdowns: Optional[List[YearBreakdown]] = None
    course_type_breakdowns: Optional[List[CourseTypeBreakdown]] = None

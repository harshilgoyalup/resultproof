from app.schemas.institute import InstituteBase, InstituteCreate, InstituteResponse, InstituteStatsResponse, ExamBreakdown, YearBreakdown, CourseTypeBreakdown
from app.schemas.submission import SubmissionCreateResponse, SubmissionResponse, DeletionRequestResponse
from app.schemas.admin import AdminLogin, Token, TokenData, RejectSubmissionRequest, AdminSubmissionResponse, SignedDocumentUrlsResponse, AdminLogResponse

__all__ = [
    "InstituteBase", "InstituteCreate", "InstituteResponse", "InstituteStatsResponse", "ExamBreakdown", "YearBreakdown", "CourseTypeBreakdown",
    "SubmissionCreateResponse", "SubmissionResponse", "DeletionRequestResponse",
    "AdminLogin", "Token", "TokenData", "RejectSubmissionRequest", "AdminSubmissionResponse", "SignedDocumentUrlsResponse", "AdminLogResponse"
]

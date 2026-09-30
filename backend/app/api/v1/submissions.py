from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_client_ip
from app.core.limiter import rate_limit_dependency
from app.core.storage import storage_service
from app.models.institute import Institute
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreateResponse, DeletionRequestResponse
from app.services.submission_service import process_and_store_submission

router = APIRouter(prefix="/submissions", tags=["Submissions"])


@router.post(
    "",
    response_model=SubmissionCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_dependency)]
)
async def create_submission(
    institute_id: str = Form(..., description="Target Institute ID"),
    exam: str = Form(..., description="Exam name, e.g. JEE Advanced, NEET, UPSC"),
    year: int = Form(..., ge=2000, le=2030, description="Exam year"),
    course_type: str = Form(..., description="Course type: Classroom, DLP, Online, Crash Course"),
    duration_months: int = Form(12, ge=1, le=60, description="Course duration in months"),
    is_paid: bool = Form(True, description="Whether course fees were paid"),
    fee_paid: float = Form(0.0, ge=0, description="Total fee amount paid in INR"),
    result_value: str = Form(..., description="Official result outcome, rank or percentile"),
    consent_given: bool = Form(..., description="Mandatory student consent for cryptographic audit"),
    receipt_file: UploadFile = File(..., description="Fee receipt document (PDF/JPG/PNG, max 5MB)"),
    scorecard_file: UploadFile = File(..., description="Official board scorecard (PDF/JPG/PNG, max 5MB)"),
    db: Session = Depends(get_db),
    client_ip: str = Depends(get_client_ip)
):
    """
    Submit student proof for zero-bias academic verification.
    
    RULES:
    1. Zero-PII: No student names, emails, or phone numbers stored.
    2. Rate Limited per IP (max 5 submissions / min).
    3. File validation: Only PDF/JPG/PNG, max 5 MB, validated via magic bytes.
    4. Duplicate prevention: Checked against institute + exam + year + result + receipt hash.
    5. Private storage: Uploaded with random UUID keys, never public.
    """
    if not consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student consent is mandatory to process audit submissions."
        )

    # Validate institute existence
    institute = db.query(Institute).filter(Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institute with ID '{institute_id}' does not exist."
        )

    # Read file contents
    try:
        receipt_bytes = await receipt_file.read()
        scorecard_bytes = await scorecard_file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded files: {str(e)}"
        )

    submission = process_and_store_submission(
        db=db,
        institute_id=institute_id,
        exam=exam.strip(),
        year=year,
        course_type=course_type.strip(),
        duration_months=duration_months,
        is_paid=is_paid,
        fee_paid=fee_paid,
        result_value=result_value.strip(),
        receipt_bytes=receipt_bytes,
        receipt_filename=receipt_file.filename or "receipt.pdf",
        scorecard_bytes=scorecard_bytes,
        scorecard_filename=scorecard_file.filename or "scorecard.pdf",
    )

    msg = "Submission received and queued for deterministic audit."
    if submission.is_duplicate_flag:
        msg = "Submission received and flagged for manual audit review (potential duplicate submission detected)."

    return SubmissionCreateResponse(
        id=submission.id,
        institute_id=submission.institute_id,
        exam=submission.exam,
        year=submission.year,
        course_type=submission.course_type,
        duration_months=submission.duration_months,
        is_paid=submission.is_paid,
        fee_paid=submission.fee_paid,
        result_value=submission.result_value,
        status=submission.status,
        is_duplicate_flag=submission.is_duplicate_flag,
        created_at=submission.created_at,
        message=msg
    )


@router.delete("/{id}/request-deletion", response_model=DeletionRequestResponse)
def request_submission_deletion(id: str, db: Session = Depends(get_db)):
    """
    Student Right to Deletion endpoint.
    Allows a student holding the submission ID to request deletion of their submitted record and documents.
    """
    submission = db.query(Submission).filter(Submission.id == id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID '{id}' was not found."
        )

    # Delete storage documents
    if submission.receipt_file_key:
        storage_service.delete_file(submission.receipt_file_key)
    if submission.scorecard_file_key:
        storage_service.delete_file(submission.scorecard_file_key)

    # Delete submission from database
    db.delete(submission)
    db.commit()

    return DeletionRequestResponse(
        success=True,
        message=f"Submission '{id}' and all associated audit files have been permanently deleted.",
        submission_id=id
    )

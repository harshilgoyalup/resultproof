import os
import uuid
import hashlib
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.storage import storage_service
from app.models.submission import Submission, SubmissionStatus


# Allowed MIME and Magic Bytes
ALLOWED_FILE_TYPES = {
    "application/pdf": {
        "ext": ".pdf",
        "magic": [b"%PDF-"]
    },
    "image/jpeg": {
        "ext": ".jpg",
        "magic": [b"\xff\xd8\xff"]
    },
    "image/png": {
        "ext": ".png",
        "magic": [b"\x89PNG\r\n\x1a\n"]
    },
}


def validate_and_inspect_file(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    RULE 3: Validate files
    - Only PDF/JPG/PNG
    - Max 5 MB
    - Check the REAL file type via magic byte inspection (header bytes)
    - Returns (content_type, extension)
    """
    # 1. Check size limit
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{filename}' exceeds maximum allowed size of 5 MB ({len(file_bytes) / (1024*1024):.2f} MB provided)."
        )

    if len(file_bytes) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{filename}' is empty or corrupt."
        )

    # 2. Check Magic Bytes
    detected_mime = None
    detected_ext = None

    if file_bytes.startswith(b"%PDF-"):
        detected_mime = "application/pdf"
        detected_ext = ".pdf"
    elif file_bytes.startswith(b"\xff\xd8\xff"):
        detected_mime = "image/jpeg"
        detected_ext = ".jpg"
    elif file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        detected_mime = "image/png"
        detected_ext = ".png"

    if not detected_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format for '{filename}'. Only genuine PDF, JPG, and PNG documents are accepted."
        )

    return detected_mime, detected_ext


def compute_sha256(file_bytes: bytes) -> str:
    """Computes SHA-256 hash of file bytes for duplicate detection."""
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()


def check_for_duplicates(
    db: Session,
    institute_id: str,
    exam: str,
    year: int,
    result_value: str,
    receipt_hash: str
) -> bool:
    """
    RULE 5: Prevent duplicates
    Flag submissions with identical institute + exam + year + result + receipt hash.
    """
    existing = (
        db.query(Submission)
        .filter(
            Submission.institute_id == institute_id,
            Submission.exam == exam,
            Submission.year == year,
            Submission.result_value == result_value,
            Submission.receipt_hash == receipt_hash,
        )
        .first()
    )
    return existing is not None


def process_and_store_submission(
    db: Session,
    institute_id: str,
    exam: str,
    year: int,
    course_type: str,
    duration_months: int,
    is_paid: bool,
    fee_paid: float,
    result_value: str,
    receipt_bytes: bytes,
    receipt_filename: str,
    scorecard_bytes: bytes,
    scorecard_filename: str,
) -> Submission:
    """
    Validates, hashes, stores files in private storage, checks duplicates, and creates submission record.
    """
    # 1. Validate both files
    receipt_mime, receipt_ext = validate_and_inspect_file(receipt_bytes, receipt_filename)
    scorecard_mime, scorecard_ext = validate_and_inspect_file(scorecard_bytes, scorecard_filename)

    # 2. Compute receipt SHA-256 hash
    receipt_hash = compute_sha256(receipt_bytes)

    # 3. Check duplicate rule
    is_duplicate = check_for_duplicates(
        db=db,
        institute_id=institute_id,
        exam=exam,
        year=year,
        result_value=result_value,
        receipt_hash=receipt_hash
    )

    # 4. Generate random UUID file keys (Private storage)
    receipt_key = f"receipts/{uuid.uuid4().hex}{receipt_ext}"
    scorecard_key = f"scorecards/{uuid.uuid4().hex}{scorecard_ext}"

    # 5. Upload files privately
    storage_service.upload_file(receipt_bytes, receipt_key, content_type=receipt_mime)
    storage_service.upload_file(scorecard_bytes, scorecard_key, content_type=scorecard_mime)

    # 6. Create Submission record (Zero-PII)
    submission = Submission(
        institute_id=institute_id,
        exam=exam,
        year=year,
        course_type=course_type,
        duration_months=duration_months,
        is_paid=is_paid,
        fee_paid=fee_paid,
        result_value=result_value,
        status=SubmissionStatus.PENDING,
        receipt_file_key=receipt_key,
        scorecard_file_key=scorecard_key,
        receipt_hash=receipt_hash,
        is_duplicate_flag=is_duplicate,
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return submission

import os
import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin, get_client_ip
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.core.storage import storage_service
from app.models.admin import Admin
from app.models.submission import Submission, SubmissionStatus
from app.models.audit_log import AdminLog
from app.schemas.admin import (
    AdminLogin,
    Token,
    AdminSubmissionResponse,
    RejectSubmissionRequest,
    SignedDocumentUrlsResponse,
    AdminLogResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


def log_admin_action(
    db: Session,
    admin: Admin,
    action: str,
    target_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    """Utility to record every admin audit event."""
    audit_entry = AdminLog(
        admin_id=admin.id,
        action=action,
        target_id=target_id,
        details=details or {},
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()


@router.post("/login", response_model=Token)
def admin_login(
    payload: AdminLogin,
    db: Session = Depends(get_db),
    client_ip: str = Depends(get_client_ip)
):
    """
    Authenticate admin and return JWT Bearer access token.
    """
    admin = db.query(Admin).filter(Admin.email == payload.email.lower()).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=admin.id)
    log_admin_action(
        db=db,
        admin=admin,
        action="ADMIN_LOGIN",
        details={"email": admin.email},
        ip_address=client_ip
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/submissions", response_model=List[AdminSubmissionResponse])
def get_submissions_queue(
    status_filter: Optional[str] = Query("pending", alias="status", description="Filter by status: pending, approved, rejected, all"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    List submissions for review with audit metadata, duplicate flags, and review status.
    """
    q = db.query(Submission)
    if status_filter and status_filter.lower() != "all":
        q = q.filter(Submission.status == status_filter.lower())

    return q.order_by(Submission.created_at.desc()).all()


@router.get("/submissions/{id}/documents", response_model=SignedDocumentUrlsResponse)
def get_submission_document_urls(
    id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    client_ip: str = Depends(get_client_ip)
):
    """
    Generate short-lived (15 minutes) signed temporary URLs to view private documents.
    Documents are NEVER made public.
    """
    submission = db.query(Submission).filter(Submission.id == id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID '{id}' was not found."
        )

    if submission.documents_purged_at:
        return SignedDocumentUrlsResponse(
            submission_id=submission.id,
            receipt_url=None,
            scorecard_url=None,
            expires_in_seconds=0,
            documents_purged=True,
        )

    receipt_url = storage_service.generate_signed_url(submission.receipt_file_key, expires_in_seconds=900) if submission.receipt_file_key else None
    scorecard_url = storage_service.generate_signed_url(submission.scorecard_file_key, expires_in_seconds=900) if submission.scorecard_file_key else None

    # Log document access
    log_admin_action(
        db=db,
        admin=current_admin,
        action="VIEW_DOCUMENTS",
        target_id=submission.id,
        details={"institute_id": submission.institute_id, "exam": submission.exam},
        ip_address=client_ip
    )

    return SignedDocumentUrlsResponse(
        submission_id=submission.id,
        receipt_url=receipt_url,
        scorecard_url=scorecard_url,
        expires_in_seconds=900,
        documents_purged=False
    )


@router.post("/submissions/{id}/approve", response_model=AdminSubmissionResponse)
def approve_submission(
    id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    client_ip: str = Depends(get_client_ip)
):
    """
    Approve student proof submission after verifying receipt against board scorecard.
    """
    submission = db.query(Submission).filter(Submission.id == id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID '{id}' was not found."
        )

    submission.status = SubmissionStatus.APPROVED
    submission.reject_reason = None
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by = current_admin.id

    db.commit()
    db.refresh(submission)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="APPROVE_SUBMISSION",
        target_id=submission.id,
        details={"result_value": submission.result_value, "exam": submission.exam, "year": submission.year},
        ip_address=client_ip
    )

    return submission


@router.post("/submissions/{id}/reject", response_model=AdminSubmissionResponse)
def reject_submission(
    id: str,
    payload: RejectSubmissionRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    client_ip: str = Depends(get_client_ip)
):
    """
    Reject student proof submission with mandatory audit justification reason.
    """
    submission = db.query(Submission).filter(Submission.id == id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID '{id}' was not found."
        )

    submission.status = SubmissionStatus.REJECTED
    submission.reject_reason = payload.reject_reason.strip()
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by = current_admin.id

    db.commit()
    db.refresh(submission)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="REJECT_SUBMISSION",
        target_id=submission.id,
        details={"reason": payload.reject_reason.strip(), "exam": submission.exam},
        ip_address=client_ip
    )

    return submission


@router.get("/logs", response_model=List[AdminLogResponse])
def get_admin_audit_logs(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    View immutable admin audit trail.
    """
    return db.query(AdminLog).order_by(AdminLog.created_at.desc()).limit(limit).all()


@router.get("/documents/stream", include_in_schema=False)
def stream_local_document(
    file_key: str,
    expires: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Internal streaming helper for local development storage mode.
    Requires active admin JWT authorization and unexpired token timestamp.
    """
    if time.time() > expires:
        raise HTTPException(status_code=403, detail="Signed document link has expired.")

    file_path = storage_service.get_local_file_path(file_key)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested file was not found or has been purged.")

    return FileResponse(file_path)

from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.submission import Submission, SubmissionStatus
from app.core.storage import storage_service
from app.core.config import settings


def purge_expired_documents(db: Session, retention_days: int = None) -> Dict[str, Any]:
    """
    RULE 6: Delete uploaded documents 30 days after approval or rejection,
    keeping only the approved numbers/metadata.
    
    Finds submissions that:
    1. Have status in ('approved', 'rejected')
    2. Have reviewed_at <= (now - retention_days)
    3. Have not already been purged (documents_purged_at is None)
    4. Have receipt_file_key or scorecard_file_key
    """
    if retention_days is None:
        retention_days = settings.DOCUMENT_RETENTION_DAYS

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)

    expired_submissions = (
        db.query(Submission)
        .filter(
            Submission.status.in_([SubmissionStatus.APPROVED, SubmissionStatus.REJECTED]),
            Submission.reviewed_at.isnot(None),
            Submission.reviewed_at <= cutoff_date,
            Submission.documents_purged_at.is_(None),
            or_(
                Submission.receipt_file_key.isnot(None),
                Submission.scorecard_file_key.isnot(None)
            )
        )
        .all()
    )

    purged_count = 0
    errors = []

    for sub in expired_submissions:
        try:
            if sub.receipt_file_key:
                storage_service.delete_file(sub.receipt_file_key)
                sub.receipt_file_key = None
            
            if sub.scorecard_file_key:
                storage_service.delete_file(sub.scorecard_file_key)
                sub.scorecard_file_key = None

            sub.documents_purged_at = datetime.now(timezone.utc)
            purged_count += 1
        except Exception as e:
            errors.append(f"Failed to purge submission {sub.id}: {str(e)}")

    db.commit()

    return {
        "success": True,
        "purged_count": purged_count,
        "cutoff_date": cutoff_date.isoformat(),
        "errors": errors
    }

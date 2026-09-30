import uuid
from datetime import datetime, timezone, timedelta
from app.models.submission import Submission, SubmissionStatus
from app.services.retention_service import purge_expired_documents


def test_30_day_retention_purge(db_session, test_institute, test_admin):
    """
    RULE 6: Delete uploaded documents 30 days after approval or rejection,
    keeping only the approved numbers.
    """
    # 1. Submission reviewed 35 days ago (should be purged)
    sub_old = Submission(
        id=str(uuid.uuid4()),
        institute_id=test_institute.id,
        exam="JEE Advanced",
        year=2024,
        course_type="Classroom",
        duration_months=24,
        is_paid=True,
        fee_paid=150000.0,
        result_value="AIR 500",
        status=SubmissionStatus.APPROVED,
        receipt_file_key="receipts/old_receipt.pdf",
        scorecard_file_key="scorecards/old_scorecard.pdf",
        receipt_hash="hash_old_1",
        is_duplicate_flag=False,
        consent_given_at=datetime.now(timezone.utc) - timedelta(days=40),
        created_at=datetime.now(timezone.utc) - timedelta(days=40),
        reviewed_at=datetime.now(timezone.utc) - timedelta(days=35),
        reviewed_by=test_admin.id,
        documents_purged_at=None,
    )
    db_session.add(sub_old)

    # 2. Submission reviewed 10 days ago (should NOT be purged yet)
    sub_recent = Submission(
        id=str(uuid.uuid4()),
        institute_id=test_institute.id,
        exam="JEE Advanced",
        year=2024,
        course_type="Classroom",
        duration_months=24,
        is_paid=True,
        fee_paid=150000.0,
        result_value="AIR 800",
        status=SubmissionStatus.APPROVED,
        receipt_file_key="receipts/recent_receipt.pdf",
        scorecard_file_key="scorecards/recent_scorecard.pdf",
        receipt_hash="hash_recent_1",
        is_duplicate_flag=False,
        consent_given_at=datetime.now(timezone.utc) - timedelta(days=15),
        created_at=datetime.now(timezone.utc) - timedelta(days=15),
        reviewed_at=datetime.now(timezone.utc) - timedelta(days=10),
        reviewed_by=test_admin.id,
        documents_purged_at=None,
    )
    db_session.add(sub_recent)
    db_session.commit()

    # Run purge with 30 days retention
    result = purge_expired_documents(db_session, retention_days=30)
    assert result["success"] is True
    assert result["purged_count"] == 1

    # Verify old submission had documents purged, but numeric data preserved
    db_session.refresh(sub_old)
    assert sub_old.receipt_file_key is None
    assert sub_old.scorecard_file_key is None
    assert sub_old.documents_purged_at is not None
    assert sub_old.result_value == "AIR 500"  # Numerical record intact
    assert sub_old.status == SubmissionStatus.APPROVED

    # Verify recent submission documents are untouched
    db_session.refresh(sub_recent)
    assert sub_recent.receipt_file_key == "receipts/recent_receipt.pdf"
    assert sub_recent.scorecard_file_key == "scorecards/recent_scorecard.pdf"
    assert sub_recent.documents_purged_at is None

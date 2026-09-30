import uuid
import hashlib
from datetime import datetime, timezone
from app.models.submission import Submission, SubmissionStatus


def create_submission_helper(
    db_session,
    institute_id: str,
    status: SubmissionStatus,
    exam: str = "JEE Advanced",
    year: int = 2024,
    result_value: str = "AIR 350",
    course_type: str = "Classroom",
    fee_paid: float = 150000.0,
):
    sub = Submission(
        id=str(uuid.uuid4()),
        institute_id=institute_id,
        exam=exam,
        year=year,
        course_type=course_type,
        duration_months=24,
        is_paid=True,
        fee_paid=fee_paid,
        result_value=result_value,
        status=status,
        receipt_file_key=f"receipts/{uuid.uuid4().hex}.pdf",
        scorecard_file_key=f"scorecards/{uuid.uuid4().hex}.pdf",
        receipt_hash=hashlib.sha256(uuid.uuid4().bytes).hexdigest(),
        is_duplicate_flag=False,
        consent_given_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        reviewed_at=datetime.now(timezone.utc) if status != SubmissionStatus.PENDING else None,
    )
    db_session.add(sub)
    db_session.commit()
    return sub


def test_stats_zero_submissions(client, test_institute):
    """
    Test 0 approved submissions:
    Must return insufficient data and null percentage metrics.
    """
    response = client.get(f"/api/v1/institutes/{test_institute.id}/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["institute_id"] == test_institute.id
    assert data["sample_size"] == 0
    assert data["has_sufficient_data"] is False
    assert data["status"] == "insufficient_data"
    assert data["conversion_rate_percent"] is None
    assert data["qualified_count"] is None
    assert "Insufficient data" in data["message"]


def test_stats_fewer_than_five_approved_submissions(client, db_session, test_institute):
    """
    RULE 1: When approved submissions < 5 (e.g. 4 approved),
    backend must return 'insufficient_data' and hide conversion percentages.
    """
    # Create 4 approved submissions
    for i in range(4):
        create_submission_helper(
            db_session=db_session,
            institute_id=test_institute.id,
            status=SubmissionStatus.APPROVED,
            result_value=f"AIR {100 + i}"
        )

    response = client.get(f"/api/v1/institutes/{test_institute.id}/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["sample_size"] == 4
    assert data["has_sufficient_data"] is False
    assert data["status"] == "insufficient_data"
    assert data["conversion_rate_percent"] is None
    assert data["qualified_count"] is None
    assert data["exam_breakdowns"] is None
    assert "at least 5" in data["message"].lower()


def test_pending_and_rejected_not_counted_in_stats(client, db_session, test_institute):
    """
    Submissions that are pending or rejected must NOT count towards the stats threshold.
    """
    # 3 approved, 5 pending, 2 rejected -> total approved is only 3
    for _ in range(3):
        create_submission_helper(db_session, test_institute.id, SubmissionStatus.APPROVED)
    for _ in range(5):
        create_submission_helper(db_session, test_institute.id, SubmissionStatus.PENDING)
    for _ in range(2):
        create_submission_helper(db_session, test_institute.id, SubmissionStatus.REJECTED)

    response = client.get(f"/api/v1/institutes/{test_institute.id}/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["sample_size"] == 3  # Only approved
    assert data["has_sufficient_data"] is False
    assert data["status"] == "insufficient_data"


def test_stats_five_or_more_approved_submissions(client, db_session, test_institute):
    """
    RULE 1 & 2: When approved submissions >= 5,
    backend returns full statistics, accurate conversion rate,
    and includes sample size (n) with every breakdown.
    """
    # Create 5 approved submissions (3 qualified: AIR 10, AIR 20, 99.5 %ile; 2 not qualified)
    create_submission_helper(db_session, test_institute.id, SubmissionStatus.APPROVED, exam="JEE Advanced", year=2024, result_value="AIR 10", course_type="Classroom", fee_paid=150000.0)
    create_submission_helper(db_session, test_institute.id, SubmissionStatus.APPROVED, exam="JEE Advanced", year=2024, result_value="AIR 20", course_type="Classroom", fee_paid=150000.0)
    create_submission_helper(db_session, test_institute.id, SubmissionStatus.APPROVED, exam="JEE Main", year=2023, result_value="99.5 Percentile", course_type="Online", fee_paid=50000.0)
    create_submission_helper(db_session, test_institute.id, SubmissionStatus.APPROVED, exam="JEE Advanced", year=2024, result_value="Not Qualified", course_type="Classroom", fee_paid=150000.0)
    create_submission_helper(db_session, test_institute.id, SubmissionStatus.APPROVED, exam="JEE Main", year=2023, result_value="Failed", course_type="Online", fee_paid=50000.0)

    response = client.get(f"/api/v1/institutes/{test_institute.id}/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["has_sufficient_data"] is True
    assert data["status"] == "sufficient"
    assert data["sample_size"] == 5
    assert data["qualified_count"] == 3
    # 3 out of 5 = 60.0%
    assert data["conversion_rate_percent"] == 60.0
    assert data["average_fee_paid"] == 110000.0  # (150k*3 + 50k*2) / 5 = 550k / 5 = 110k

    # Check that sample sizes are present in all breakdowns (RULE 2)
    assert len(data["exam_breakdowns"]) == 2
    jee_adv = next(e for e in data["exam_breakdowns"] if e["exam"] == "JEE Advanced")
    assert jee_adv["sample_size"] == 3
    assert jee_adv["qualified_count"] == 2
    assert jee_adv["conversion_rate_percent"] == 66.67

    jee_main = next(e for e in data["exam_breakdowns"] if e["exam"] == "JEE Main")
    assert jee_main["sample_size"] == 2
    assert jee_main["qualified_count"] == 1
    assert jee_main["conversion_rate_percent"] == 50.0

    # Year breakdowns
    assert len(data["yearly_breakdowns"]) == 2
    y2024 = next(y for y in data["yearly_breakdowns"] if y["year"] == 2024)
    assert y2024["sample_size"] == 3
    assert y2024["qualified_count"] == 2

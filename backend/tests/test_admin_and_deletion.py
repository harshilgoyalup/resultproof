import io
import uuid
from datetime import datetime, timezone
from app.models.submission import Submission, SubmissionStatus
from app.models.audit_log import AdminLog


def create_submission_for_admin(db_session, institute_id):
    sub = Submission(
        id=str(uuid.uuid4()),
        institute_id=institute_id,
        exam="JEE Advanced",
        year=2024,
        course_type="Classroom",
        duration_months=24,
        is_paid=True,
        fee_paid=160000.0,
        result_value="AIR 420",
        status=SubmissionStatus.PENDING,
        receipt_file_key="receipts/sample_receipt.pdf",
        scorecard_file_key="scorecards/sample_scorecard.pdf",
        receipt_hash="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        is_duplicate_flag=False,
        consent_given_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)
    return sub


def test_admin_login_success(client, test_admin):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": test_admin.email, "password": "ValidAdminPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_admin_login_failure(client, test_admin):
    response = client.post(
        "/api/v1/admin/login",
        json={"email": test_admin.email, "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_admin_protected_endpoint_without_token(client):
    response = client.get("/api/v1/admin/submissions")
    assert response.status_code == 401


def test_admin_get_pending_queue(client, db_session, test_institute, admin_token):
    sub = create_submission_for_admin(db_session, test_institute.id)
    response = client.get(
        "/api/v1/admin/submissions?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(s["id"] == sub.id for s in data)


def test_admin_get_signed_document_urls(client, db_session, test_institute, admin_token):
    """
    Test generating short-lived signed URLs for receipt and scorecard.
    """
    sub = create_submission_for_admin(db_session, test_institute.id)
    response = client.get(
        f"/api/v1/admin/submissions/{sub.id}/documents",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["submission_id"] == sub.id
    assert data["receipt_url"] is not None
    assert data["scorecard_url"] is not None
    assert data["expires_in_seconds"] == 900
    assert data["documents_purged"] is False


def test_admin_approve_submission(client, db_session, test_institute, admin_token):
    sub = create_submission_for_admin(db_session, test_institute.id)
    response = client.post(
        f"/api/v1/admin/submissions/{sub.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    assert data["reviewed_at"] is not None

    # Check audit log was created
    log = db_session.query(AdminLog).filter(AdminLog.target_id == sub.id, AdminLog.action == "APPROVE_SUBMISSION").first()
    assert log is not None


def test_admin_reject_submission(client, db_session, test_institute, admin_token):
    sub = create_submission_for_admin(db_session, test_institute.id)
    reason = "Scorecard does not match roll number on admit card."
    response = client.post(
        f"/api/v1/admin/submissions/{sub.id}/reject",
        json={"reject_reason": reason},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"
    assert data["reject_reason"] == reason

    # Check audit log was created
    log = db_session.query(AdminLog).filter(AdminLog.target_id == sub.id, AdminLog.action == "REJECT_SUBMISSION").first()
    assert log is not None


def test_student_deletion_request(client, db_session, test_institute):
    """
    Student Right to Deletion: Student can request deletion using their submission ID.
    """
    sub = create_submission_for_admin(db_session, test_institute.id)
    sub_id = sub.id

    response = client.delete(f"/api/v1/submissions/{sub_id}/request-deletion")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["submission_id"] == sub_id

    # Verify deleted from DB
    deleted = db_session.query(Submission).filter(Submission.id == sub_id).first()
    assert deleted is None

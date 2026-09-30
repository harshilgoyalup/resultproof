import io
from app.models.submission import Submission


def test_duplicate_submission_detection(client, db_session, test_institute):
    """
    RULE 5: Prevent duplicates
    Flag submissions with identical institute + exam + year + result + receipt hash.
    """
    receipt_content = b"%PDF-1.4 Unique receipt file contents for student #12345"
    scorecard_content = b"%PDF-1.4 Unique scorecard contents for student #12345"

    form_data = {
        "institute_id": test_institute.id,
        "exam": "JEE Advanced",
        "year": "2024",
        "course_type": "Classroom",
        "duration_months": "24",
        "is_paid": "true",
        "fee_paid": "180000",
        "result_value": "AIR 350",
        "consent_given": "true",
    }

    # 1. First submission
    files1 = {
        "receipt_file": ("receipt.pdf", io.BytesIO(receipt_content), "application/pdf"),
        "scorecard_file": ("scorecard.pdf", io.BytesIO(scorecard_content), "application/pdf"),
    }
    response1 = client.post("/api/v1/submissions", data=form_data, files=files1)
    assert response1.status_code == 201
    data1 = response1.json()
    assert data1["is_duplicate_flag"] is False

    # 2. Second submission with EXACT same institute + exam + year + result + receipt bytes
    files2 = {
        "receipt_file": ("receipt.pdf", io.BytesIO(receipt_content), "application/pdf"),
        "scorecard_file": ("scorecard2.pdf", io.BytesIO(scorecard_content), "application/pdf"),
    }
    response2 = client.post("/api/v1/submissions", data=form_data, files=files2)
    assert response2.status_code == 201
    data2 = response2.json()
    assert data2["is_duplicate_flag"] is True
    assert "flagged for manual audit review" in data2["message"]

    # 3. Third submission with DIFFERENT receipt bytes
    different_receipt = b"%PDF-1.4 Another different student receipt"
    files3 = {
        "receipt_file": ("diff_receipt.pdf", io.BytesIO(different_receipt), "application/pdf"),
        "scorecard_file": ("scorecard3.pdf", io.BytesIO(scorecard_content), "application/pdf"),
    }
    response3 = client.post("/api/v1/submissions", data=form_data, files=files3)
    assert response3.status_code == 201
    data3 = response3.json()
    assert data3["is_duplicate_flag"] is False

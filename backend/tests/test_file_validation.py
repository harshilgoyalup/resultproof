import io
import pytest
from app.services.submission_service import validate_and_inspect_file
from fastapi import HTTPException


def test_valid_pdf_file_inspection():
    pdf_bytes = b"%PDF-1.4 sample content for receipt document"
    mime, ext = validate_and_inspect_file(pdf_bytes, "my_receipt.pdf")
    assert mime == "application/pdf"
    assert ext == ".pdf"


def test_valid_png_file_inspection():
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    mime, ext = validate_and_inspect_file(png_bytes, "scorecard.png")
    assert mime == "image/png"
    assert ext == ".png"


def test_valid_jpg_file_inspection():
    jpg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    mime, ext = validate_and_inspect_file(jpg_bytes, "receipt.jpg")
    assert mime == "image/jpeg"
    assert ext == ".jpg"


def test_file_exceeding_5mb_rejected():
    oversized_bytes = b"%PDF-1.4" + (b"0" * (5 * 1024 * 1024 + 100))
    with pytest.raises(HTTPException) as exc_info:
        validate_and_inspect_file(oversized_bytes, "huge_document.pdf")
    assert exc_info.value.status_code == 400
    assert "exceeds maximum allowed size of 5 MB" in exc_info.value.detail


def test_spoofed_file_extension_rejected():
    """
    A text script or binary named with .pdf extension must be rejected by magic bytes verification.
    """
    fake_pdf = b"This is not a real PDF file, just plain ASCII text."
    with pytest.raises(HTTPException) as exc_info:
        validate_and_inspect_file(fake_pdf, "fake_document.pdf")
    assert exc_info.value.status_code == 400
    assert "Invalid file format" in exc_info.value.detail


def test_upload_endpoint_file_validation(client, test_institute):
    """
    Test the multipart POST /api/v1/submissions endpoint with invalid file.
    """
    form_data = {
        "institute_id": test_institute.id,
        "exam": "JEE Advanced",
        "year": "2024",
        "course_type": "Classroom",
        "duration_months": "24",
        "is_paid": "true",
        "fee_paid": "150000",
        "result_value": "AIR 350",
        "consent_given": "true",
    }

    # Spoofed receipt file
    files = {
        "receipt_file": ("receipt.pdf", io.BytesIO(b"fake plain text content"), "application/pdf"),
        "scorecard_file": ("scorecard.pdf", io.BytesIO(b"%PDF-1.4 valid scorecard"), "application/pdf"),
    }

    response = client.post("/api/v1/submissions", data=form_data, files=files)
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]

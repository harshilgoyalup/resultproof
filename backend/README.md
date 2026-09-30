# ResultProof Protocol — Backend Service

Zero-bias academic audit and verification backend built with **Python 3.11+**, **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Alembic**, and **Pydantic v2**.

---

## Key Features & Rules Implemented

1. **Zero Student PII**: No student names, emails, or phone numbers are ever stored in the database.
2. **Stats Threshold Rule (< 5 Approved Submissions)**:
   - If an institute has `< 5` approved submissions, `/institutes/{id}/stats` returns `has_sufficient_data: false`, `status: "insufficient_data"`, and suppresses all percentages and conversion metrics on the backend.
   - When `>= 5` approved submissions exist, audited conversion metrics and subgroup distributions are provided.
3. **Mandatory Sample Sizes**: Every calculated number and breakdown strictly includes its sample size \(n\).
4. **File Security & Validation**:
   - Accepts strictly PDF, JPG, and PNG documents.
   - Max 5 MB per file.
   - Verified via **magic byte headers**, rejecting spoofed file extensions.
   - Files are stored with cryptographically random UUID names in private object storage (S3 / Supabase Storage). Documents are never public.
5. **Duplicate Prevention**:
   - Calculates the SHA-256 hash of every uploaded fee receipt.
   - Flags duplicate submissions matching the same `institute_id` + `exam` + `year` + `result_value` + `receipt_hash`.
6. **30-Day Document Retention Policy**:
   - Uploaded receipt and scorecard documents are automatically purged 30 days after approval or rejection, retaining only the audited numbers.
7. **Rate Limiting**:
   - Sliding-window rate limiting per client IP (default: 5 submissions/min).
8. **Admin Audit Trail**:
   - Every administrative action (login, document viewing, approval, rejection with reason) is logged to the `admin_logs` table.
9. **Student Right to Deletion**:
   - Students holding their submission ID can request immediate deletion via `DELETE /api/v1/submissions/{id}/request-deletion`.

---

## Quick Start with Docker

```bash
cd backend
docker-compose up --build
```

The API will be available at `http://localhost:8000`.
Interactive Swagger UI: `http://localhost:8000/api/v1/docs`.

---

## Local Development Setup

### 1. Create Virtual Environment & Install Dependencies

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Database Migrations & Seed Data

```bash
# Run Alembic migrations
alembic upgrade head

# Seed sample institutes, admin, and test submissions
python scripts/seed.py
```

Default Admin Credentials:
- **Email**: `admin@resultproof.org`
- **Password**: `AdminSecretPass123!`

### 4. Run the FastAPI Server

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Running Automated Tests

Run the full pytest test suite (includes tests for the <5 insufficient data rule, file validation, rate limiting, duplicate detection, and retention purge):

```bash
pytest tests/ -v
```

---

## API Endpoints Summary

### Public Endpoints
- `GET /api/v1/institutes?query=&exam=&city=` — Search & filter institutes
- `GET /api/v1/institutes/{id}` — Get single institute details
- `GET /api/v1/institutes/{id}/stats` — Get verified statistics (Approved submissions only)
- `POST /api/v1/submissions` — Submit student proof (Multipart with 2 files)
- `DELETE /api/v1/submissions/{id}/request-deletion` — Student privacy deletion request

### Admin Endpoints (Protected by JWT)
- `POST /api/v1/admin/login` — Authenticate admin and receive JWT token
- `GET /api/v1/admin/submissions?status=pending` — Submissions queue
- `GET /api/v1/admin/submissions/{id}/documents` — Generate 15-minute temporary signed URLs for documents
- `POST /api/v1/admin/submissions/{id}/approve` — Approve submission
- `POST /api/v1/admin/submissions/{id}/reject` — Reject submission with mandatory audit reason
- `GET /api/v1/admin/logs` — View immutable audit trail

### Maintenance CLI
- `python scripts/purge_old_documents.py` — Purge documents older than 30 days after review.

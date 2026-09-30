# ResultProof Protocol ✦ Zero-Bias Academic Verification

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com/new)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=flat&logo=nextdotjs)](https://nextjs.org)

Replacing coaching institute marketing hype with zero-trust cryptographic verification. Real student fee receipts matched to official board scorecards.

---

## ⚡ Key Highlights & Architecture

1. **Zero Student PII Collection**: No student names, emails, or phone numbers are ever requested or stored in the ledger.
2. **Strict Stats Threshold Rule (< 5 Rule)**: Any institute with fewer than 5 approved submissions hides conversion percentages to prevent marketing distortion and sample bias.
3. **Mandatory Sample Sizes**: Every metric and breakdown strictly includes its sample size \(n\).
4. **Instant Serverless Deployment (Vercel)**: Built-in Next.js 14 Serverless Route Handlers in `app/api/` — 0 external servers required to run!
5. **Dedicated FastAPI Microservice**: Full Python + PostgreSQL backend with SQLAlchemy 2.0, Alembic, and S3-compatible private object storage available in `backend/`.
6. **30-Day Retention Policy**: Receipt and scorecard documents are automatically purged 30 days after audit review.
7. **Student Right to Deletion**: Immediate removal tool via unique submission tracking ID.

---

## 🚀 Instant Deployment on Vercel

```bash
# Clone the repository
git clone https://github.com/harshilgoyalup/resultproof.git
cd resultproof

# Deploy directly via Vercel CLI:
npx vercel
```

---

## 💻 Local Development

### 1. Frontend (Next.js Single-Page App)
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`.

### 2. Optional Backend (FastAPI + PostgreSQL)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger docs: `http://localhost:8000/api/v1/docs`

---

## 🧪 Automated Testing

```bash
# Run backend pytest suite (22 unit & integration tests)
python -m pytest backend/tests/ -v
```

---

## 📜 License
MIT License. ResultProof Protocol.

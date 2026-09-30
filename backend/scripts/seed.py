import os
import sys
import uuid
import hashlib
from datetime import datetime, timezone, timedelta

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.institute import Institute
from app.models.submission import Submission, SubmissionStatus
from app.models.admin import Admin
from app.models.audit_log import AdminLog


def seed_database():
    print("[Seed] Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Admin
        admin_email = "admin@resultproof.org"
        admin = db.query(Admin).filter(Admin.email == admin_email).first()
        if not admin:
            admin = Admin(
                id=str(uuid.uuid4()),
                email=admin_email,
                password_hash=get_password_hash("AdminSecretPass123!"),
                created_at=datetime.now(timezone.utc)
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[Seed] Created admin: {admin.email} (Password: AdminSecretPass123!)")
        else:
            print(f"[Seed] Admin {admin.email} already exists.")

        # 2. Seed Sample Institutes
        institutes_data = [
            {
                "id": "apex-science-academy-kota",
                "name": "Apex Science Academy",
                "city": "Kota, Rajasthan",
                "exams": ["JEE", "NEET"],
            },
            {
                "id": "pioneer-medical-delhi",
                "name": "Pioneer Medical Institute",
                "city": "New Delhi, DL",
                "exams": ["NEET"],
            },
            {
                "id": "chronicle-ias-hub-delhi",
                "name": "Chronicle IAS Hub",
                "city": "Old Rajinder Nagar, DL",
                "exams": ["UPSC"],
            },
            {
                "id": "resonance-tech-hyderabad",
                "name": "Resonance Tech Forum",
                "city": "Hyderabad, Telangana",
                "exams": ["JEE", "GATE"],
            },
            {
                "id": "zenith-academy-pune",
                "name": "Zenith Academy for Competitive Exams",
                "city": "Pune, Maharashtra",
                "exams": ["JEE", "NEET", "GATE"],
            },
        ]

        institute_map = {}
        for inst_info in institutes_data:
            inst = db.query(Institute).filter(Institute.id == inst_info["id"]).first()
            if not inst:
                inst = Institute(
                    id=inst_info["id"],
                    name=inst_info["name"],
                    city=inst_info["city"],
                    exams=inst_info["exams"],
                    created_at=datetime.now(timezone.utc)
                )
                db.add(inst)
                db.commit()
                db.refresh(inst)
                print(f"[Seed] Created institute: {inst.name}")
            institute_map[inst.id] = inst

        # 3. Seed Sample Submissions (Zero PII - no names or phone numbers)
        # Apex Science Academy: 6 Approved submissions (>= 5 threshold -> sufficient data)
        apex_id = "apex-science-academy-kota"
        existing_apex_subs = db.query(Submission).filter(Submission.institute_id == apex_id).count()
        if existing_apex_subs == 0:
            apex_sample_submissions = [
                ("JEE Advanced", 2024, "Classroom", 24, True, 185000.0, "AIR 352", SubmissionStatus.APPROVED),
                ("JEE Advanced", 2024, "Classroom", 24, True, 185000.0, "AIR 890", SubmissionStatus.APPROVED),
                ("JEE Advanced", 2023, "Classroom", 24, True, 175000.0, "AIR 1420", SubmissionStatus.APPROVED),
                ("JEE Advanced", 2023, "Online", 12, True, 65000.0, "Qualified", SubmissionStatus.APPROVED),
                ("JEE Main", 2024, "Classroom", 12, True, 120000.0, "99.4 Percentile", SubmissionStatus.APPROVED),
                ("JEE Main", 2024, "DLP", 12, True, 35000.0, "Not Qualified", SubmissionStatus.APPROVED),
                ("NEET", 2024, "Classroom", 24, True, 190000.0, "AIR 2100", SubmissionStatus.PENDING),
            ]
            for idx, (exam, year, course_type, dur, is_paid, fee, res_val, status_val) in enumerate(apex_sample_submissions):
                fake_hash = hashlib.sha256(f"seed_receipt_apex_{idx}".encode()).hexdigest()
                sub = Submission(
                    id=str(uuid.uuid4()),
                    institute_id=apex_id,
                    exam=exam,
                    year=year,
                    course_type=course_type,
                    duration_months=dur,
                    is_paid=is_paid,
                    fee_paid=fee,
                    result_value=res_val,
                    status=status_val,
                    reject_reason=None,
                    receipt_file_key=f"receipts/seed_apex_{idx}.pdf",
                    scorecard_file_key=f"scorecards/seed_apex_{idx}.pdf",
                    receipt_hash=fake_hash,
                    is_duplicate_flag=False,
                    consent_given_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc) - timedelta(days=idx * 5),
                    reviewed_at=datetime.now(timezone.utc) if status_val == SubmissionStatus.APPROVED else None,
                    reviewed_by=admin.id if status_val == SubmissionStatus.APPROVED else None
                )
                db.add(sub)
            db.commit()
            print("[Seed] Seeded 6 approved + 1 pending submissions for Apex Science Academy.")

        # Zenith Academy: 2 Approved submissions (< 5 threshold -> Insufficient Data status)
        zenith_id = "zenith-academy-pune"
        existing_zenith_subs = db.query(Submission).filter(Submission.institute_id == zenith_id).count()
        if existing_zenith_subs == 0:
            zenith_sample_submissions = [
                ("JEE Advanced", 2024, "Classroom", 24, True, 150000.0, "AIR 4500", SubmissionStatus.APPROVED),
                ("NEET", 2024, "Classroom", 12, True, 130000.0, "Qualified", SubmissionStatus.APPROVED),
            ]
            for idx, (exam, year, course_type, dur, is_paid, fee, res_val, status_val) in enumerate(zenith_sample_submissions):
                fake_hash = hashlib.sha256(f"seed_receipt_zenith_{idx}".encode()).hexdigest()
                sub = Submission(
                    id=str(uuid.uuid4()),
                    institute_id=zenith_id,
                    exam=exam,
                    year=year,
                    course_type=course_type,
                    duration_months=dur,
                    is_paid=is_paid,
                    fee_paid=fee,
                    result_value=res_val,
                    status=status_val,
                    receipt_file_key=f"receipts/seed_zenith_{idx}.pdf",
                    scorecard_file_key=f"scorecards/seed_zenith_{idx}.pdf",
                    receipt_hash=fake_hash,
                    is_duplicate_flag=False,
                    consent_given_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc) - timedelta(days=idx * 2),
                    reviewed_at=datetime.now(timezone.utc),
                    reviewed_by=admin.id
                )
                db.add(sub)
            db.commit()
            print("[Seed] Seeded 2 approved submissions for Zenith Academy (under 5 threshold).")

        print("[Seed] Seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institute_id = Column(String(36), ForeignKey("institutes.id", ondelete="CASCADE"), nullable=False, index=True)
    exam = Column(String(50), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    course_type = Column(String(50), nullable=False)
    duration_months = Column(Integer, nullable=False, default=12)
    is_paid = Column(Boolean, nullable=False, default=True)
    fee_paid = Column(Float, nullable=False, default=0.0)
    result_value = Column(String(100), nullable=False)  # "AIR 450", "Qualified", "99.4 Percentile", "Not Qualified"
    
    # Audit & Status
    status = Column(Enum(SubmissionStatus, name="submission_status_enum", native_enum=False), default=SubmissionStatus.PENDING, nullable=False, index=True)
    reject_reason = Column(Text, nullable=True)
    
    # Storage Keys (Private Documents)
    receipt_file_key = Column(String(255), nullable=True)
    scorecard_file_key = Column(String(255), nullable=True)
    
    # Duplicate Prevention & Privacy Hashes
    receipt_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hash of receipt bytes
    is_duplicate_flag = Column(Boolean, nullable=False, default=False)
    
    # Timestamps & Reviewer
    consent_given_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    
    # Retention Cleanup (documents deleted after 30 days of review)
    documents_purged_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    institute = relationship("Institute", back_populates="submissions")
    reviewer = relationship("Admin", back_populates="reviewed_submissions")

    # Composite Index for duplicate detection queries
    __table_args__ = (
        Index("idx_duplicate_check", "institute_id", "exam", "year", "result_value", "receipt_hash"),
    )

    def __repr__(self):
        return f"<Submission(id='{self.id}', institute_id='{self.institute_id}', exam='{self.exam}', status='{self.status}')>"

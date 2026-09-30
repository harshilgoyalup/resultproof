import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = Column(String(36), ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # "LOGIN", "APPROVE_SUBMISSION", "REJECT_SUBMISSION", "VIEW_DOCUMENTS"
    target_id = Column(String(100), nullable=True, index=True)  # e.g., submission_id
    details = Column(JSON, nullable=True)  # Extra context, reasons, previous states
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    admin = relationship("Admin", back_populates="logs")

    def __repr__(self):
        return f"<AdminLog(id='{self.id}', admin_id='{self.admin_id}', action='{self.action}')>"

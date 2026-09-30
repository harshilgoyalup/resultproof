import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    reviewed_submissions = relationship("Submission", back_populates="reviewer")
    logs = relationship("AdminLog", back_populates="admin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Admin(id='{self.id}', email='{self.email}')>"

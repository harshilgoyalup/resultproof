import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Institute(Base):
    __tablename__ = "institutes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    exams = Column(JSON, nullable=False, default=list)  # Stored as JSON array: ["JEE", "NEET"]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    submissions = relationship("Submission", back_populates="institute", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Institute(id='{self.id}', name='{self.name}', city='{self.city}')>"

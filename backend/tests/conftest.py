import os
import sys

# Set test environment variables before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["STORAGE_PROVIDER"] = "local"
os.environ["LOCAL_STORAGE_DIR"] = os.path.join(os.path.dirname(__file__), "test_storage")

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.api.deps import get_db
from app.core.security import get_password_hash, create_access_token
from app.models.institute import Institute
from app.models.admin import Admin
from app.main import app

# In-memory SQLite for high-speed isolated unit/integration tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Creates a fresh database schema for each test."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_institute(db_session):
    """Creates a sample test institute."""
    inst = Institute(
        id="test-institute-kota",
        name="Apex Test Academy",
        city="Kota, Rajasthan",
        exams=["JEE", "NEET"],
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(inst)
    db_session.commit()
    db_session.refresh(inst)
    return inst


@pytest.fixture(scope="function")
def test_admin(db_session):
    """Creates a test admin account."""
    admin = Admin(
        id="test-admin-uuid",
        email="testadmin@resultproof.org",
        password_hash=get_password_hash("ValidAdminPass123!"),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def admin_token(test_admin):
    """Generates a valid JWT bearer token for the test admin."""
    return create_access_token(subject=test_admin.id)

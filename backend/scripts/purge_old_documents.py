import os
import sys

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.services.retention_service import purge_expired_documents
from app.core.config import settings


def main():
    print(f"[Retention Worker] Starting document purge job (Retention Period: {settings.DOCUMENT_RETENTION_DAYS} days)...")
    db = SessionLocal()
    try:
        result = purge_expired_documents(db, retention_days=settings.DOCUMENT_RETENTION_DAYS)
        print(f"[Retention Worker] Purged {result['purged_count']} expired document files. Cutoff: {result['cutoff_date']}")
        if result['errors']:
            print(f"[Retention Worker] Errors encountered: {result['errors']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

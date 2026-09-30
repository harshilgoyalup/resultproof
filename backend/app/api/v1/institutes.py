from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, cast, String
from app.api.deps import get_db
from app.models.institute import Institute
from app.schemas.institute import InstituteResponse, InstituteStatsResponse
from app.services.stats_service import calculate_institute_stats

router = APIRouter(prefix="/institutes", tags=["Institutes"])


@router.get("", response_model=List[InstituteResponse])
def get_institutes(
    query: Optional[str] = Query(None, description="Search term for institute name or city"),
    exam: Optional[str] = Query(None, description="Filter by exam type (e.g., JEE, NEET, UPSC)"),
    city: Optional[str] = Query(None, description="Filter by city name"),
    db: Session = Depends(get_db)
):
    """
    Search and filter verified academic institutes.
    """
    q = db.query(Institute)

    if query:
        search_pattern = f"%{query.strip()}%"
        q = q.filter(
            or_(
                Institute.name.ilike(search_pattern),
                Institute.city.ilike(search_pattern)
            )
        )

    if city:
        q = q.filter(Institute.city.ilike(f"%{city.strip()}%"))

    institutes = q.order_by(Institute.name.asc()).all()

    # If exam filter is specified, filter in memory or via json contains
    if exam:
        exam_lower = exam.strip().lower()
        institutes = [
            inst for inst in institutes
            if any(exam_lower in str(e).lower() for e in (inst.exams or []))
        ]

    return institutes


@router.get("/{id}", response_model=InstituteResponse)
def get_institute_by_id(id: str, db: Session = Depends(get_db)):
    """
    Get institute details by unique ID.
    """
    institute = db.query(Institute).filter(Institute.id == id).first()
    if not institute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institute with ID '{id}' was not found."
        )
    return institute


@router.get("/{id}/stats", response_model=InstituteStatsResponse)
def get_institute_stats(id: str, db: Session = Depends(get_db)):
    """
    Retrieve audited verification statistics for an institute.
    
    RULES:
    1. Returns stats based on APPROVED submissions only.
    2. If fewer than 5 approved submissions exist, returns 'insufficient_data'
       and omits conversion percentages to prevent sample bias.
    3. Every calculated metric includes its exact sample size (n).
    """
    institute = db.query(Institute).filter(Institute.id == id).first()
    if not institute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institute with ID '{id}' was not found."
        )

    return calculate_institute_stats(db=db, institute=institute)

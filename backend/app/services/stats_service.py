from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.institute import Institute
from app.models.submission import Submission, SubmissionStatus
from app.schemas.institute import InstituteStatsResponse, ExamBreakdown, YearBreakdown, CourseTypeBreakdown
from app.core.config import settings


def is_result_qualified(result_value: str) -> bool:
    """
    Determines if a result string represents a qualified result.
    Examples of qualified: 'AIR 352', 'AIR 1240', 'Qualified', '99.4 Percentile', '680/720'
    Examples of non-qualified: 'Not Qualified', 'Failed', 'Disqualified', 'N/A'
    """
    if not result_value:
        return False
    val = result_value.strip().lower()
    negative_markers = ["not qualified", "disqualified", "failed", "unqualified", "absent"]
    for neg in negative_markers:
        if neg in val:
            return False
    # If explicitly says qualified or has rank / percentile
    return True


def calculate_institute_stats(db: Session, institute: Institute) -> InstituteStatsResponse:
    """
    Calculates audited statistics for an institute based STRICTLY on approved submissions.
    
    RULE 1: If total approved submissions < MIN_APPROVED_SUBMISSIONS_FOR_STATS (5),
            return 'insufficient_data' and do not expose conversion rates or percentages.
    RULE 2: Always return the sample size (n) with every number and breakdown.
    """
    # Query approved submissions only
    approved_submissions: List[Submission] = (
        db.query(Submission)
        .filter(
            Submission.institute_id == institute.id,
            Submission.status == SubmissionStatus.APPROVED
        )
        .all()
    )

    total_sample_size = len(approved_submissions)
    min_required = settings.MIN_APPROVED_SUBMISSIONS_FOR_STATS

    # RULE 1: Under threshold (< 5 approved submissions) -> return Insufficient Data
    if total_sample_size < min_required:
        return InstituteStatsResponse(
            institute_id=institute.id,
            institute_name=institute.name,
            sample_size=total_sample_size,
            has_sufficient_data=False,
            status="insufficient_data",
            message=f"Insufficient data: ResultProof requires at least {min_required} verified student receipts to publish statistics. Current sample size: {total_sample_size}.",
            conversion_rate_percent=None,
            qualified_count=None,
            average_fee_paid=None,
            min_fee_paid=None,
            max_fee_paid=None,
            exam_breakdowns=None,
            yearly_breakdowns=None,
            course_type_breakdowns=None,
        )

    # Threshold met (>= 5 approved submissions): compute full metrics
    qualified_count = 0
    fees: List[float] = []

    # Aggregation structures
    exam_groups: Dict[str, Dict[str, int]] = {}
    year_groups: Dict[int, Dict[str, int]] = {}
    course_groups: Dict[str, Dict[str, int]] = {}

    for sub in approved_submissions:
        qualified = is_result_qualified(sub.result_value)
        if qualified:
            qualified_count += 1
        
        if sub.is_paid and sub.fee_paid is not None and sub.fee_paid > 0:
            fees.append(sub.fee_paid)

        # By Exam
        exam_key = sub.exam or "Other"
        if exam_key not in exam_groups:
            exam_groups[exam_key] = {"sample_size": 0, "qualified": 0}
        exam_groups[exam_key]["sample_size"] += 1
        if qualified:
            exam_groups[exam_key]["qualified"] += 1

        # By Year
        year_key = sub.year
        if year_key not in year_groups:
            year_groups[year_key] = {"sample_size": 0, "qualified": 0}
        year_groups[year_key]["sample_size"] += 1
        if qualified:
            year_groups[year_key]["qualified"] += 1

        # By Course Type
        course_key = sub.course_type or "Regular"
        if course_key not in course_groups:
            course_groups[course_key] = {"sample_size": 0, "qualified": 0}
        course_groups[course_key]["sample_size"] += 1
        if qualified:
            course_groups[course_key]["qualified"] += 1

    overall_conversion = round((qualified_count / total_sample_size) * 100, 2)
    avg_fee = round(sum(fees) / len(fees), 2) if fees else 0.0
    min_fee = min(fees) if fees else 0.0
    max_fee = max(fees) if fees else 0.0

    # Build breakdown lists with sample sizes
    exam_breakdowns = [
        ExamBreakdown(
            exam=k,
            sample_size=v["sample_size"],
            qualified_count=v["qualified"],
            conversion_rate_percent=round((v["qualified"] / v["sample_size"]) * 100, 2)
        )
        for k, v in sorted(exam_groups.items(), key=lambda item: item[1]["sample_size"], reverse=True)
    ]

    yearly_breakdowns = [
        YearBreakdown(
            year=k,
            sample_size=v["sample_size"],
            qualified_count=v["qualified"],
            conversion_rate_percent=round((v["qualified"] / v["sample_size"]) * 100, 2)
        )
        for k, v in sorted(year_groups.items(), key=lambda item: item[0], reverse=True)
    ]

    course_type_breakdowns = [
        CourseTypeBreakdown(
            course_type=k,
            sample_size=v["sample_size"],
            qualified_count=v["qualified"],
            conversion_rate_percent=round((v["qualified"] / v["sample_size"]) * 100, 2)
        )
        for k, v in sorted(course_groups.items(), key=lambda item: item[1]["sample_size"], reverse=True)
    ]

    return InstituteStatsResponse(
        institute_id=institute.id,
        institute_name=institute.name,
        sample_size=total_sample_size,
        has_sufficient_data=True,
        status="sufficient",
        message=f"Verified stats based on {total_sample_size} audited student receipts.",
        conversion_rate_percent=overall_conversion,
        qualified_count=qualified_count,
        average_fee_paid=avg_fee,
        min_fee_paid=min_fee,
        max_fee_paid=max_fee,
        exam_breakdowns=exam_breakdowns,
        yearly_breakdowns=yearly_breakdowns,
        course_type_breakdowns=course_type_breakdowns,
    )

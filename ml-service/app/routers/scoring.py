"""POST /score — weighted developer performance scoring endpoint."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from app.models import ScoreRequest, ScoreResponse
from app.services.scorer import compute_score, score_to_tier, calculate_percentile

router = APIRouter()


@router.post("/score", response_model=ScoreResponse, summary="Score developer contributions")
async def score_developer(request: ScoreRequest) -> ScoreResponse:
    """
    Compute a weighted contribution score (0-100) using sklearn StandardScaler normalization.

    Returns overall score, tier classification, per-metric breakdown, and percentile rank.
    """
    try:
        result = compute_score(
            commits=request.commits,
            prs_merged=request.prs_merged,
            reviews_given=request.reviews_given,
            issues_closed=request.issues_closed,
            lines_changed=request.lines_changed,
            active_days=request.active_days,
        )
        return ScoreResponse(
            score=result["score"],
            tier=score_to_tier(result["score"]),
            breakdown=result["breakdown"],
            percentile=calculate_percentile(result["score"]),
            computed_at=datetime.now(timezone.utc),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

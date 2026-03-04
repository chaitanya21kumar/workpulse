"""POST /insights — LangChain + Groq AI developer insights endpoint."""
from fastapi import APIRouter, HTTPException

from app.models import InsightsRequest, InsightsResponse
from app.services.llm import generate_insights

router = APIRouter()


@router.post("/insights", response_model=InsightsResponse, summary="Generate AI developer insights")
async def developer_insights(request: InsightsRequest) -> InsightsResponse:
    """
    Generate personalized AI insights using LangChain + Groq (llama3-70b-8192).

    Falls back to rule-based insights when GROQ_API_KEY is not set or on zero metrics.
    """
    try:
        result = generate_insights(
            developer_name=request.developer_name,
            metrics=request.metrics.model_dump(),
            score=request.score,
            tier=request.tier,
        )
        return InsightsResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")

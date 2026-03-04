"""Pydantic request/response models for WorkPulse ML Service."""
from datetime import datetime
from typing import Dict, List
from pydantic import BaseModel, Field


class MetricsInput(BaseModel):
    commits: int = Field(default=0, ge=0, description="Number of commits")
    prs_merged: int = Field(default=0, ge=0, description="Pull requests merged")
    reviews_given: int = Field(default=0, ge=0, description="Code reviews given")
    issues_closed: int = Field(default=0, ge=0, description="Issues closed")
    lines_changed: int = Field(default=0, ge=0, description="Total lines changed")
    active_days: int = Field(default=0, ge=0, description="Active working days")


class ScoreRequest(BaseModel):
    commits: int = Field(default=0, ge=0)
    prs_merged: int = Field(default=0, ge=0)
    reviews_given: int = Field(default=0, ge=0)
    issues_closed: int = Field(default=0, ge=0)
    lines_changed: int = Field(default=0, ge=0)
    active_days: int = Field(default=0, ge=0)


class ScoreResponse(BaseModel):
    score: float = Field(..., ge=0, le=100, description="Overall score 0-100")
    tier: str = Field(..., description="Elite | Senior | Mid | Junior")
    breakdown: Dict[str, float] = Field(..., description="Per-metric weighted score contributions")
    percentile: float = Field(..., ge=0, le=100, description="Percentile vs baseline 100 developers")
    computed_at: datetime


class InsightMetrics(BaseModel):
    commits: int = Field(default=0, ge=0)
    prs_merged: int = Field(default=0, ge=0)
    reviews_given: int = Field(default=0, ge=0)
    issues_closed: int = Field(default=0, ge=0)
    lines_changed: int = Field(default=0, ge=0)
    active_days: int = Field(default=0, ge=0)


class InsightsRequest(BaseModel):
    developer_name: str = Field(..., description="Developer display name")
    metrics: InsightMetrics
    score: float = Field(..., ge=0, le=100)
    tier: str = Field(..., description="Elite | Senior | Mid | Junior")


class InsightsResponse(BaseModel):
    summary: str
    strengths: List[str]
    improvements: List[str]
    action_items: List[str]
    team_impact: str
    predicted_trend: str

"""Shared pytest fixtures for WorkPulse ML service tests."""
import pytest


@pytest.fixture
def sample_metrics():
    """Realistic developer metrics fixture for use in scoring and insights tests."""
    return {
        "commits": 42,
        "prs_merged": 8,
        "reviews_given": 15,
        "issues_closed": 6,
        "lines_changed": 1800,
        "active_days": 20,
    }


@pytest.fixture
def zero_metrics():
    """All-zero metrics fixture to test edge-case handling."""
    return {
        "commits": 0,
        "prs_merged": 0,
        "reviews_given": 0,
        "issues_closed": 0,
        "lines_changed": 0,
        "active_days": 0,
    }


@pytest.fixture
def high_metrics():
    """High-activity developer metrics fixture for elite-tier scenarios."""
    return {
        "commits": 200,
        "prs_merged": 30,
        "reviews_given": 60,
        "issues_closed": 25,
        "lines_changed": 8000,
        "active_days": 28,
    }


@pytest.fixture
def sample_insights_response():
    """Pre-baked insights response fixture for mocking LLM calls."""
    return {
        "summary": "A consistent contributor who ships quality code regularly.",
        "strengths": [
            "High commit frequency",
            "Strong PR review participation",
            "Consistent activity across the month",
        ],
        "improvements": [
            "Could improve issue resolution speed",
            "Consider writing more test coverage",
        ],
        "action_items": [
            "Close 2 open issues this sprint",
            "Add unit tests for recent PRs",
        ],
        "team_impact": "Above-average contributor; positively influences team velocity.",
        "predicted_trend": "improving",
    }


@pytest.fixture
def fastapi_client():
    """FastAPI TestClient fixture with the WorkPulse ML app."""
    from fastapi.testclient import TestClient
    from app.main import app

    return TestClient(app)

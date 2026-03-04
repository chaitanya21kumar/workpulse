"""Tests for the scoring service — scorer.py and POST /score endpoint."""
import pytest
from app.services.scorer import compute_score, score_to_tier, calculate_percentile


class TestComputeScore:
    def test_zero_input_returns_low_score(self):
        result = compute_score(
            commits=0, prs_merged=0, reviews_given=0,
            issues_closed=0, lines_changed=0, active_days=0,
        )
        assert result["score"] <= 50.0, "All-zero metrics should produce a low score"
        assert set(result["breakdown"].keys()) == {
            "commits", "prs_merged", "reviews_given",
            "issues_closed", "lines_changed", "active_days",
        }

    def test_high_input_produces_high_score(self):
        result = compute_score(
            commits=200, prs_merged=30, reviews_given=60,
            issues_closed=25, lines_changed=5000, active_days=28,
        )
        assert result["score"] >= 70.0, "High metrics should produce a score ≥ 70"

    def test_score_bounded_0_to_100(self):
        result = compute_score(
            commits=9999, prs_merged=999, reviews_given=999,
            issues_closed=999, lines_changed=999999, active_days=31,
        )
        assert 0.0 <= result["score"] <= 100.0

    def test_breakdown_weights_sum(self):
        """Each breakdown value is the weighted contribution; validate structure."""
        result = compute_score(
            commits=20, prs_merged=4, reviews_given=8,
            issues_closed=3, lines_changed=500, active_days=15,
        )
        breakdown = result["breakdown"]
        assert all(v >= 0.0 for v in breakdown.values()), "Breakdown values must be non-negative"

    def test_normal_input(self):
        result = compute_score(
            commits=25, prs_merged=5, reviews_given=10,
            issues_closed=4, lines_changed=800, active_days=18,
        )
        assert isinstance(result["score"], float)
        assert "breakdown" in result


class TestScoreToTier:
    @pytest.mark.parametrize("score,expected", [
        (90.0, "Elite"),
        (85.0, "Elite"),
        (84.9, "Senior"),
        (70.0, "Senior"),
        (69.9, "Mid"),
        (50.0, "Mid"),
        (49.9, "Junior"),
        (0.0,  "Junior"),
    ])
    def test_tier_boundaries(self, score: float, expected: str):
        assert score_to_tier(score) == expected


class TestCalculatePercentile:
    def test_percentile_is_float_in_range(self):
        p = calculate_percentile(50.0)
        assert isinstance(p, float)
        assert 0.0 <= p <= 99.9

    def test_low_score_has_low_percentile(self):
        p_low = calculate_percentile(10.0)
        p_high = calculate_percentile(90.0)
        assert p_low < p_high


class TestScoringEndpoint:
    def test_normal_request(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post("/score", json={
            "commits": 30,
            "prs_merged": 6,
            "reviews_given": 12,
            "issues_closed": 5,
            "lines_changed": 1200,
            "active_days": 20,
        })
        assert response.status_code == 200
        data = response.json()
        assert 0 <= data["score"] <= 100
        assert data["tier"] in ["Elite", "Senior", "Mid", "Junior"]
        assert "breakdown" in data
        assert "percentile" in data
        assert "computed_at" in data

    def test_zero_metrics_request(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post("/score", json={
            "commits": 0, "prs_merged": 0, "reviews_given": 0,
            "issues_closed": 0, "lines_changed": 0, "active_days": 0,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "Junior"

    def test_high_metrics_request(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post("/score", json={
            "commits": 150, "prs_merged": 20, "reviews_given": 50,
            "issues_closed": 20, "lines_changed": 8000, "active_days": 28,
        })
        assert response.status_code == 200
        assert response.json()["score"] >= 75.0

"""
LangChain + Groq (llama3-70b-8192) service for generating structured AI developer insights.

Retry logic: up to 2 attempts on timeout or transient errors.
Zero-metrics edge case: returns an "insufficient data" insight immediately.
"""
import os
import time
import logging
from typing import Dict, Any

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

logger = logging.getLogger(__name__)

GROQ_MODEL = "llama3-70b-8192"
MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 1.5

INSIGHTS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a senior engineering manager providing data-driven developer performance insights.
Be constructive, honest, and specific. Base all feedback strictly on the metrics provided.
Return ONLY valid JSON — no markdown, no extra text.""",
    ),
    (
        "human",
        """Analyze the following developer metrics and return a JSON object with exactly these fields:

Developer: {developer_name}
Overall Score: {score}/100
Tier: {tier}

Monthly Metrics:
- Commits: {commits}
- PRs Merged: {prs_merged}
- Reviews Given: {reviews_given}
- Issues Closed: {issues_closed}
- Lines Changed: {lines_changed}
- Active Days: {active_days}

Return this exact JSON structure:
{{
  "summary": "2-3 sentence performance overview",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2"],
  "action_items": ["concrete action 1", "concrete action 2", "concrete action 3"],
  "team_impact": "one sentence on team impact",
  "predicted_trend": "improving|stable|declining"
}}""",
    ),
])


def generate_insights(
    developer_name: str,
    metrics: Dict[str, Any],
    score: float,
    tier: str,
) -> dict:
    """
    Generate structured AI developer insights using LangChain + Groq.

    Falls back to rule-based insights when:
    - GROQ_API_KEY is not set
    - All activity metrics are zero
    - All retries are exhausted
    """
    commits = metrics.get("commits", 0)
    prs_merged = metrics.get("prs_merged", 0)
    reviews_given = metrics.get("reviews_given", 0)
    issues_closed = metrics.get("issues_closed", 0)
    lines_changed = metrics.get("lines_changed", 0)
    active_days = metrics.get("active_days", 0)

    # Zero-metrics edge case
    activity_total = commits + prs_merged + reviews_given + issues_closed
    if activity_total == 0:
        return _insufficient_data_insight(developer_name)

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        logger.warning("GROQ_API_KEY not set — using rule-based fallback insights")
        return _rule_based_insights(developer_name, score, tier, metrics)

    last_error: Exception = Exception("Unknown error")
    for attempt in range(MAX_RETRIES):
        try:
            llm = ChatGroq(
                model=GROQ_MODEL,
                temperature=0.3,
                api_key=groq_api_key,
            )
            parser = JsonOutputParser()
            chain = INSIGHTS_PROMPT | llm | parser

            result: dict = chain.invoke({
                "developer_name": developer_name,
                "score": score,
                "tier": tier,
                "commits": commits,
                "prs_merged": prs_merged,
                "reviews_given": reviews_given,
                "issues_closed": issues_closed,
                "lines_changed": lines_changed,
                "active_days": active_days,
            })

            return {
                "summary": result.get("summary", ""),
                "strengths": result.get("strengths", []),
                "improvements": result.get("improvements", []),
                "action_items": result.get("action_items", []),
                "team_impact": result.get("team_impact", ""),
                "predicted_trend": result.get("predicted_trend", "stable"),
            }

        except Exception as exc:
            last_error = exc
            logger.warning("Groq attempt %d/%d failed: %s", attempt + 1, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY_SECONDS)

    logger.error("All Groq retries exhausted: %s — using rule-based fallback", last_error)
    return _rule_based_insights(developer_name, score, tier, metrics)


def _insufficient_data_insight(developer_name: str) -> dict:
    """Return a default insight when all metrics are zero."""
    return {
        "summary": (
            f"{developer_name} has no recorded activity for this period. "
            "Insufficient data to generate meaningful insights."
        ),
        "strengths": ["No data available yet"],
        "improvements": ["Start contributing to tracked repositories"],
        "action_items": [
            "Make at least one commit this week",
            "Open or review a pull request",
            "Close an open issue",
        ],
        "team_impact": "No measurable team impact recorded",
        "predicted_trend": "stable",
    }


def _rule_based_insights(
    developer_name: str,
    score: float,
    tier: str,
    metrics: Dict[str, Any],
) -> dict:
    """Fallback rule-based insights when Groq is unavailable."""
    commits = metrics.get("commits", 0)
    prs_merged = metrics.get("prs_merged", 0)
    reviews_given = metrics.get("reviews_given", 0)
    issues_closed = metrics.get("issues_closed", 0)

    strengths: list[str] = []
    improvements: list[str] = []
    action_items: list[str] = []

    if commits >= 30:
        strengths.append(f"High commit frequency ({commits} commits this period)")
    if prs_merged >= 5:
        strengths.append(f"Strong PR delivery ({prs_merged} PRs merged)")
    if reviews_given >= 10:
        strengths.append(f"Active code reviewer ({reviews_given} reviews given)")

    if commits < 10:
        improvements.append("Increase commit frequency — aim for daily commits")
        action_items.append("Break work into smaller, more frequent commits")
    if reviews_given < 5:
        improvements.append("Increase code review participation")
        action_items.append("Review at least 2 PRs per week")
    if issues_closed < 3:
        improvements.append("Engage more with issue tracking")
        action_items.append("Pick up and close 2 open issues this sprint")

    if not strengths:
        strengths = ["Consistent contributor to the team"]
    if not improvements:
        improvements = ["Continue current pace and explore new challenges"]
    if not action_items:
        action_items = ["Maintain current contribution level"]

    if score >= 70:
        trend = "improving"
    elif score >= 50:
        trend = "stable"
    else:
        trend = "declining"

    summary = (
        f"{developer_name} is a {tier}-tier developer with a score of {score}/100. "
        f"This period: {commits} commits, {prs_merged} PRs merged, {reviews_given} code reviews. "
        f"{'Strong contributor showing positive momentum.' if score >= 60 else 'Some areas need focused improvement.'}"
    )

    return {
        "summary": summary,
        "strengths": strengths[:3],
        "improvements": improvements[:3],
        "action_items": action_items[:3],
        "team_impact": f"{'Above' if score >= 60 else 'Below'} average team contributor",
        "predicted_trend": trend,
    }

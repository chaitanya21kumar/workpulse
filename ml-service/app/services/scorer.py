"""
Weighted developer scoring engine using sklearn StandardScaler normalization.

Feature weights (sum = 1.0):
  commits       = 0.25
  prs_merged    = 0.30
  reviews_given = 0.15
  issues_closed = 0.15
  lines_changed = 0.10
  active_days   = 0.05
"""
import numpy as np
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    "commits",
    "prs_merged",
    "reviews_given",
    "issues_closed",
    "lines_changed",
    "active_days",
]

WEIGHTS = np.array([0.25, 0.30, 0.15, 0.15, 0.10, 0.05])

# Synthetic baseline population of 100 developers used to fit the scaler
# and compute percentile ranks. Fixed seed for reproducibility.
_rng = np.random.default_rng(42)
BASELINE_POPULATION: np.ndarray = np.column_stack([
    _rng.poisson(lam=20,  size=100).astype(float),   # commits
    _rng.poisson(lam=4,   size=100).astype(float),   # prs_merged
    _rng.poisson(lam=8,   size=100).astype(float),   # reviews_given
    _rng.poisson(lam=3,   size=100).astype(float),   # issues_closed
    _rng.poisson(lam=500, size=100).astype(float),   # lines_changed
    _rng.integers(5, 25,  size=100).astype(float),   # active_days
])

_scaler = StandardScaler()
_scaler.fit(BASELINE_POPULATION)

# Pre-compute scores for all 100 baseline developers (used for percentile ranking)
_BASELINE_NORMALIZED = np.clip(_scaler.transform(BASELINE_POPULATION), -3, 3)
_BASELINE_SCALED = (_BASELINE_NORMALIZED + 3) / 6.0
_BASELINE_SCORES: np.ndarray = np.round(
    np.clip((_BASELINE_SCALED * WEIGHTS).sum(axis=1) * 100.0, 0.0, 100.0), 1
)


def compute_score(
    commits: int,
    prs_merged: int,
    reviews_given: int,
    issues_closed: int,
    lines_changed: int,
    active_days: int,
) -> dict:
    """
    Normalize inputs with the fitted StandardScaler, apply weights, and return
    score + per-metric weighted breakdown.
    """
    features = np.array(
        [[commits, prs_merged, reviews_given, issues_closed, lines_changed, active_days]],
        dtype=float,
    )

    # Normalize and clip to ±3 std deviations to handle extreme outliers
    normalized = np.clip(_scaler.transform(features)[0], -3, 3)

    # Shift to [0, 1] range: -3 -> 0.0, +3 -> 1.0
    scaled = (normalized + 3) / 6.0

    # Weighted contribution of each metric
    weighted = scaled * WEIGHTS

    # Overall score 0-100
    score = round(float(np.clip(weighted.sum() * 100.0, 0.0, 100.0)), 1)

    breakdown = {
        name: round(float(weighted[i] * 100.0), 2)
        for i, name in enumerate(FEATURE_NAMES)
    }

    return {"score": score, "breakdown": breakdown}


def score_to_tier(score: float) -> str:
    """Classify score into Elite / Senior / Mid / Junior tier."""
    if score >= 85:
        return "Elite"
    if score >= 70:
        return "Senior"
    if score >= 50:
        return "Mid"
    return "Junior"


def calculate_percentile(score: float) -> float:
    """
    Calculate percentile rank of given score against the 100-developer baseline.
    Returns a value in [0, 100].
    """
    rank = float(np.sum(_BASELINE_SCORES < score))
    percentile = round((rank / len(_BASELINE_SCORES)) * 100.0, 1)
    return min(percentile, 99.9)

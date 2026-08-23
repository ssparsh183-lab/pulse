"""
PULSE — Signal Ranking

Computes an explainable priority score for each signal so the
dashboard can rank them meaningfully.

Priority is composed of transparent factors, not a black-box AI number.
Every score comes with a breakdown that can be shown to the organizer.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.pulse_engine.domain import Signal, SignalState


# Weights for priority factors (must sum to 1.0)
WEIGHT_UNIQUE_SUPPORT = 0.40
WEIGHT_MOMENTUM = 0.30
WEIGHT_RECENCY = 0.20
WEIGHT_URGENCY = 0.10


# Normalization ceilings (values above these get capped to 1.0)
MAX_UNIQUE_USERS_FOR_SCORE = 50
MAX_MOMENTUM_FOR_SCORE = 20              # users/min
RECENCY_HALF_LIFE_SECONDS = 60           # activity fades over 1 min


@dataclass
class RankingResult:
    """Full ranking breakdown for one signal."""
    priority_score: float                  # final 0.0-1.0 score
    support_component: float
    momentum_component: float
    recency_component: float
    urgency_component: float
    reasons: list[str] = field(default_factory=list)   # human-readable explanations


def calculate_priority(
    signal: Signal,
    now: datetime = None,
) -> RankingResult:
    """
    Calculate a signal's priority based on multiple explainable factors.
    Returns both the numeric score and reasons for dashboard display.
    """
    if now is None:
        now = datetime.utcnow()

    # Component 1: Unique support (normalized)
    support_component = min(1.0, signal.unique_support / MAX_UNIQUE_USERS_FOR_SCORE)

    # Component 2: Momentum (normalized, only positive contributes)
    momentum_component = min(1.0, max(0.0, signal.momentum / MAX_MOMENTUM_FOR_SCORE))

    # Component 3: Recency (exponential decay)
    seconds_since = (now - signal.last_seen_at).total_seconds()
    recency_component = _exponential_decay(seconds_since, RECENCY_HALF_LIFE_SECONDS)

    # Component 4: Urgency (based on state)
    urgency_component = _urgency_from_state(signal.state)

    # Weighted sum
    priority = (
        WEIGHT_UNIQUE_SUPPORT * support_component
        + WEIGHT_MOMENTUM * momentum_component
        + WEIGHT_RECENCY * recency_component
        + WEIGHT_URGENCY * urgency_component
    )

    reasons = _build_reasons(
        signal, support_component, momentum_component,
        recency_component, urgency_component,
    )

    return RankingResult(
        priority_score=priority,
        support_component=support_component,
        momentum_component=momentum_component,
        recency_component=recency_component,
        urgency_component=urgency_component,
        reasons=reasons,
    )


def update_signal_priority(signal: Signal, now: datetime = None) -> RankingResult:
    """Convenience — calculate priority AND update signal.priority."""
    result = calculate_priority(signal, now)
    signal.priority = result.priority_score
    signal.urgency = result.urgency_component
    return result


def rank_signals(
    signals: list[Signal],
    now: datetime = None,
) -> list[tuple[Signal, RankingResult]]:
    """
    Rank a list of signals by priority (highest first).
    Returns (signal, ranking_details) tuples.
    """
    if now is None:
        now = datetime.utcnow()

    scored = [(s, calculate_priority(s, now)) for s in signals]
    scored.sort(key=lambda x: -x[1].priority_score)
    return scored


# ------------------------------------------------------------------
# INTERNAL HELPERS
# ------------------------------------------------------------------

def _exponential_decay(elapsed_seconds: float, half_life: float) -> float:
    """
    Returns a value in [0, 1] that decays over time.
    At elapsed=0 → 1.0, at elapsed=half_life → 0.5, etc.
    """
    if elapsed_seconds <= 0:
        return 1.0
    return 0.5 ** (elapsed_seconds / half_life)


def _urgency_from_state(state: SignalState) -> float:
    """
    Map lifecycle state to urgency score.
    Rising signals demand more attention than stable/resolved ones.
    """
    mapping = {
        SignalState.RE_EMERGING: 1.0,   # highest — was resolved, came back
        SignalState.RISING: 0.9,
        SignalState.EMERGING: 0.6,
        SignalState.ACTIVE: 0.5,
        SignalState.DECLINING: 0.2,
        SignalState.RESOLVED: 0.0,
        SignalState.NOISE: 0.0,
    }
    return mapping.get(state, 0.5)


def _build_reasons(
    signal: Signal,
    support_c: float,
    momentum_c: float,
    recency_c: float,
    urgency_c: float,
) -> list[str]:
    """Human-readable explanations for why a signal is ranked high/low."""
    reasons = []

    if signal.unique_support >= 10:
        reasons.append(f"{signal.unique_support} unique participants")
    elif signal.unique_support >= 3:
        reasons.append(f"{signal.unique_support} independent supporters")

    if signal.momentum >= 8:
        reasons.append(f"rapidly rising (+{signal.momentum:.0f}/min)")
    elif signal.momentum >= 4:
        reasons.append(f"rising (+{signal.momentum:.0f}/min)")
    elif signal.momentum <= -2:
        reasons.append("activity declining")

    if recency_c > 0.7:
        reasons.append("very recent activity")

    if signal.state == SignalState.RE_EMERGING:
        reasons.append("previously resolved — resurging")

    return reasons
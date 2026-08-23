"""
PULSE — Stream Health Score Calculator

Calculates a single 0-100 "health" score for a stream based on:
  - Feedback ratio (positive vibes)          25%
  - Doubt resolution rate                    20%
  - Momentum positive trend                  20%
  - Tech issue impact (INVERSE — bad = low)  15%
  - Engagement velocity                      10%
  - Compression health (signal density)      10%

Returns a PulseScoreResult with:
  - score (0-100)
  - state ("on_fire" | "healthy" | "attention" | "critical")
  - components (breakdown)
  - reasons (human-readable)
"""

from dataclasses import dataclass, field
from typing import Optional

from app.pulse_engine.domain import Signal, SignalState


# Weights (sum = 1.0)
WEIGHT_FEEDBACK = 0.25
WEIGHT_DOUBT_RESOLUTION = 0.20
WEIGHT_MOMENTUM = 0.20
WEIGHT_TECH_INVERSE = 0.15
WEIGHT_ENGAGEMENT = 0.10
WEIGHT_COMPRESSION = 0.10


@dataclass
class PulseScoreResult:
    score: int                              # 0-100
    state: str                              # on_fire | healthy | attention | critical
    label: str                              # e.g. "🔥 ON FIRE"
    color: str                              # emerald | blue | amber | rose
    components: dict[str, float] = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)


def calculate_pulse_score(
    signals: list[Signal],
    total_messages: int = 0,
) -> PulseScoreResult:
    """
    Main calculator. Feed all signals + total messages, get score.
    """
    if not signals:
        return PulseScoreResult(
            score=50,
            state="attention",
            label="⚠️ AWAITING DATA",
            color="amber",
            components={},
            reasons=["No signals detected yet"],
        )

    # Group signals by category
    by_cat: dict[str, list[Signal]] = {}
    for s in signals:
        cat = s.category or "unclassified"
        by_cat.setdefault(cat, []).append(s)

    total_signals = len(signals)
    total_users = sum(s.unique_support for s in signals)

    # ---- Component 1: Feedback ratio (positive vibes) ----
    feedback_signals = by_cat.get("feedback", [])
    engagement_signals = by_cat.get("engagement", [])
    positive_users = sum(s.unique_support for s in feedback_signals + engagement_signals)
    feedback_component = min(1.0, positive_users / max(total_users, 1))

    # ---- Component 2: Doubt resolution rate ----
    doubt_signals = by_cat.get("doubt", [])
    resolved_doubts = sum(1 for s in doubt_signals if s.state == SignalState.RESOLVED)
    doubt_resolution_component = (
        resolved_doubts / len(doubt_signals) if doubt_signals else 0.7  # neutral if no doubts
    )

    # ---- Component 3: Momentum (positive trend) ----
    rising_count = sum(
        1 for s in signals
        if s.state in (SignalState.RISING, SignalState.ACTIVE, SignalState.EMERGING)
    )
    declining_count = sum(1 for s in signals if s.state == SignalState.DECLINING)
    momentum_ratio = rising_count / max(rising_count + declining_count, 1)
    momentum_component = momentum_ratio

    # ---- Component 4: Tech issue (INVERSE — more tech issues = lower score) ----
    tech_signals = by_cat.get("technical_issue", [])
    tech_users = sum(s.unique_support for s in tech_signals)
    tech_impact = min(1.0, tech_users / max(total_users, 1))
    tech_inverse_component = 1.0 - tech_impact  # invert it

    # ---- Component 5: Engagement velocity ----
    total_momentum = sum(max(0, s.momentum) for s in signals)
    engagement_component = min(1.0, total_momentum / (total_signals * 5))

    # ---- Component 6: Compression health ----
    if total_messages > 0 and total_signals > 0:
        ratio = total_messages / total_signals
        # 5:1 to 15:1 is the sweet spot. Below or above drops health.
        if 5 <= ratio <= 15:
            compression_component = 1.0
        elif ratio < 5:
            compression_component = ratio / 5.0  # too fragmented
        else:
            compression_component = max(0.3, 15.0 / ratio)  # too merged
    else:
        compression_component = 0.5

    # ---- Weighted final score ----
    final = (
        WEIGHT_FEEDBACK * feedback_component
        + WEIGHT_DOUBT_RESOLUTION * doubt_resolution_component
        + WEIGHT_MOMENTUM * momentum_component
        + WEIGHT_TECH_INVERSE * tech_inverse_component
        + WEIGHT_ENGAGEMENT * engagement_component
        + WEIGHT_COMPRESSION * compression_component
    )

    score_100 = int(round(final * 100))
    state, label, color = _classify_state(score_100)

    reasons = _build_reasons(
        feedback_component, doubt_resolution_component, momentum_component,
        tech_inverse_component, engagement_component, compression_component,
        len(feedback_signals), len(doubt_signals), len(tech_signals),
        rising_count, declining_count
    )

    return PulseScoreResult(
        score=score_100,
        state=state,
        label=label,
        color=color,
        components={
            "feedback": round(feedback_component, 3),
            "doubt_resolution": round(doubt_resolution_component, 3),
            "momentum": round(momentum_component, 3),
            "tech_inverse": round(tech_inverse_component, 3),
            "engagement": round(engagement_component, 3),
            "compression": round(compression_component, 3),
        },
        reasons=reasons,
    )


def _classify_state(score: int) -> tuple[str, str, str]:
    """Map 0-100 score to state + label + color."""
    if score >= 90:
        return "on_fire", "🔥 ON FIRE", "emerald"
    if score >= 60:
        return "healthy", "✅ HEALTHY", "blue"
    if score >= 40:
        return "attention", "⚠️ NEEDS ATTENTION", "amber"
    return "critical", "🚨 CRITICAL", "rose"


def _build_reasons(
    fb: float, dr: float, mo: float, ti: float, en: float, co: float,
    fb_count: int, doubt_count: int, tech_count: int,
    rising: int, declining: int
) -> list[str]:
    reasons = []

    if fb >= 0.5:
        reasons.append(f"Strong positive vibes ({fb_count} feedback clusters)")
    elif fb <= 0.2:
        reasons.append("Low audience engagement/positivity")

    if ti <= 0.5:
        reasons.append(f"Tech issues impacting stream ({tech_count} clusters)")

    if mo >= 0.7:
        reasons.append(f"{rising} signals actively rising")
    elif declining >= 2:
        reasons.append(f"{declining} signals declining — audience losing focus")

    if doubt_count > 0 and dr < 0.3:
        reasons.append(f"{doubt_count} unresolved doubts — clarify now")

    if co >= 0.8:
        reasons.append("Signal density is healthy")
    elif co <= 0.4:
        reasons.append("Signals fragmented — audience unfocused")

    return reasons[:4]  # cap at 4
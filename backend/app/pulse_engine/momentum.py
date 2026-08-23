"""
PULSE — Momentum Calculator

Tracks how rapidly a signal is gaining unique-user support over time
using rolling time windows.

Provides explainable momentum values that drive the RISING/DECLINING
lifecycle states and priority ranking.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from app.pulse_engine.domain import Signal


# Window size for rate calculation
WINDOW_SECONDS = 30

# Thresholds for momentum classification (new unique users per minute)
RAPIDLY_RISING_THRESHOLD = 8      # 8+/min → rapid growth
RISING_THRESHOLD = 4              # 4+/min → steady growth
DECLINING_THRESHOLD = -2          # net drop → losing steam


class MomentumTrend(str, Enum):
    RAPIDLY_RISING = "rapidly_rising"
    RISING = "rising"
    STABLE = "stable"
    DECLINING = "declining"
    IDLE = "idle"


@dataclass
class MomentumResult:
    """Full momentum analysis for a signal at a moment in time."""
    current_window_count: int      # unique users joined in last WINDOW_SECONDS
    previous_window_count: int     # unique users joined in the window before
    rate_per_minute: float         # net new users per minute
    trend: MomentumTrend
    explanation: str               # human-readable reason for dashboard


def calculate_momentum(
    signal: Signal,
    now: datetime = None,
) -> MomentumResult:
    """
    Calculate momentum for a signal based on when unique users joined.

    Uses two consecutive time windows:
      - Current:  [now - WINDOW_SECONDS, now]
      - Previous: [now - 2*WINDOW_SECONDS, now - WINDOW_SECONDS]

    Rate is expressed as unique users per minute for readability.
    """
    if now is None:
        now = datetime.utcnow()

    current_start = now - timedelta(seconds=WINDOW_SECONDS)
    previous_start = now - timedelta(seconds=2 * WINDOW_SECONDS)

    current_count = 0
    previous_count = 0

    for user_id, join_time in signal.participant_join_times.items():
        if current_start <= join_time <= now:
            current_count += 1
        elif previous_start <= join_time < current_start:
            previous_count += 1

    # Net change extrapolated to per-minute
    net_change = current_count - previous_count
    rate_per_min = net_change * (60 / WINDOW_SECONDS)

    trend, explanation = _classify_trend(
        current_count, previous_count, rate_per_min
    )

    return MomentumResult(
        current_window_count=current_count,
        previous_window_count=previous_count,
        rate_per_minute=rate_per_min,
        trend=trend,
        explanation=explanation,
    )


def _classify_trend(
    current: int,
    previous: int,
    rate_per_min: float,
) -> tuple[MomentumTrend, str]:
    """Turn raw numbers into a labelled trend + explanation."""

    if current == 0 and previous == 0:
        return MomentumTrend.IDLE, "No recent activity"

    if rate_per_min >= RAPIDLY_RISING_THRESHOLD:
        return (
            MomentumTrend.RAPIDLY_RISING,
            f"+{current} new users in last {WINDOW_SECONDS}s "
            f"(prev window: {previous})"
        )

    if rate_per_min >= RISING_THRESHOLD:
        return (
            MomentumTrend.RISING,
            f"+{current} new users in last {WINDOW_SECONDS}s"
        )

    if rate_per_min <= DECLINING_THRESHOLD:
        return (
            MomentumTrend.DECLINING,
            f"Activity dropped: {previous} → {current} in last window"
        )

    return (
        MomentumTrend.STABLE,
        f"Steady activity: {current} recent users"
    )


def update_signal_momentum(signal: Signal, now: datetime = None) -> MomentumResult:
    """
    Convenience helper — calculates momentum AND updates the signal object
    with numeric momentum values (used by ranking and lifecycle).
    """
    result = calculate_momentum(signal, now)

    signal.support_current_window = result.current_window_count
    signal.support_previous_window = result.previous_window_count
    signal.momentum = result.rate_per_minute

    return result
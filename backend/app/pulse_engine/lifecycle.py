"""
PULSE — Signal Lifecycle Manager

Handles state transitions for signals based on:
  - Unique user support
  - Momentum trend
  - Recency of activity
  - Organizer actions (resolve)

State flow:
    NOISE → EMERGING → RISING → ACTIVE → DECLINING → RESOLVED
                                            ↓
                                       RE_EMERGING (if activity returns)
"""

from datetime import datetime, timedelta

from app.pulse_engine.domain import Signal, SignalState
from app.pulse_engine.momentum import MomentumTrend, calculate_momentum


# Time thresholds
INACTIVITY_THRESHOLD_SECONDS = 90        # no new activity → DECLINING
STALE_THRESHOLD_SECONDS = 300            # very old → auto-resolve candidate
RE_EMERGING_MIN_NEW_USERS = 2            # resolved signal needs this many new users to re-emerge


def update_lifecycle(signal: Signal, now: datetime = None) -> bool:
    """
    Evaluate and potentially transition a signal's state.
    Returns True if state changed, False otherwise.
    """
    if now is None:
        now = datetime.utcnow()

    old_state = signal.state
    new_state = _determine_new_state(signal, now)

    if new_state != old_state:
        signal.state = new_state
        signal.updated_at = now
        return True

    return False


def _determine_new_state(signal: Signal, now: datetime) -> SignalState:
    """
    Core state transition logic. Returns the state signal should be in NOW.
    """
    # RESOLVED is a terminal state set by organizer action — only re-emerge can change it
    if signal.state == SignalState.RESOLVED:
        return _check_re_emergence(signal, now)

    # NOISE stays NOISE until enough unique users (handled in fusion)
    if signal.state == SignalState.NOISE:
        return SignalState.NOISE

    # For all active states, momentum + recency drive transitions
    momentum = calculate_momentum(signal, now)
    seconds_since_activity = (now - signal.last_seen_at).total_seconds()

    # No recent activity at all → DECLINING
    if seconds_since_activity > INACTIVITY_THRESHOLD_SECONDS:
        return SignalState.DECLINING

    # Momentum-driven transitions
    if momentum.trend in (MomentumTrend.RAPIDLY_RISING, MomentumTrend.RISING):
        return SignalState.RISING

    if momentum.trend == MomentumTrend.DECLINING:
        return SignalState.DECLINING

    # Otherwise — signal has support, some activity, but not rising
    # Promote from EMERGING to ACTIVE once it's proven itself
    if signal.state == SignalState.EMERGING and signal.unique_support >= 4:
        return SignalState.ACTIVE

    return signal.state  # no change


def _check_re_emergence(signal: Signal, now: datetime) -> SignalState:
    """
    For RESOLVED signals — check if new activity warrants RE_EMERGING.
    Only counts users who joined AFTER the resolution timestamp.
    """
    resolution_time = signal.updated_at  # last time state changed (to RESOLVED)

    new_users_since_resolution = sum(
        1
        for join_time in signal.participant_join_times.values()
        if join_time > resolution_time
    )

    if new_users_since_resolution >= RE_EMERGING_MIN_NEW_USERS:
        return SignalState.RE_EMERGING

    return SignalState.RESOLVED


def mark_resolved(signal: Signal, now: datetime = None) -> None:
    """Explicitly resolve a signal (organizer action)."""
    if now is None:
        now = datetime.utcnow()
    signal.state = SignalState.RESOLVED
    signal.updated_at = now


def mark_dismissed(signal: Signal, now: datetime = None) -> None:
    """
    Dismiss a signal (organizer says 'not relevant').
    Treated as resolved for lifecycle purposes.
    """
    mark_resolved(signal, now)
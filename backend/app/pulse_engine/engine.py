"""
PULSE — Master Engine

The orchestrator that ties all pieces together:
    preprocess → embed → fuse → momentum → lifecycle → ranking → categorize

External code (API, WebSocket) only talks to this class.
It doesn't need to know about individual modules.
"""

from datetime import datetime
from typing import Optional

from app.pulse_engine.domain import (
    NormalizedMessage,
    Signal,
    EngineResult,
    MessageOutcome,
)
from app.pulse_engine.preprocessor import preprocess
from app.pulse_engine.embedder import get_embedder
from app.pulse_engine.fusion import FusionEngine
from app.pulse_engine.momentum import update_signal_momentum
from app.pulse_engine.lifecycle import update_lifecycle, mark_resolved, mark_dismissed
from app.pulse_engine.ranking import update_signal_priority, rank_signals, RankingResult
from app.pulse_engine.category_classifier import get_classifier, SignalCategory


class PulseEngine:
    """
    The main engine for a single stream. One instance per active stream.

    Wraps fusion + momentum + lifecycle + ranking + categorization
    into a single unified interface.
    """

    def __init__(self, stream_id: str):
        self.stream_id = stream_id
        self.fusion = FusionEngine(stream_id=stream_id)
        self.embedder = get_embedder()          # shared singleton
        self.classifier = get_classifier()      # shared singleton

    # ------------------------------------------------------------------
    # INGEST — process a new message
    # ------------------------------------------------------------------

    def ingest(self, message: NormalizedMessage) -> EngineResult:
        """
        Process a single incoming message through the full pipeline.
        Returns EngineResult describing what happened.
        """
        # Step 1: preprocess
        pre = preprocess(message.text)
        if not pre.is_valid:
            return EngineResult(
                message=message,
                outcome=MessageOutcome.IGNORED_EMPTY,
            )

        # Step 2: embed
        vector = self.embedder.embed(pre.cleaned)

        # Step 3: fuse (attach to existing OR create new signal)
        result = self.fusion.process(message, pre.cleaned, vector)

        # Step 4: refresh momentum + lifecycle + priority + category for the affected signal
        if result.signal is not None:
            self._refresh_signal_state(result.signal, now=message.timestamp)

        return result

    # ------------------------------------------------------------------
    # QUERY — read signals for dashboard
    # ------------------------------------------------------------------

    def get_ranked_signals(
        self,
        include_noise: bool = False,
        category: Optional[str] = None,   # filter to a specific category
        now: datetime = None,
    ) -> list[tuple[Signal, RankingResult]]:
        """
        Return all visible signals ranked by priority.
        Refreshes momentum + lifecycle + priority + category for each before ranking.

        Args:
            include_noise: If True, includes NOISE-state signals (debug only)
            category: If provided, filters to only that category
                      (e.g. 'technical_issue', 'doubt', 'content_request')
            now: Optional timestamp for time-based calculations
        """
        if now is None:
            now = datetime.utcnow()

        signals = self.fusion.get_active_signals(include_noise=include_noise)

        # Refresh dynamic state for all signals
        for s in signals:
            self._refresh_signal_state(s, now=now)

        # Optional category filter
        if category is not None:
            signals = [s for s in signals if s.category == category]

        return rank_signals(signals, now=now)

    def get_signal(self, signal_id: str) -> Optional[Signal]:
        return self.fusion.get_signal(signal_id)

    def get_all_signals(self, include_noise: bool = True) -> list[Signal]:
        return self.fusion.get_active_signals(include_noise=include_noise)

    # ------------------------------------------------------------------
    # ORGANIZER ACTIONS
    # ------------------------------------------------------------------

    def resolve_signal(self, signal_id: str) -> bool:
        signal = self.fusion.get_signal(signal_id)
        if signal is None:
            return False
        mark_resolved(signal)
        return True

    def dismiss_signal(self, signal_id: str) -> bool:
        signal = self.fusion.get_signal(signal_id)
        if signal is None:
            return False
        mark_dismissed(signal)
        return True

    # ------------------------------------------------------------------
    # INTERNAL
    # ------------------------------------------------------------------

    def _refresh_signal_state(self, signal: Signal, now: datetime) -> None:
        """
        Update momentum → lifecycle → priority → category for a signal.
        Called after ingestion and before ranking queries.
        """
        update_signal_momentum(signal, now=now)
        update_lifecycle(signal, now=now)
        update_signal_priority(signal, now=now)

        # 🔥 FIX: Classify signal into a category using the ultra-precise text classifier (not raw centroid)
        result = self.classifier.classify_text(signal.label)
        signal.category = result.category.value
        signal.category_confidence = result.confidence
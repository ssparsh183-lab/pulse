# backend/app/pulse_engine/engine.py

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
    def __init__(self, stream_id: str, genre: str = "mixed"):
        self.stream_id = stream_id
        self.genre = (genre or "mixed").lower()
        self.fusion = FusionEngine(stream_id=stream_id, genre=self.genre)
        self.embedder = get_embedder()
        self.classifier = get_classifier()

    def ingest(self, message: NormalizedMessage) -> EngineResult:
        pre = preprocess(message.text)
        if not pre.is_valid:
            return EngineResult(
                message=message,
                outcome=MessageOutcome.IGNORED_EMPTY,
            )

        # Vectorize text & pass directly to Fusion Engine
        vector = self.embedder.embed(pre.cleaned)
        result = self.fusion.process(message, pre.cleaned, vector)

        if result.signal is not None:
            self._refresh_signal_state(result.signal, now=message.timestamp)

        return result

    def get_ranked_signals(
        self,
        include_noise: bool = False,
        category: Optional[str] = None,
        now: datetime = None,
    ) -> list[tuple[Signal, RankingResult]]:
        if now is None:
            now = datetime.utcnow()

        signals = self.fusion.get_active_signals(include_noise=include_noise)

        for s in signals:
            self._refresh_signal_state(s, now=now)

        if category is not None:
            signals = [s for s in signals if s.category == category]

        return rank_signals(signals, now=now)

    def get_signal(self, signal_id: str) -> Optional[Signal]:
        return self.fusion.get_signal(signal_id)

    def get_all_signals(self, include_noise: bool = True) -> list[Signal]:
        return self.fusion.get_active_signals(include_noise=include_noise)

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

    def _refresh_signal_state(self, signal: Signal, now: datetime) -> None:
        update_signal_momentum(signal, now=now)
        update_lifecycle(signal, now=now)
        update_signal_priority(signal, now=now)

        result = self.classifier.classify_text(signal.label, stream_genre=self.genre)
        signal.category = result.category.value
        signal.category_confidence = result.confidence
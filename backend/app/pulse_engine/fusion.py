# backend/app/pulse_engine/fusion.py

from datetime import datetime
from typing import Optional, List, Tuple
import numpy as np

from app.pulse_engine.domain import (
    NormalizedMessage, Signal, SignalState, EngineResult, MessageOutcome, generate_signal_id
)
from app.pulse_engine.similarity import hybrid_similarity, extract_core_subjects
from app.pulse_engine.category_classifier import get_classifier

TOXIC_TRAPS = {
    "bc", "mc", "chutiya", "chutiye", "lodu", "lund", "kutta", "kaminey", "saale", 
    "harami", "randi", "bhadwe", "wtf", "stfu", "shit", "trash", "cringe", "bhenchod", "madarchod"
}

SIMILARITY_THRESHOLD = 0.42
MIN_UNIQUE_USERS_FOR_VISIBILITY = 2
MAX_REPRESENTATIVE_MESSAGES = 5

class FusionEngine:
    def __init__(self, stream_id: str, genre: str = "mixed"):
        self.stream_id = stream_id
        self.genre = genre.lower()
        self.signals: dict[str, Signal] = {}
        self.classifier = get_classifier()

    def process(self, message: NormalizedMessage, cleaned_text: str, vector: np.ndarray) -> EngineResult:
        # Get category via Local Math-Classifier
        cat_result = self.classifier.classify_text(cleaned_text, stream_genre=self.genre)
        msg_category = cat_result.category.value

        if not self.signals:
            return EngineResult(message, MessageOutcome.CREATED_NEW_SIGNAL, self._create_signal(message, cleaned_text, vector, msg_category), None)

        best_signal, best_score = self._find_best_match(cleaned_text, vector, msg_category)

        # Merge logic (FIXED: removed typo call)
        if best_score >= SIMILARITY_THRESHOLD and best_signal is not None:
            # 👉 SIGNAL PEHLE SE THA: Merge kar do! 
            return self._execute_merge(best_signal, message, cleaned_text, vector, best_score)
        else:
            # 👉 PEHLI BAAR AAYA: Naya Signal Card spawn karo!
            signal = self._create_signal(message, cleaned_text, vector, msg_category)
            return EngineResult(message, MessageOutcome.CREATED_NEW_SIGNAL, signal, best_score)

    def _find_best_match(self, cleaned_text: str, vector: np.ndarray, msg_category: str) -> Tuple[Optional[Signal], float]:
        best_signal = None
        best_score = 0.0
        sub_msg = extract_core_subjects(cleaned_text)

        for signal in self.signals.values():
            sub_sig = extract_core_subjects(signal.label)
            # Subject affinity bypasses category strictness if they are talking about the same thing
            has_shared_subject = bool(sub_msg and sub_sig and (sub_msg & sub_sig))

            # Only block if NO shared subject AND categories conflict
            if not has_shared_subject:
                if (msg_category in ["feedback", "engagement"] and signal.category in ["technical_issue", "doubt"]) or \
                   (msg_category in ["technical_issue", "doubt"] and signal.category in ["feedback", "engagement"]):
                    continue
                if (msg_category == "off_topic" or signal.category == "off_topic") and msg_category != signal.category:
                    continue

            # Hybrid Math
            for anchor_text in [signal.label] + list(signal.representative_messages):
                res = hybrid_similarity(cleaned_text, anchor_text.lower(), vector, signal.centroid)
                score = res.hybrid_score
                if not has_shared_subject and signal.category != msg_category and msg_category != "unclassified":
                    score -= 0.25
                if score > best_score:
                    best_score = score
                    best_signal = signal

        return best_signal, best_score

    def _execute_merge(self, signal: Signal, message: NormalizedMessage, cleaned_text: str, vector: np.ndarray, score: float) -> EngineResult:
        previous_state = signal.state
        signal.message_ids.append(message.message_id)
        signal.unique_participant_ids.add(message.participant_id)
        if message.participant_id not in signal.participant_join_times:
            signal.participant_join_times[message.participant_id] = message.timestamp
        
        n = len(signal.message_ids) - 1
        signal.centroid = (signal.centroid * n + vector) / (n + 1)
        if np.linalg.norm(signal.centroid) > 0: signal.centroid /= np.linalg.norm(signal.centroid)
        
        if cleaned_text not in signal.representative_messages and len(signal.representative_messages) < MAX_REPRESENTATIVE_MESSAGES:
            signal.representative_messages.append(cleaned_text)
        signal.last_seen_at = message.timestamp
        signal.updated_at = datetime.utcnow()
        if signal.state == SignalState.NOISE and signal.unique_support >= MIN_UNIQUE_USERS_FOR_VISIBILITY:
            signal.state = SignalState.EMERGING
        return EngineResult(message, MessageOutcome.ATTACHED_TO_EXISTING, signal, score, previous_state != signal.state, previous_state)

    def _create_signal(self, message: NormalizedMessage, cleaned_text: str, vector: np.ndarray, category: str) -> Signal:
        signal = Signal(id=generate_signal_id(), stream_id=self.stream_id, label=self._generate_label(message.text),
                        centroid=vector.copy(), category=category, message_ids=[message.message_id],
                        unique_participant_ids={message.participant_id}, representative_messages=[message.text.strip()],
                        first_seen_at=message.timestamp, last_seen_at=message.timestamp, 
                        participant_join_times={message.participant_id: message.timestamp}, state=SignalState.NOISE)
        self.signals[signal.id] = signal
        return signal

    def _generate_label(self, raw_text: str) -> str:
        words = raw_text.split()[:5]
        return " ".join(words).strip().title() if words else "Untitled Signal"

    def get_active_signals(self, include_noise: bool = False) -> list[Signal]:
        signals = list(self.signals.values())
        return signals if include_noise else [s for s in signals if s.state != SignalState.NOISE]

    def get_signal(self, signal_id: str) -> Optional[Signal]:
        return self.signals.get(signal_id)
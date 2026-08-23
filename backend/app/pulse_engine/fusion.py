"""
PULSE — Signal Fusion Engine (Universal Cross-Lingual Precision + Toxic Shields)
"""

from datetime import datetime
from typing import Optional, Set
import numpy as np

from app.pulse_engine.domain import (
    NormalizedMessage,
    Signal,
    SignalState,
    EngineResult,
    MessageOutcome,
    generate_signal_id,
)
from app.pulse_engine.similarity import hybrid_similarity, SimilarityResult, has_negation
from app.pulse_engine.category_classifier import get_classifier

SIMILARITY_THRESHOLD = 0.28
MIN_UNIQUE_USERS_FOR_VISIBILITY = 2
MAX_REPRESENTATIVE_MESSAGES = 5

POSITIVE_TRAPS = {
    "fine", "mast", "perfectly", "clear", "good", "sahi", "badhiya", "excellent", 
    "working", "lajawab", "perfecto", "excelente", "bueno", "parfait", "très bien",
    "no problem", "ningun problema", "op", "bawal", "gazab", "lallantop", "zeher", "poggers"
}

TOXIC_TRAPS = {
    "bc", "mc", "chutiya", "chutiye", "lodu", "lund", "kutta", "kaminey", "saale", 
    "harami", "randi", "bhadwe", "wtf", "stfu", "shit", "trash", "cringe"
}

# 🔥 STRICT SUBJECT-MATTER ISOLATION DOMAINS (Expanded with Devanagari Hindi support)
TOPIC_CLOSURE = {"closure", "closures", "क्लोजर"}
TOPIC_RECURSION = {"recursion", "recursive", "rekursion", "factorial", "loop", "base case", "rekursi", "रिकर्शन", "फैक्टोरियल"}
TOPIC_BINARY = {"binary", "binari", "बाइनरी"}
TOPIC_GIT = {"git", "clone", "repo", "github", "commit", "branch"}
TOPIC_BANK = {"bank", "ifsc", "money", "cash"}
TOPIC_AUDIO = {"audio", "awaz", "aawaz", "awaaz", "sound", "voice", "hear", "mic", "oído", "son", "音声", "الصوت", "звук", "आवाज", "आवाज़", "सुन"}
TOPIC_VIDEO = {"video", "buffering", "buffer", "lag", "freeze", "frozen", "screen", "dikh", "stuck", "卡顿", "冻结", "画面", "traba", "lague", "gayab", "वीडियो", "स्क्रीन", "लैग", "लैक", "दिख"}
TOPIC_GREETINGS = {"first comment", "pehla comment", "hi", "hello", "priya", "namaste", "ig id", "instagram"}


def get_primary_topic(text: str) -> Optional[str]:
    """Extract the single primary active topic of a message for strict mapping."""
    text_lower = text.lower()
    
    # Priority order — specific programming topics are checked first
    if any(w in text_lower for w in TOPIC_CLOSURE): return "closure"
    if any(w in text_lower for w in TOPIC_RECURSION): return "recursion"
    if any(w in text_lower for w in TOPIC_BINARY): return "binary"
    if any(w in text_lower for w in TOPIC_GIT): return "git"
    if any(w in text_lower for w in TOPIC_BANK): return "bank"
    
    # Check if audio/video has active complaints
    has_audio = any(w in text_lower for w in TOPIC_AUDIO)
    has_video = any(w in text_lower for w in TOPIC_VIDEO)
    
    if has_audio and has_video:
        if "but" in text_lower or "par" in text_lower:
            return "video"
        return "audio"
        
    if has_audio: return "audio"
    if has_video: return "video"
    if any(w in text_lower for w in TOPIC_GREETINGS): return "greetings"
    return None


class FusionEngine:
    def __init__(self, stream_id: str):
        self.stream_id = stream_id
        self.signals: dict[str, Signal] = {}
        self.classifier = get_classifier()

    def process(
        self,
        message: NormalizedMessage,
        cleaned_text: str,
        vector: np.ndarray,
    ) -> EngineResult:
        if not self.signals:
            signal = self._create_signal(message, cleaned_text, vector)
            return EngineResult(
                message=message,
                outcome=MessageOutcome.CREATED_NEW_SIGNAL,
                signal=signal,
                similarity_score=None,
            )

        # 🔥 FIX: Use classify_text for incoming messages to ensure ultra-precise category matching
        msg_category = self.classifier.classify_text(cleaned_text).category.value

        best_signal, best_score, best_details = self._find_best_match(
            cleaned_text, vector, msg_category
        )

        if best_score >= SIMILARITY_THRESHOLD:
            previous_state = best_signal.state
            self._attach_to_signal(best_signal, message, cleaned_text, vector)
            state_changed = previous_state != best_signal.state
            return EngineResult(
                message=message,
                outcome=MessageOutcome.ATTACHED_TO_EXISTING,
                signal=best_signal,
                similarity_score=best_score,
                state_changed=state_changed,
                previous_state=previous_state if state_changed else None,
            )
        else:
            signal = self._create_signal(message, cleaned_text, vector, msg_category)
            return EngineResult(
                message=message,
                outcome=MessageOutcome.CREATED_NEW_SIGNAL,
                signal=signal,
                similarity_score=best_score,
            )

    def get_active_signals(self, include_noise: bool = False) -> list[Signal]:
        signals = list(self.signals.values())
        if not include_noise:
            signals = [s for s in signals if s.state != SignalState.NOISE]
        return signals

    def get_signal(self, signal_id: str) -> Optional[Signal]:
        return self.signals.get(signal_id)

    def _find_best_match(
        self,
        cleaned_text: str,
        vector: np.ndarray,
        msg_category: str
    ) -> tuple[Optional[Signal], float, Optional[SimilarityResult]]:
        best_signal = None
        best_score = 0.0
        best_result = None

        text_lower = cleaned_text.lower()
        msg_topic = get_primary_topic(cleaned_text)

        has_pos_trap_incoming = any(word in text_lower for word in POSITIVE_TRAPS)
        has_toxic_trap_incoming = any(word in text_lower for word in TOXIC_TRAPS)

        for signal in self.signals.values():
            # --- 🔥 1. HARD CATEGORY POLARITY BARRIER ---
            is_msg_positive = msg_category in ["feedback", "engagement"]
            is_sig_positive = signal.category in ["feedback", "engagement"]
            is_msg_negative = msg_category in ["technical_issue", "doubt", "content_request"]
            is_sig_negative = signal.category in ["technical_issue", "doubt", "content_request"]

            if (is_msg_positive and is_sig_negative) or (is_msg_negative and is_sig_positive):
                continue  

            # --- 🔥 2. SYMMETRIC TOPIC ISOLATION WALLS ---
            sig_topic = get_primary_topic(signal.label)
            if not sig_topic and len(signal.representative_messages) > 0:
                sig_topic = get_primary_topic(signal.representative_messages[0])

            # If either message or signal has a specific topic, they MUST match exactly to merge!
            if (msg_topic or sig_topic) and msg_topic != sig_topic:
                continue

            candidates = [signal.label] + list(signal.representative_messages)
            
            sig_best_score = 0.0
            sig_best_result = None

            for anchor_text in candidates:
                anchor_lower = anchor_text.lower()
                result = hybrid_similarity(
                    text_a=cleaned_text,
                    text_b=anchor_lower,
                    vec_a=vector,
                    vec_b=signal.centroid,
                )
                
                final_score = result.hybrid_score
                has_pos_trap_signal = any(word in anchor_lower for word in POSITIVE_TRAPS)

                # Praise vs Tech Issue boundary
                if (has_pos_trap_incoming or has_pos_trap_signal) and (
                    signal.category in ["technical_issue", "content_request"] or msg_category in ["technical_issue", "content_request"]
                ):
                    final_score = 0.0  

                # Toxic boundary
                if has_toxic_trap_incoming:
                    final_score = 0.0

                # Category Mismatch Penalty
                if signal.category != msg_category and msg_category != "unclassified":
                    if final_score < 0.60:
                        final_score -= 0.15

                # Category Match Boost
                if signal.category == msg_category and msg_category != "unclassified":
                    if final_score >= 0.35:  
                        final_score = min(1.0, final_score + 0.06)

                if final_score > sig_best_score:
                    sig_best_score = final_score
                    sig_best_result = result

            if sig_best_score > best_score:
                best_score = sig_best_score
                best_signal = signal
                best_result = sig_best_result

        return best_signal, best_score, best_result

    def _create_signal(
        self,
        message: NormalizedMessage,
        cleaned_text: str,
        vector: np.ndarray,
        pre_category: str = None
    ) -> Signal:
        signal = Signal(
            id=generate_signal_id(),
            stream_id=self.stream_id,
            label=self._generate_label(cleaned_text),
            centroid=vector.copy(),
            category=pre_category,
            message_ids=[message.message_id],
            unique_participant_ids={message.participant_id},
            representative_messages=[cleaned_text],
            first_seen_at=message.timestamp,
            last_seen_at=message.timestamp,
            participant_join_times={message.participant_id: message.timestamp},
            state=SignalState.NOISE,
        )
        self.signals[signal.id] = signal
        return signal

    def _attach_to_signal(
        self,
        signal: Signal,
        message: NormalizedMessage,
        cleaned_text: str,
        vector: np.ndarray,
    ) -> None:
        signal.message_ids.append(message.message_id)
        signal.unique_participant_ids.add(message.participant_id)

        if message.participant_id not in signal.participant_join_times:
            signal.participant_join_times[message.participant_id] = message.timestamp

        n = len(signal.message_ids) - 1
        signal.centroid = (signal.centroid * n + vector) / (n + 1)

        norm = np.linalg.norm(signal.centroid)
        if norm > 0:
            signal.centroid = signal.centroid / norm

        self._maybe_add_representative(signal, cleaned_text, vector)

        signal.last_seen_at = message.timestamp
        signal.updated_at = datetime.utcnow()

        req_users = 3 if signal.category == "unclassified" else MIN_UNIQUE_USERS_FOR_VISIBILITY

        if (
            signal.state == SignalState.NOISE
            and signal.unique_support >= req_users
        ):
            signal.state = SignalState.EMERGING

    def _maybe_add_representative(
        self,
        signal: Signal,
        cleaned_text: str,
        vector: np.ndarray,
    ) -> None:
        if cleaned_text in signal.representative_messages:
            return

        if len(signal.representative_messages) < MAX_REPRESENTATIVE_MESSAGES:
            signal.representative_messages.append(cleaned_text)

    def _generate_label(self, cleaned_text: str) -> str:
        words = cleaned_text.split()[:6]
        label = " ".join(words).strip()
        if len(label) > 50:
            label = label[:47] + "..."
        return label.title() if label else "Untitled Signal"
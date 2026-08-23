"""
PULSE — Similarity Engine (High Precision + Slang Support + Polarity Check)
"""

import re
from dataclasses import dataclass
import numpy as np

SEMANTIC_WEIGHT = 0.75
LEXICAL_WEIGHT = 0.25
STRONG_SEMANTIC_THRESHOLD = 0.60

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "can", "shall",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
    "them", "my", "your", "his", "its", "our", "their",
    "this", "that", "these", "those", "and", "or", "but", "if", "then",
    "so", "as", "at", "by", "for", "from", "in", "into", "of", "on", "to",
    "with", "not", "no", "yes",
    "what", "how", "when", "where", "who", "which", "why", 
    "hai", "hain", "tha", "thi", "the", "ka", "ki", "ke", "ko", "se",
    "me", "mein", "par", "pe", "kya", "kyu", "kaise", "kab", "kaun",
    "bhi", "hi", "to", "toh", "ye", "vo", "wo", "ab", "aap", "tum",
    "mai", "main", "hum", "ham",
    "sir", "bhai", "bhaiya", "didi", "guru", "bro", "brother",
    "hello", "hey", "namaste",
}

# 🔥 STRICT NEGATION DETECTOR WORDS
NEGATION_WORDS = {
    "not", "no", "cant", "can't", "dont", "don't", "wont", "won't", "neither", "nor", "never",
    "nahi", "nhi", "ni", "nai", "nahin", "different", "opposite", "ghanta"
}


@dataclass
class SimilarityResult:
    semantic_score: float
    lexical_score: float
    hybrid_score: float
    shared_tokens: list[str]


def stem_token(word: str) -> str:
    w = word.lower().rstrip('s').rstrip('n').rstrip('e')
    return w[:6] if len(w) >= 6 else w


def tokenize(text: str) -> set[str]:
    words = re.findall(r'\b\w+\b', text.lower())
    return {
        w for w in words
        if len(w) >= 3 and w not in STOPWORDS
    }


def has_negation(text: str) -> bool:
    """Check if the text contains any negation terms."""
    words = set(re.findall(r'\b\w+\b', text.lower()))
    return len(words & NEGATION_WORDS) > 0


def lexical_similarity(text_a: str, text_b: str) -> tuple[float, list[str]]:
    tokens_a = tokenize(text_a)
    tokens_b = tokenize(text_b)

    if not tokens_a or not tokens_b:
        return 0.0, []

    shared = tokens_a & tokens_b

    stemmed_a = {stem_token(w): w for w in tokens_a}
    stemmed_b = {stem_token(w): w for w in tokens_b}

    stemmed_shared = set(stemmed_a.keys()) & set(stemmed_b.keys())
    for st in stemmed_shared:
        shared.add(stemmed_a[st])

    union = tokens_a | tokens_b
    if not union:
        return 0.0, []

    score = len(shared) / max(len(tokens_a), len(tokens_b))
    return score, sorted(shared)


def semantic_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    return float(np.dot(vec_a, vec_b))


def hybrid_similarity(
    text_a: str,
    text_b: str,
    vec_a: np.ndarray,
    vec_b: np.ndarray,
) -> SimilarityResult:
    sem_score = semantic_similarity(vec_a, vec_b)
    lex_score, shared = lexical_similarity(text_a, text_b)

    sem_clipped = max(0.0, sem_score)

    # 🔥 NEGATION GUARDRAILS (Strict polarity check)
    # If one text has negation and the other does not, they cannot be highly similar!
    if has_negation(text_a) != has_negation(text_b):
        sem_clipped = min(sem_clipped, 0.20)
        lex_score = 0.0
        hybrid = (SEMANTIC_WEIGHT * sem_clipped)
        return SimilarityResult(
            semantic_score=sem_score,
            lexical_score=0.0,
            hybrid_score=hybrid,
            shared_tokens=[]
        )

    if lex_score == 0.0:
        hybrid = sem_clipped
    elif sem_clipped >= STRONG_SEMANTIC_THRESHOLD:
        hybrid = sem_clipped
    else:
        hybrid = (SEMANTIC_WEIGHT * sem_clipped) + (LEXICAL_WEIGHT * lex_score)
        if lex_score > 0:
            hybrid = min(1.0, hybrid + 0.08)

    return SimilarityResult(
        semantic_score=sem_score,
        lexical_score=lex_score,
        hybrid_score=hybrid,
        shared_tokens=shared,
    )
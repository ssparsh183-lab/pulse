# backend/app/pulse_engine/similarity.py

import re
from dataclasses import dataclass
import numpy as np

SEMANTIC_WEIGHT = 0.70
LEXICAL_WEIGHT = 0.30

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
    "hello", "hey", "namaste", "please", "plz", "anyone", "else"
}

GENERIC_INTENT_WORDS = {
    "explain", "doubt", "samajh", "karo", "batao", "bataiye", "help", 
    "issue", "problem", "kaise", "what", "how", "why", "kya", "question",
    "concept", "clear", "nahi", "aaya", "kuch", "wala", "example", "dubara", "phirse"
}

@dataclass
class SimilarityResult:
    semantic_score: float
    lexical_score: float
    hybrid_score: float
    shared_tokens: list[str]

def tokenize(text: str) -> set[str]:
    words = re.findall(r'\b\w+\b', text.lower())
    return {w for w in words if len(w) >= 3 and w not in STOPWORDS}

def extract_core_subjects(text: str) -> set[str]:
    if not text or not isinstance(text, str):
        return set()
    words = re.findall(r'\b\w+\b', text.lower())
    return {w for w in words if len(w) >= 3 and w not in STOPWORDS and w not in GENERIC_INTENT_WORDS}

def lexical_similarity(text_a: str, text_b: str) -> tuple[float, list[str]]:
    tokens_a = tokenize(text_a)
    tokens_b = tokenize(text_b)
    if not tokens_a or not tokens_b:
        return 0.0, []

    shared = tokens_a & tokens_b
    score = len(shared) / max(len(tokens_a), len(tokens_b))
    return score, sorted(shared)

def semantic_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    # Native numpy .item() conversion (Zero collision!)
    return np.dot(vec_a, vec_b).item()

def hybrid_similarity(
    text_a: str,
    text_b: str,
    vec_a: np.ndarray,
    vec_b: np.ndarray,
) -> SimilarityResult:
    sem_score = max(0.0, semantic_similarity(vec_a, vec_b))
    lex_score, shared = lexical_similarity(text_a, text_b)

    sub_a = extract_core_subjects(text_a)
    sub_b = extract_core_subjects(text_b)

    # 🎯 SMART SUBJECT PENALTY (Instead of a rigid hard-block)
    # Agar LaBSE semantic similarity strong hai (>= 0.65), toh vishwas karo.
    # Agar weak hai (< 0.65) aur subjects match nahi ho rahe, tab penalty do!
    subject_penalty = 0.0
    if sem_score < 0.65 and sub_a and sub_b and len(sub_a & sub_b) == 0:
        subject_penalty = 0.35  # Push score down so different topics don't merge

    if lex_score > 0:
        hybrid = (SEMANTIC_WEIGHT * sem_score) + (LEXICAL_WEIGHT * lex_score) + 0.10 - subject_penalty
    else:
        hybrid = sem_score - subject_penalty

    return SimilarityResult(
        semantic_score=sem_score,
        lexical_score=lex_score,
        hybrid_score=max(0.0, min(1.0, hybrid)),
        shared_tokens=shared,
    )
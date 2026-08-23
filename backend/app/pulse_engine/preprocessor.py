"""
PULSE — Preprocessor (Universal 109-Language Unicode Support)

Cleans raw chat text into a normalized form suitable for embedding.
Supports all global scripts (CJK, Arabic, Devanagari, Cyrillic, Latin)
while stripping non-printable noise, URLs, and pure emoji/punctuation.
"""

import re
import unicodedata
from app.pulse_engine.hinglish_hints import inject_hints
from dataclasses import dataclass


@dataclass
class PreprocessResult:
    original: str
    cleaned: str
    is_valid: bool
    reason: str = ""


_URL_PATTERN = re.compile(r'https?://\S+|www\.\S+')
_MENTION_PATTERN = re.compile(r'@\w+')
_REPEATED_PUNCT = re.compile(r'([!?.,])\1+')
_MULTIPLE_SPACES = re.compile(r'\s+')
_NON_PRINTABLE = re.compile(r'[\x00-\x1f\x7f-\x9f]')

MIN_MEANINGFUL_LENGTH = 2


def collapse_repeated_letters(text: str) -> str:
    """
    Collapses trailing and internal typos like 'recursionn' -> 'recursion',
    'audiooo' -> 'audio', 'awazzz' -> 'awaz', 'helppp' -> 'help'.
    """
    words = text.split()
    cleaned_words = []
    for w in words:
        if len(w) > 3:
            w = re.sub(r'([a-zA-Z])\1+$', r'\1', w)
            w = re.sub(r'([a-zA-Z])\1{2,}', r'\1', w)
        cleaned_words.append(w)
    return " ".join(cleaned_words)


def preprocess(text: str) -> PreprocessResult:
    original = text

    if text is None or not isinstance(text, str):
        return PreprocessResult(
            original=str(original), cleaned="", is_valid=False, reason="not_a_string"
        )

    # Unicode normalization (NFKC handles CJK, Arabic, Devanagari accents seamlessly)
    text = unicodedata.normalize("NFKC", text)
    text = _NON_PRINTABLE.sub(" ", text)
    text = _URL_PATTERN.sub(" ", text)
    text = _MENTION_PATTERN.sub(" ", text)
    text = text.lower()

    # Smart typo collapse for Latin/Hinglish
    text = collapse_repeated_letters(text)

    text = _REPEATED_PUNCT.sub(r"\1", text)
    text = _MULTIPLE_SPACES.sub(" ", text).strip()
    text = inject_hints(text)

    if len(text) == 0:
        return PreprocessResult(
            original=original, cleaned="", is_valid=False, reason="empty_after_cleaning"
        )

    if len(text) < MIN_MEANINGFUL_LENGTH:
        return PreprocessResult(
            original=original, cleaned=text, is_valid=False, reason="too_short"
        )

    # Universal Unicode Alphanumeric Check:
    # Allows letters/numbers from ALL 109 global languages (Hanzi, Kana, Arabic, Cyrillic, Latin, etc.)
    # Drop ONLY if text contains 0 letters/numbers (e.g. pure emojis '🔥🔥🔥' or pure punctuation '!!!!')
    if not any(c.isalnum() for c in text):
        return PreprocessResult(
            original=original, cleaned=text, is_valid=False, reason="no_alphanumeric"
        )

    return PreprocessResult(original=original, cleaned=text, is_valid=True)
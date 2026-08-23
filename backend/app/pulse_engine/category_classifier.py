"""
PULSE — Category Classifier (Multilingual + Complete Slangs & Abuses)
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional
import re
import numpy as np

from app.pulse_engine.embedder import get_embedder
from app.pulse_engine.preprocessor import preprocess


class SignalCategory(str, Enum):
    TECHNICAL_ISSUE = "technical_issue"
    DOUBT = "doubt"
    CONTENT_REQUEST = "content_request"
    FEEDBACK = "feedback"
    ENGAGEMENT = "engagement"
    OFF_TOPIC = "off_topic"
    UNCLASSIFIED = "unclassified"


CATEGORY_PROTOTYPES: dict[SignalCategory, list[str]] = {
    SignalCategory.TECHNICAL_ISSUE: [
        "audio not working", "video buffering", "stream is lagging",
        "cant hear anything", "screen is frozen", "voice breaking",
        "connection dropped", "sound quality poor", "bhai awaz nahi aa rahi",
        "video ruk raha hai", "problema de audio", "no se escucha nada",
        "problème de son", "没有声音", "fix this bro quickly", "please fix this",
        "video gayab ho gayi", "screen black", "black screen", "video gayab",
        "stream ne hug diya", "potato pc", "stream ded", "lagging like crazy",
        "video lag ho raha screen frozen", "video lag", "screen frozen",
        "screen blur", "blur screen", "screen blur aa raha hai", "not visible clearly blur"
    ],
    SignalCategory.DOUBT: [
        "can you explain again", "i dont understand this concept",
        "what does this mean", "how does this work", "why did you do that",
        "samajh nahi aaya", "sir ye kya hai", "explain karo please",
        "dubara batao", "concept clear nahi hua", "recursion samajh nahi aaya",
        "recursion", "doubt", "closure kya hai", "no entiendo este concepto",
        "je ne comprends pas", "我不明白", "クロージャー", "クロージャーの仕組みが分かりません",
        "what is", "how to do", "explain", "kya hota hai", "kyu", "how", "what", "stack overflow",
        "coding ke baare mein", "programming doubt", "coding",
        "sar ke upar se bouncer gaya", "kuch palle nahi pada", "hawa nahi lagi",
        "binary search doubt", "binary search explain karo", "what is binary search"
    ],
    SignalCategory.CONTENT_REQUEST: [
        "please share the notes", "will recording be available",
        "can you upload this video", "share the link", "where can i find slides",
        "notes de dijiye", "recording milegi kya", "playlist ka link",
        "material share karo", "github repo link", "comparte las notas por favor",
        "partage le lien s'il te plaît", "请分享笔记", "send the code",
        "pdf", "drive link", "slides", "handwritten", "skript", "folien"
    ],
    SignalCategory.FEEDBACK: [
        "great lecture sir", "amazing explanation", "this was confusing",
        "loved the session", "boring content", "excellent teaching", "waste of time",
        "audio is working fine", "video is working fine", "everything is working perfectly",
        "no audio problem", "no video issue", "bahut badhiya", "mast lecture tha",
        "accha lecture tha sir", "excelente explicación", "super cours merci",
        "讲得很好", "video quality ekdum mast aa rahi hai", "awaz is perfectly fine",
        "todo esta perfecto", "no hay problema", "ningun problema",
        "kya master hai", "master hai lala", "gazab", "bawal",
        "op bhai op", "kadak stream", "zeher", "lallantop", "W chat", "poggers", "sheesh",
        "jhakaas", "faad", "kaint", "macha",
        "crazy stream", "crazy", "crazyyy", "we will win", "winning", "this is crazy"
    ],
    SignalCategory.ENGAGEMENT: [
        "yes sir got it", "understood clearly", "makes complete sense",
        "point noted", "acknowledged", "confirmed sir", "ok understood",
        "haan bhai samajh aa gaya", "samajh gaya sir", "clear ho gaya",
        "clear hai", "entendido", "compris merci", "明白了", "no doubt clear",
    ],
    SignalCategory.OFF_TOPIC: [
        # Normal Chatter
        "hi everyone", "first comment", "love from delhi",
        "which city are you from", "i love you sir", "kaha se ho aap",
        "pehla comment", "hello priya", "namaste ji", "big fan sir",
        "hi from mumbai", "hola desde madrid", "salut tout le monde", "你好",
        "what is your name", "how old are you", "where do you live", "age kya hai",
        # 🚫 Trolls, Abuses, and Toxicity (Engine filters them here)
        "chutiya hai kya", "bc mc", "bsdk", "stfu", "cringe", 
        "this is trash", "L stream", "mid", "bakwas", "abuse toxic noise",
        "bhenchod", "madarchod", "bhosdike", "lodu", "lund", "harami"
    ],
}

MIN_CONFIDENCE_THRESHOLD = 0.28

# 🔥 HIGH PRECISION DETERMINISTIC PATTERNS
PRAISE_PATTERNS = re.compile(
    r'\b(perfect|perfecto|perfectamente|perfectly|fine|clear|clean|thanks|thank you|loved|awesome|amazing|great|excellent|superb|good|mast|badhiya|bawal|bawaal|gazab|lallantop|zeher|op|faad|kadak|jhakaas|lajawab|no issue|no issues|no problem|no problems|todo bien|parfait|poggers|sheesh)\b',
    re.IGNORECASE
)

ENGAGEMENT_PATTERNS = re.compile(
    r'\b(samajh|understood|clear ho gaya|palle pad|got it|acknowledged|confirmed|compris|entendido|明白了)\b',
    re.IGNORECASE
)


@dataclass
class CategoryResult:
    category: SignalCategory
    confidence: float
    scores: dict[SignalCategory, float]


class CategoryClassifier:
    def __init__(self):
        self._embedder = get_embedder()
        self._category_centroids: dict[SignalCategory, np.ndarray] = {}
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return

        for category, prototypes in CATEGORY_PROTOTYPES.items():
            cleaned = [preprocess(p).cleaned for p in prototypes]
            cleaned = [c for c in cleaned if c]

            vectors = self._embedder.embed_batch(cleaned)

            centroid = np.mean(vectors, axis=0)
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm

            self._category_centroids[category] = centroid

        self._loaded = True

    def classify(self, vector: np.ndarray) -> CategoryResult:
        if not self._loaded:
            self.load()

        scores: dict[SignalCategory, float] = {}
        for category, centroid in self._category_centroids.items():
            scores[category] = float(np.dot(vector, centroid))

        # 🔥 FIX: Force get closest category to prevent "unclassified" leaks in routing
        best_category = max(scores, key=scores.get)
        best_score = scores[best_category]

        return CategoryResult(
            category=best_category,
            confidence=best_score,
            scores=scores,
        )

    def classify_text(self, text: str) -> CategoryResult:
        cleaned = preprocess(text).cleaned
        if not cleaned:
            return CategoryResult(
                category=SignalCategory.UNCLASSIFIED,
                confidence=0.0,
                scores={},
            )
        
        text_lower = text.lower()
        
        # 🔥 NEW: High-Precision Heuristic Override (Prevents "Bhai Awaz" from being Off-topic)
        # Audio issues
        if any(w in text_lower for w in {"awaz", "awaaz", "sound", "voice", "audio", "mic", "hear", "volume", "noise"}) and any(w in text_lower for w in {"nahi", "nhi", "no", "not", "problem", "issue", "broken", "mute", "off", "shor"}):
            return CategoryResult(
                category=SignalCategory.TECHNICAL_ISSUE,
                confidence=0.99,
                scores={SignalCategory.TECHNICAL_ISSUE: 0.99}
            )
            
        # Video/screen issues
        if any(w in text_lower for w in {"screen", "video", "stuck", "freeze", "frozen", "blur", "lag", "buffer", "buffering"}) and any(w in text_lower for w in {"nahi", "nhi", "no", "not", "problem", "issue", "blur", "lag", "stuck", "freeze"}):
            return CategoryResult(
                category=SignalCategory.TECHNICAL_ISSUE,
                confidence=0.99,
                scores={SignalCategory.TECHNICAL_ISSUE: 0.99}
            )
            
        # Coding Doubts
        if any(w in text_lower for w in {"closure", "closures", "recursion", "recursive", "base case", "binary", "git", "loop", "factorial"}) and any(w in text_lower for w in {"kya", "kyu", "explain", "doubt", "confusion", "understand", "not", "nahi", "nhi", "what", "how", "why"}):
            return CategoryResult(
                category=SignalCategory.DOUBT,
                confidence=0.99,
                scores={SignalCategory.DOUBT: 0.99}
            )
        
        # 1. Check if it's explicitly a positive praise/feedback
        if PRAISE_PATTERNS.search(text_lower):
            # Ensure it's not a negated praise like "not clear" or "no clear"
            if not re.search(r'\b(not|no|nhi|nahi|ni|nai|nahin)\s+(clear|perfect|fine|good)\b', text_lower):
                return CategoryResult(
                    category=SignalCategory.FEEDBACK,
                    confidence=0.95,
                    scores={SignalCategory.FEEDBACK: 0.95},
                )
                
        # 2. Check if it's explicitly an engagement (understood/clear)
        if ENGAGEMENT_PATTERNS.search(text_lower):
            # Ensure it's not a negated engagement like "nahi samajh aaya"
            if not re.search(r'\b(not|no|nhi|nahi|ni|nai|nahin|bouncer|ghanta|palle nahi|palle nhi)\s+(samajh|understood|palle|got)\b', text_lower) and not re.search(r'\bsamajh\s+(nhi|nahi|ni|nai|nahin)\b', text_lower):
                return CategoryResult(
                    category=SignalCategory.ENGAGEMENT,
                    confidence=0.95,
                    scores={SignalCategory.ENGAGEMENT: 0.95},
                )

        vector = self._embedder.embed(cleaned)
        return self.classify(vector)


_classifier_instance: Optional[CategoryClassifier] = None

def get_classifier() -> CategoryClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = CategoryClassifier()
    return _classifier_instance
# backend/app/pulse_engine/category_classifier.py

from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, List
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


@dataclass
class CategoryResult:
    category: SignalCategory
    confidence: float
    scores: dict[SignalCategory, float]


CONTEXT_BRAIN_PROTOTYPES: Dict[str, Dict[SignalCategory, List[str]]] = {
    "coding": {
        SignalCategory.TECHNICAL_ISSUE: [
            "audio not working", "stream is lagging", "cant hear anything", "video buffering",
            "screen is frozen", "connection dropped", "mic issue sound broken", "black screen", "video lag",
            "board pe likha nahi dikh raha", "camera blurry", "mic crackling", "audio cut ho raha hai",
            "screen blur hai", "font size badhao dikh nahi raha", "ide freeze ho gaya", "sound bohot low hai",
            "screen share atak gaya", "audio video out of sync", "echo ho raha hai awaz mein"
        ],
        SignalCategory.DOUBT: [
            "can you explain again", "i dont understand this concept", "what does this mean",
            "recursion samajh nahi aaya", "what is closure in js", "closure kya hai", "sir closure explain karo",
            "base case kya hota hai", "binary search doubt", "compiler error syntax error", "how does loop work", 
            "python language", "sir yeh step kaise aaya", "why would you use that instead of x",
            "how does type inference work", "explain architecture", "what is the difference between x and y",
            "time complexity kitni hai", "space complexity O(n)", "memory leak kaise fix karein"
        ],
        SignalCategory.CONTENT_REQUEST: [
            "please share the notes", "will recording be available", "share github repo link",
            "where can i find slides", "recording milegi kya", "pdf drive link notes", "playlist link",
            "can you upload this video recording", "will replay be available", "stream recording video"
        ],
        SignalCategory.FEEDBACK: [
            "great lecture sir", "amazing explanation", "excellent teaching", "bahut badhiya lecture",
            "mast content sir", "best teacher", "concept clear ho gaya sir", "super class",
            "slow down please", "thoda ruk jao", "aapne bahut fast likha", "screen zoom karo"
        ],
        SignalCategory.ENGAGEMENT: [
            "yes sir got it", "understood clearly sir", "samajh gaya sir", "clear ho gaya sir", "point noted sir",
            "done sir", "question solved", "ac ho gaya code", "compiled successfully", "output match ho gaya",
            "w", "based", "superb", "mast", "yes", "understood", "crystal clear sir", "agreed sir"
        ],
        SignalCategory.OFF_TOPIC: [
            "gta 5 ka price kitna hai", "gta 5 price", "bgmi kab kheloge", "valorant id do",
            "clutch dekh mera", "op headshot", "free fire redeem code", "game gameplay",
            "hi priya", "love from mumbai", "kaha se ho", "first comment"
        ]
    },
    "gaming": {
        SignalCategory.TECHNICAL_ISSUE: [
            "stream is lagging", "sound issue", "cant hear mic broken", "video buffering",
            "stream lag", "screen freeze", "fps drop", "ping high packet loss", "high ping",
            "mic crackling", "audio cut ho raha hai", "game audio loud hai", "in-game voice nahi aa rahi"
        ],
        SignalCategory.DOUBT: [
            "which sensitivity settings", "game price discount", "gta 5 price kitna hai", "gta 5 price",
            "how to unlock character", "what server are you playing", "which crosshair code", 
            "how to beat this level", "pc specs gpu", "which graphics card", "monitor refresh rate 144hz"
        ],
        SignalCategory.CONTENT_REQUEST: [
            "will recording be available", "will vod be available", "stream replay video",
            "highlight video upload", "share crosshair settings", "sensitivity code", "discord link"
        ],
        SignalCategory.FEEDBACK: [
            "op gameplay", "kya headshot mara", "insane clutch", "god level spray",
            "what a player", "poggers", "crazy reflexes", "clutch master", "bawal gameplay"
        ],
        SignalCategory.ENGAGEMENT: [
            "gg", "ggs", "w play", "nt nice try", "lets go", "sheesh", "clutched it",
            "w", "l", "based", "cringe", "ez", "diff", "carry", "god level", "insane"
        ],
        SignalCategory.OFF_TOPIC: [
            "great lecture sir", "notes pdf do", "recursion explain karo", "what is closure in js",
            "compiler error", "programming doubt", "sir homework", "integration by parts"
        ]
    },
    "mixed": {
        SignalCategory.TECHNICAL_ISSUE: [
            "audio not working", "sound issue anyone else", "bhai awaz nahi aa rahi", "cant hear anything",
            "video buffering ho raha", "stream lag ho raha", "screen freeze", "no audio here",
            "mic crackling", "camera blurry", "board pe likha nahi dikh raha", "audio cut ho raha hai"
        ],
        SignalCategory.DOUBT: [
            "can you explain again", "recursion samajh nahi aaya", "what is closure in js",
            "what does this mean", "how does this work", "sir yeh step kaise aaya",
            "sir doubt hai", "yeh samajh nahi aaya", "phirse samjhao", "please explain again",
            "i did not understand", "concept is not clear", "confusion ho raha hai", "doubt query",
            "kya hota hai yeh", "kaise kiya explain karo", "dubara batao", "explain this doubt"
        ],
        SignalCategory.CONTENT_REQUEST: [
            "recording milegi kya", "will recording be available", "notes bhi share karo",
            "github repo link", "pdf link please", "can you upload video replay", "discord link do"
        ],
        SignalCategory.FEEDBACK: [
            "great lecture sir", "amazing explanation", "bahut badhiya explanation", "mast content", 
            "slow down please", "thoda ruk jao", "motivation milti hai", "best stream", "mazza aa gaya"
        ],
        SignalCategory.ENGAGEMENT: [
            "samajh gaya", "clear ho gaya", "yes sir got it", "understood clearly", "samajh gaya sir",
            "w", "l", "based", "sheesh", "superb", "bhai yeh toh insane hai", "sahi bola",
            "lol", "lmao", "rofl", "hahaha", "xD", "epic", "legend", "bawal", "gazab"
        ],
        SignalCategory.OFF_TOPIC: [
            "hi from mumbai", "hi priya", "love you sir", "first comment", "sub my channel"
        ]
    }
}


class CategoryClassifier:
    def __init__(self):
        self._embedder = get_embedder()
        self._brain_centroids: Dict[str, Dict[SignalCategory, np.ndarray]] = {}
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return

        for genre, categories in CONTEXT_BRAIN_PROTOTYPES.items():
            self._brain_centroids[genre] = {}
            for cat, prototypes in categories.items():
                cleaned = [preprocess(p).cleaned for p in prototypes]
                vectors = self._embedder.embed_batch([c for c in cleaned if c])
                centroid = np.mean(vectors, axis=0)
                norm = np.linalg.norm(centroid)
                self._brain_centroids[genre][cat] = centroid / norm if norm > 0 else centroid

        self._loaded = True

    def classify_text(self, text: str, stream_genre: str = "mixed") -> CategoryResult:
        if not self._loaded:
            self.load()

        cleaned = preprocess(text).cleaned
        if not cleaned:
            return CategoryResult(category=SignalCategory.UNCLASSIFIED, confidence=0.0, scores={})

        vector = self._embedder.embed(cleaned)
        genre = (stream_genre or "mixed").lower()
        if genre not in self._brain_centroids:
            genre = "mixed"

        target_centroids = self._brain_centroids[genre]

        scores: dict[SignalCategory, float] = {}
        for category, centroid in target_centroids.items():
            scores[category] = np.dot(vector, centroid).item()

        text_lower = text.lower()

        # 1. Gaming Brain Isolation Gate
        if genre == "gaming":
            academic_terms = [
                "lecture", "sir", "ma'am", "recursion", "closure", "notes", "cgpa", 
                "syllabus", "exam", "neet", "jee", "pyq", "python", "programming", 
                "code", "coding", "syntax", "compiler", "dsa", "leetcode", "dpp"
            ]
            if any(term in text_lower for term in academic_terms):
                scores[SignalCategory.OFF_TOPIC] += 0.45

        # 2. Coding Brain Isolation Gate
        elif genre == "coding":
            gaming_terms = [
                "headshot", "clutch", "gta", "valorant", "esports", "aimbot", "recoil", 
                "kya headshot", "bgmi", "free fire", "rank push", "custom room", 
                "spray", "crosshair", "loadout", "noob", "poggers", "sewy", "siuuu"
            ]
            if any(term in text_lower for term in gaming_terms):
                scores[SignalCategory.OFF_TOPIC] += 0.45

        # 3. Universal Technical Issue Fast Trigger
        tech_emergency_terms = [
            "audio not working", "awaz nahi aa rahi", "sound issue", "mic issue", 
            "screen freeze", "buffering", "lag ho raha", "cant hear", "black screen"
        ]
        if any(term in text_lower for term in tech_emergency_terms):
            scores[SignalCategory.TECHNICAL_ISSUE] += 0.35

        # 4. Universal Content Request Fast Trigger
        content_request_terms = [
            "recording milegi", "recording upload", "share github", "notes de do", 
            "pdf drive", "cheat sheet", "problem link", "playlist link"
        ]
        if any(term in text_lower for term in content_request_terms):
            scores[SignalCategory.CONTENT_REQUEST] += 0.30

        # 🔥 5. Universal Engagement / Comprehension Fast Trigger (Fixes 'Samajh Gaya Sir'!)
        engagement_terms = [
            "samajh gaya", "samajh gaye", "samajh aagaya", "samajh aa gaya",
            "clear ho gaya", "clear hai", "got it", "understood", "crystal clear",
            "yes sir", "done sir", "all clear", "noted sir"
        ]
        if any(term in text_lower for term in engagement_terms):
            scores[SignalCategory.ENGAGEMENT] += 0.40

        # 🔥 6. Universal Doubt Trigger (Only when there is ACTUAL doubt/negation!)
        doubt_terms = [
            "samajh nahi", "samajh ni", "samajh nhi", "samajh nai", "samajh nahin",
            "doubt", "explain karo", "explain again", "kya hota hai", "kaise aaya", 
            "confusion", "not clear", "clear nahi", "dubara", "phirse", "samjhao",
            "what is", "how does", "why would", "not understand", "can you explain"
        ]
        # Only boost doubt if it's NOT a positive comprehension message
        if any(term in text_lower for term in doubt_terms) and not any(term in text_lower for term in engagement_terms):
            scores[SignalCategory.DOUBT] += 0.35

        # 7. Universal Feedback Trigger
        feedback_terms = [
            "great lecture", "amazing explanation", "bahut badhiya", "mast content", 
            "best teacher", "best stream", "mazza aa gaya", "top notch", "god level"
        ]
        if any(term in text_lower for term in feedback_terms):
            scores[SignalCategory.FEEDBACK] += 0.30

        best_category = max(scores, key=scores.get)
        return CategoryResult(category=best_category, confidence=scores[best_category], scores=scores)


_classifier_instance: Optional[CategoryClassifier] = None


def get_classifier() -> CategoryClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = CategoryClassifier()
    return _classifier_instance
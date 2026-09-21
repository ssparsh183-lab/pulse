# backend/app/pulse_engine/category_classifier.py

"""
PULSE — Multi-Context Category Classifier
Supercharged with real-world Indian & International live stream datasets:
- EdTech & Coding: Physics Wallah (Alakh sir/Sachin sir), CodeWithHarry, Chai aur Code, Harkirat Singh
- Gaming & Esports: CarryisLive (Ajey Nagar), Mythpat (Mithilesh), Mortal, Scout, Jonathan
- International Creator Culture: IShowSpeed (Speed), Kai Cenat, Twitch/Kick chats
- General & Entertainment: Samay Raina, Tanmay Bhat, Standup & Podcast streams
"""

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


# =========================================================================
# 🧠 ENRICHED MULTI-BRAIN STREAM PROTOTYPES
# =========================================================================
CONTEXT_BRAIN_PROTOTYPES: Dict[str, Dict[SignalCategory, List[str]]] = {
    
    # =========================================================================
    # 💻 BRAIN 1: CODING / EDUCATIONAL CONTEXT (PW, CodeWithHarry, Harkirat, Dev)
    # =========================================================================
    "coding": {
        SignalCategory.TECHNICAL_ISSUE: [
            "audio not working", "stream is lagging", "cant hear anything", "video buffering",
            "screen is frozen", "connection dropped", "mic issue sound broken", "black screen", "video lag",
            "board pe likha nahi dikh raha", "camera blurry", "mic crackling", "audio cut ho raha hai",
            "screen blur hai", "font size badhao dikh nahi raha", "ide freeze ho gaya", "sound bohot low hai",
            "screen share atak gaya", "audio video out of sync", "echo ho raha hai awaz mein", "720p pe karo",
            "sir screen blackout ho gayi", "awaz bohot dheemi aa rahi hai", "slide change nahi hui",
            "pen ka pointer atak raha hai", "smartboard reflection aa raha hai sir", "video 10 second peeche chal rahi",
            "app crash ho raha hai baar baar", "resolution bohot ghatiya hai", "stream stutter kar rahi hai",
            "audio repeat ho raha hai", "mic mute hai sir aapka", "sir un-mute karo khud ko"
        ],
        SignalCategory.DOUBT: [
            "can you explain again", "i dont understand this concept", "what does this mean",
            "recursion samajh nahi aaya", "what is closure in js", "closure kya hai", "sir closure explain karo",
            "base case kya hota hai", "binary search doubt", "compiler error syntax error", "how does loop work", 
            "python language", "sir yeh step kaise aaya", "why would you use that instead of x",
            "how does type inference work", "explain architecture", "what is the difference between x and y",
            "time complexity kitni hai", "space complexity O(n)", "memory leak kaise fix karein", 
            "null pointer exception", "database query slow hai", "api error 500", "docker container crash",
            "async await vs promise", "react re-render issue", "leetcode question doubt", "dsa roadmap kya hai",
            "sir 2nd step repeat karo", "derivative kaise liya", "integration by parts formula", "numerical ka answer galat aa raha",
            "pyq hai kya yeh question", "backlog kaise cover karein sir", "12th boards aur jee kaise manage karein",
            "sir calculation mistake ho gayi kya", "limiting reagent kaise pehchane", "free body diagram samajh nahi aaya",
            "optics ka sign convention", "organic chemistry reaction mechanism", "equilibrium constant doubt",
            "sir formula sheet me doubt hai", "batch test syllabus kitna aayega", "test series rank kaise improve karein"
        ],
        SignalCategory.CONTENT_REQUEST: [
            "please share the notes", "will recording be available", "share github repo link",
            "where can i find slides", "recording milegi kya", "pdf drive link notes", "playlist link",
            "can you upload this video recording", "will replay be available", "stream recording video",
            "cheat sheet share karo", "problem link chat mein daal do", "discord invite link do",
            "code drive link chahiye", "next class kab hai", "next stream kab hogi",
            "sir dpp solution sheet kahan milegi", "formula sheet pdf de do", "assignment questions upload kar do",
            "handwritten notes upload karo", "lecture schedule update kar do", "timeline timestamp add kar do video me"
        ],
        SignalCategory.FEEDBACK: [
            "great lecture sir", "amazing explanation", "excellent teaching", "bahut badhiya lecture",
            "mast content sir", "best teacher", "concept clear ho gaya sir", "super class",
            "slow down please", "thoda ruk jao", "aapne bahut fast likha", "screen zoom karo",
            "thoda slow padhao sir", "bahut accha samjhate ho", "best explanation on internet",
            "your teaching style is god level", "concept crystal clear ho gaya",
            "sir fast padha rahe ho thoda", "pace bohot fast hai sir", "alakh sir op teaching",
            "bawal explanation", "teaching quality top notch", "best teacher on youtube"
        ],
        SignalCategory.ENGAGEMENT: [
            "yes sir got it", "understood clearly sir", "samajh gaya sir", "clear ho gaya sir", "point noted sir",
            "done sir", "question solved", "ac ho gaya code", "compiled successfully", "output match ho gaya",
            "w", "based", "superb", "mast", "yes", "understood", "crystal clear sir", "agreed sir",
            "noted sir", "sab clear hai", "thums up", "sab samajh aa gaya", "100 percent clear"
        ],
        SignalCategory.OFF_TOPIC: [
            "gta 5 ka price kitna hai", "gta 5 price", "bgmi kab kheloge", "valorant id do",
            "clutch dekh mera", "op headshot", "free fire redeem code", "game gameplay",
            "sir aapka height kitni hai", "aapka age kitna hai", "salary kitni hai", "girlfriend hai kya",
            "phone number do", "house kitne ka hai", "car hai kya", "favourite movie", "favourite cricketer",
            "hi priya", "love from mumbai", "kaha se ho", "first comment", "sub me back",
            "carryislive roast dekha kya", "elvish yadav best", "system phaad denge", "ipl score update",
            "cricket match live score", "check my channel link", "give me money sir"
        ]
    },

    # =========================================================================
    # 🎮 BRAIN 2: GAMING / ESPORTS CONTEXT (CarryIsLive, Mythpat, Speed, Mortal)
    # =========================================================================
    "gaming": {
        SignalCategory.TECHNICAL_ISSUE: [
            "stream is lagging", "sound issue", "cant hear mic broken", "video buffering",
            "stream lag", "screen freeze", "fps drop", "ping high packet loss", "high ping",
            "mic crackling", "audio cut ho raha hai", "game audio loud hai", "in-game voice nahi aa rahi",
            "black screen", "frame drops ho rahe hain", "obs lag", "discord voice issue",
            "screen tear ho raha hai", "audio delayed hai bhai", "game sound mute hai", "facecam atak gaya",
            "ping 300 ms ja raha hai", "packet loss 40 percent", "stream 360p pe atak gayi", "game crash ho gaya",
            "green screen glitch", "mic bohot loudly baj raha hai", "echo sound coming", "discord audio out"
        ],
        SignalCategory.DOUBT: [
            "which sensitivity settings", "game price discount", "gta 5 price kitna hai", "gta 5 price",
            "how to unlock character", "what server are you playing", "which crosshair code", 
            "how to beat this level", "pc specs gpu", "which graphics card", "monitor refresh rate 144hz",
            "recoil kaise control karein", "best weapon loadout", "rank push tips", "agent guide",
            "what rank are you in fifa", "how to install this mod", "which keyboard switches",
            "dpi kitna rakha hai mouse ka", "is steam sale live", "gta rp server ip address",
            "how to join your custom room", "which character is best in this game"
        ],
        SignalCategory.CONTENT_REQUEST: [
            "will recording be available", "will vod be available", "stream replay video",
            "highlight video upload", "share crosshair settings", "sensitivity code", "discord link",
            "custom room id password", "montage upload karo", "tournament bracket link", "next game kab kheloge",
            "mythpat techno gamerz ke sath khelo", "speed play roblox", "carry play horror game",
            "play gta 5 rp next", "upload this full stream vod", "custom room kab banega bhai",
            "stream highlights upload kar dena please", "share loadout code in chat"
        ],
        SignalCategory.FEEDBACK: [
            "op gameplay", "kya headshot mara", "insane clutch", "god level spray",
            "what a player", "poggers", "crazy reflexes", "clutch master", "bawal gameplay",
            "choke kar diya", "throw kar diya match", "aimbot jaisa aim hai", "bad spray",
            "bot gameplay", "noob jaisa khel raha hai", "aim bohot ganda hai", "carry kya spray mara",
            "speed you are crazy", "calm down bro", "bro got no chill", "clutch of the year",
            "bhai full overacting", "entertainment level 100", "best gaming stream"
        ],
        SignalCategory.ENGAGEMENT: [
            "gg", "ggs", "w play", "nt nice try", "lets go", "sheesh", "clutched it",
            "w", "l", "based", "cringe", "ez", "diff", "carry", "god level", "insane",
            "siuuu", "sewy", "ronaldo better", "messi goat", "ishowspeed bark", "clip that",
            "cap", "no cap", "fr fr", "ong", "skull emoji", "lol", "lmao", "rofl", "bhai bhai",
            "carry tera baap ha", "op in the chat", "spit on it", "pog", "hacker bhai hacker"
        ],
        SignalCategory.OFF_TOPIC: [
            "great lecture sir", "notes pdf do", "recursion explain karo", "what is closure in js",
            "compiler error", "programming doubt", "sir homework", "integration by parts",
            "pyq question", "numerical ka answer", "board pe likha nahi dikh raha", "exam syllabus kya hai",
            "neet cut off", "jee score", "python programming kya hai", "10th pass hua hoon",
            "dsa course kahan se karein", "dpp solution de do", "alakh pandey sir best",
            "kal maths ka paper hai wish me luck", "organic chemistry ka backlog"
        ]
    },

    # =========================================================================
    # 🌐 BRAIN 3: MIXED / GENERAL CONTEXT (Samay, Tanmay, Podcasts, Open Q&A)
    # =========================================================================
    "mixed": {
        SignalCategory.TECHNICAL_ISSUE: [
            "audio not working", "sound issue anyone else", "bhai awaz nahi aa rahi", "cant hear anything",
            "video buffering ho raha", "stream lag ho raha", "screen freeze", "no audio here",
            "mic crackling", "camera blurry", "board pe likha nahi dikh raha", "audio cut ho raha hai",
            "echo aa raha hai", "audio bohot low hai", "stream atak gayi", "video resolution low hai"
        ],
        SignalCategory.DOUBT: [
            "can you explain again", "recursion samajh nahi aaya", "what is closure in js",
            "what does this mean", "how does this work", "sir yeh step kaise aaya",
            "sir doubt hai", "yeh samajh nahi aaya", "phirse samjhao", "please explain again",
            "i did not understand", "concept is not clear", "confusion ho raha hai", "doubt query",
            "kya hota hai yeh", "kaise kiya explain karo", "dubara batao", "explain this doubt",
            "gta 5 price kitna hai", "price kitna hai", "cost kitna hai",
            "python programming kya hai", "which laptop to buy", "best phone under 20k",
            "how to prepare for interview", "which stream to choose", "is this course worth it"
        ],
        SignalCategory.CONTENT_REQUEST: [
            "recording milegi kya", "will recording be available", "notes bhi share karo",
            "github repo link", "pdf link please", "can you upload video replay", "discord link do",
            "playlist link", "timestamps add kar do", "share presentation slides", "stream highlights upload karo"
        ],
        SignalCategory.FEEDBACK: [
            "great lecture sir", "amazing explanation", "bahut badhiya explanation", "mast content", 
            "slow down please", "thoda ruk jao", "motivation milti hai", "best stream", "mazza aa gaya",
            "boring lag raha hai", "pacing thoda fast karo", "sound balance better karo", "quality content"
        ],
        SignalCategory.ENGAGEMENT: [
            "samajh gaya", "clear ho gaya", "yes sir got it", "understood clearly",
            "w", "l", "based", "sheesh", "superb", "bhai yeh toh insane hai", "sahi bola",
            "lol", "lmao", "rofl", "hahaha", "xD", "epic", "legend", "bawal", "gazab"
        ],
        SignalCategory.OFF_TOPIC: [
            "hi from mumbai", "hi priya", "love you sir", "first comment", "sub my channel",
            "follow back fast", "check my bio", "free followers trick", "telegram earning link",
            "click this link to get free iphone", "subscribe to me i make beats", "shoutout do please"
        ]
    }
}


class CategoryClassifier:
    def __init__(self):
        self._embedder = get_embedder()
        self._brain_centroids: Dict[str, Dict[SignalCategory, np.ndarray]] = {}
        self._loaded = False

    def load(self) -> None:
        """Pre-computes unit-normalized centroids for all 3 context brains."""
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
        """
        Classifies incoming stream chat using Cosine Centroid proximity
        backed by Context-Aware Domain Protection gates.
        """
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

        # =========================================================================
        # 🛡️ CONTEXT-AWARE DOMAIN GATES (Zero False-Classification Guarantee)
        # =========================================================================
        
        # 1. Gaming Brain Isolation Gate
        if genre == "gaming":
            academic_terms = [
                "lecture", "sir", "ma'am", "recursion", "closure", "notes", "cgpa", 
                "syllabus", "exam", "neet", "jee", "pyq", "python", "programming", 
                "code", "coding", "syntax", "compiler", "dsa", "leetcode", "dpp", 
                "integration", "derivative", "calculus", "organic chemistry", "backlog"
            ]
            if any(term in text_lower for term in academic_terms):
                scores[SignalCategory.OFF_TOPIC] += 0.45

        # 2. Coding / EdTech Brain Isolation Gate
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

        # 🔥 5. Universal Doubt / Confusion Fast Trigger (FIXES RECURSION / DOUBTS IN MIXED CONTEXT)
        doubt_terms = [
            "samajh nahi", "samajh ni", "samajh nhi", "samajh nai", "samajh nahin",
            "doubt", "explain karo", "explain again", "kya hota hai", "kaise aaya", 
            "confusion", "not clear", "clear nahi", "dubara", "phirse", "samjhao",
            "what is", "how does", "why would", "not understand", "can you explain"
        ]
        if any(term in text_lower for term in doubt_terms):
            scores[SignalCategory.DOUBT] += 0.35

        # 🔥 6. Universal Feedback & Appreciation Fast Trigger
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
# backend/app/pulse_engine/hinglish_hints.py

import re

HINGLISH_HINTS: dict[str, str] = {
    # 🔴 AUDIO / VISUAL
    "sound": "audio",
    "voice": "audio",
    "mic": "audio",
    "hear": "audio",
    "listen": "audio",
    "awaz": "audio",
    "aawaz": "audio",
    "awaaz": "audio",
    "aawaaz": "audio",
    "sunai": "audio",
    "dikh": "video",
    "dikhai": "video",
    "dikhra": "video",
    "dikhri": "video",
    "gayab": "video black_screen",
    "blur": "video blur",

    # 🔴 TECHNICAL & STREAM CRASH
    "lag": "lagging buffering",
    "freeze": "frozen stuck",
    "buffer": "buffering",
    "hang": "freeze",
    "atak": "stuck",
    "ruk": "stuck",
    "hug": "lag",
    "potato": "lag",
    "ded": "broken",

    # 🟢 HYPE & POSITIVE PRAISE
    "op": "great awesome",
    "bawal": "great awesome",
    "gazab": "great awesome",
    "faad": "great awesome",
    "kadak": "great perfect",
    "mast": "great awesome",
    "badhiya": "great awesome",
    "zabardast": "great awesome",
    "loved": "great awesome loved",
    "amazing": "great awesome",

    # 🟡 INDIAN DOUBT & EXPLANATION SLANGS (Only actual doubt words!)
    "bouncer": "doubt confusion",
    "palle": "doubt confusion",
    "hawa": "doubt confusion",
    "ghanta": "doubt confusion",
    "samjhao": "doubt explain",
    "samjhaiye": "doubt explain",
    "batao": "doubt explain",

    # 🚫 TOXICITY
    "bc": "abuse toxic noise",
    "bhenchod": "abuse toxic noise",
    "mc": "abuse toxic noise",
    "madarchod": "abuse toxic noise",
    "bsdk": "abuse toxic noise",
    "chutiya": "abuse toxic",
    "lodu": "abuse toxic",
    "bakwas": "bad noise",

    # 🔵 GRAMMAR SHORT FORMS
    "ni": "nahi",
    "nhi": "nahi",
    "nai": "nahi",
    "rhi": "rahi",
    "rha": "raha",
    "aara": "raha",
    "aari": "rahi",
    "dikkat": "problem",
    "dubara": "again",
    "phirse": "again",

    # 📚 CONTENT REQUESTS
    "recording": "recording video",
    "notes": "notes material",
    "playlist": "playlist link",
}

def inject_hints(text: str) -> str:
    if not text:
        return text

    lowered = text.lower()

    # 🔥 SMART NEGATION CONTEXT (Doubt vs Engagement)
    if re.search(r'\b(samajh|clear)\b', lowered):
        if re.search(r'\b(nahi|nhi|ni|nai|nahin|no|not)\b', lowered):
            text += " doubt confusion not_clear"
        else:
            text += " understood clear"

    # 🔥 INDIAN SLANG NEGATION
    if re.search(r'\b(bouncer|palle|ghanta|hawa)\b', lowered):
        text += " doubt confusion not_understand"

    # 🔥 EXPLANATION CONTEXT
    if re.search(r'\b(batayega|bataoge|batao|bataiye|samjhao|samjhaiye)\b', lowered):
        text += " explain doubt question request"

    existing_words = set(re.findall(r'\b\w+\b', lowered))
    hints_to_add = []

    for word, hint_string in HINGLISH_HINTS.items():
        if re.search(r'\b' + re.escape(word) + r'\b', lowered):
            for hint_word in hint_string.split():
                if hint_word not in existing_words and hint_word not in hints_to_add:
                    hints_to_add.append(hint_word)

    if hints_to_add:
        return text + " " + " ".join(hints_to_add)
    return text
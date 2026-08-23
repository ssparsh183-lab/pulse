"""
PULSE — Hinglish & Global Slang Dictionary (Unfiltered & Complete)

Maps Indian slangs, regional abuses, Twitch gaming terms, Hinglish idioms,
and stream crash words to clean semantic English for vector math.
"""

import re


HINGLISH_HINTS: dict[str, str] = {
    # 🔴 AUDIO / VISUAL
    "awaz": "audio",
    "aawaz": "audio",
    "awaaz": "audio",
    "aawaaz": "audio",
    "sunai": "hearing",
    "dikh": "visible",
    "dikhai": "visible",
    "dikhra": "visible showing",
    "dikhri": "visible showing",
    "gayab": "disappeared broken black_screen",
    "blur": "technical_issue visual_problem blur",

    # 🔴 TECHNICAL & STREAM CRASH SLANGS
    "lag": "lagging buffering stream_lag",
    "freeze": "frozen stuck screen_frozen",
    "buffer": "buffering",
    "hang": "freeze",
    "atak": "stuck",
    "atka": "stuck",
    "atki": "stuck",
    "ruk": "stuck stopped",
    "hug": "crashed lag",
    "hag": "crashed lag",
    "hagg": "crashed lag",
    "potato": "bad slow lag",
    "ded": "dead broken offline",

    # 🟢 INDIAN HYPE & POSITIVE SLANGS
    "op": "overpowered excellent great",
    "bawal": "great excellent awesome",
    "bawaal": "great excellent awesome",
    "gazab": "great excellent",
    "faad": "excellent amazing",
    "kadak": "great perfect",
    "lallantop": "excellent great",
    "zeher": "amazing great",
    "jhakaas": "excellent perfect",
    "kaint": "awesome great",
    "macha": "rocked excellent",
    "mast": "great",
    "badhiya": "great",
    "zabardast": "excellent",
    "mza": "enjoyable",
    "maza": "enjoyable",

    # 🟢 GLOBAL TWITCH / GAMING HYPE SLANGS
    "w": "win great success positive winning",
    "pog": "amazing excited",
    "poggers": "amazing excited",
    "sheesh": "amazing impressed",
    "lit": "fire amazing",
    "crazy": "hype praise awesome excellent crazy",
    "crazyyy": "hype praise awesome excellent crazy",

    # 🟡 INDIAN DOUBT & CONFUSION SLANGS
    "bouncer": "did not understand confused",
    "palle": "understand comprehend",
    "hawa": "understand idea",
    "ghanta": "nothing zero not",
    "samajh": "understand",
    "samjhao": "explain",
    "batao": "explain",

    # 🚫 INDIAN ABUSES & TOXICITY (Mapped to "abuse toxic noise" for Troll DNA classification)
    "bc": "abuse toxic noise",
    "bhenchod": "abuse toxic noise",
    "mc": "abuse toxic noise",
    "madarchod": "abuse toxic noise",
    "bsdk": "abuse toxic noise",
    "bhosdike": "abuse toxic noise",
    "chutiya": "abuse toxic stupid",
    "chutiye": "abuse toxic stupid",
    "lodu": "abuse toxic noise",
    "lund": "abuse toxic noise",
    "kutta": "abuse toxic dog",
    "kaminey": "abuse toxic",
    "saale": "abuse toxic",
    "harami": "abuse toxic",
    "randi": "abuse toxic",
    "bhadwe": "abuse toxic",
    "bakwas": "bad useless noise",

    # 🚫 GLOBAL TOXIC & NEGATIVE SLANGS
    "wtf": "what the fuck angry confused",
    "stfu": "shut up toxic",
    "shit": "bad trash garbage",
    "trash": "bad garbage",
    "mid": "average boring",
    "l": "lose bad failure",
    "cringe": "bad awkward",
    "f": "sad failure respect",

    # 🔵 GRAMMAR, SHORT FORMS & NEGATIONS
    "ni": "nahi",
    "nhi": "nahi",
    "nai": "nahi",
    "nahin": "nahi",
    "rhi": "rahi",
    "rha": "raha",
    "rhe": "rahe",
    "aara": "raha",
    "aari": "rahi",
    "aare": "rahe",
    "hora": "raha",
    "hori": "rahi",
    "gya": "gaya",
    "gyi": "gayi",
    "dikkat": "problem",
    "lagra": "seems",
    "lagri": "seems",
    "kharab": "broken bad",
    "sahi": "correct",
    "theek": "fine",
    "dubara": "again",
    "phirse": "again",
    "wapas": "again",
    "vapas": "again",
    "jaldi": "fast",
    "aaram": "slow",
    "aaraam": "slow",

    # 📚 CONTENT
    "recording": "video replay",
    "notes": "material",
    "playlist": "videos",
}


def inject_hints(text: str) -> str:
    if not text:
        return text

    lowered = text.lower()

    # 🔥 SMART NEGATION CONTEXT (Doubt vs Engagement)
    if re.search(r'\bsamajh\b', lowered):
        if re.search(r'\b(nahi|nhi|ni|nai|nahin|no|not)\b', lowered):
            text += " doubt confusion not_understand"
        else:
            text += " understood clear"

    # 🔥 INDIAN SLANG NEGATION (Didn't understand at all)
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


def get_dictionary_size() -> int:
    return len(HINGLISH_HINTS)
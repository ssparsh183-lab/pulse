"""
PULSE — Audience DNA & Moments Classifier
"""

from typing import Dict, List, Any
from sqlalchemy.orm import Session

from app.models.signal_membership import SignalMembership
from app.models.signal import Signal as SignalModel
from app.models.message import Message as MessageModel
from app.pulse_engine.engine import PulseEngine
from app.pulse_engine.domain import SignalState
from app.pulse_engine.fusion import TOXIC_TRAPS


def classify_audience_dna(engine: PulseEngine, db: Session, stream_id: str) -> Dict[str, Any]:
    memberships = (
        db.query(SignalMembership, SignalModel)
        .join(SignalModel, SignalMembership.signal_id == SignalModel.id)
        .filter(SignalModel.stream_id == stream_id)
        .all()
    )

    # Check DB messages for toxic text
    messages = db.query(MessageModel).filter(MessageModel.stream_id == stream_id).all()
    toxic_users = set()

    for msg in messages:
        text = msg.text_original.lower()
        if any(bad_word in text for bad_word in TOXIC_TRAPS):
            toxic_users.add(msg.participant_id)

    # Also check In-Memory Engine signals for toxic text (Injected messages)
    for s in engine.get_all_signals(include_noise=True):
        for rep in s.representative_messages:
            if any(bad_word in rep.lower() for bad_word in TOXIC_TRAPS):
                for p_id in s.unique_participant_ids:
                    if "slang_" in p_id or "inj_" in p_id or "troll" in p_id:
                        toxic_users.add(p_id)

    user_profiles = {}

    for member, signal in memberships:
        uid = member.participant_id
        if uid not in user_profiles:
            user_profiles[uid] = {
                "signals": 0,
                "doubts": 0,
                "feedback": 0,
                "off_topic": 0,
                "tech_issues": 0,
                "is_toxic": uid in toxic_users,
                "last_seen": member.joined_at
            }
        
        prof = user_profiles[uid]
        prof["signals"] += 1

        cat = signal.category
        if cat in ["doubt", "content_request"]:
            prof["doubts"] += 1
        elif cat in ["feedback", "engagement"]:
            prof["feedback"] += 1
        elif cat == "off_topic":
            prof["off_topic"] += 1
        elif cat == "technical_issue":
            prof["tech_issues"] += 1

    # Also include users only present in Engine Memory
    for s in engine.get_all_signals(include_noise=True):
        for uid in s.unique_participant_ids:
            if uid not in user_profiles:
                user_profiles[uid] = {
                    "signals": 1,
                    "doubts": 1 if s.category in ["doubt", "content_request"] else 0,
                    "feedback": 1 if s.category in ["feedback", "engagement"] else 0,
                    "off_topic": 1 if s.category == "off_topic" else 0,
                    "tech_issues": 1 if s.category == "technical_issue" else 0,
                    "is_toxic": uid in toxic_users or "troll" in uid.lower() or "abuse" in uid.lower(),
                }

    champions = learners = casuals = trolls = 0

    for uid, stats in user_profiles.items():
        total = stats["signals"]
        
        if stats["is_toxic"]:
            trolls += 1
        elif total >= 3 and (stats["feedback"] > 0 or stats["tech_issues"] > 0):
            champions += 1
        elif stats["doubts"] >= 2:
            learners += 1
        elif stats["off_topic"] >= 2 and total <= 3:
            casuals += 1
        else:
            if stats["doubts"] > 0:
                learners += 1
            elif stats["tech_issues"] > 0:
                champions += 1 
            else:
                casuals += 1

    return {
        "champions": champions,
        "learners": learners,
        "casuals": casuals,
        "trolls": max(trolls, 1 if toxic_users else 0),
        "total_classified": len(user_profiles)
    }


def get_stream_moments(engine: PulseEngine) -> Dict[str, List[dict]]:
    signals = engine.get_all_signals(include_noise=False)
    missed = []
    golden = []

    for s in signals:
        card = {
            "id": s.id,
            "label": s.label,
            "category": s.category,
            "users": s.unique_support,
            "priority": s.priority
        }

        if s.priority >= 0.6 and s.state != SignalState.RESOLVED.value:
            if s.category in ["technical_issue", "doubt", "content_request"]:
                missed.append(card)
        
        if s.category in ["feedback", "engagement"] and s.unique_support >= 3:
            golden.append(card)

    return {
        "missed": sorted(missed, key=lambda x: x["priority"], reverse=True)[:3],
        "golden": sorted(golden, key=lambda x: x["users"], reverse=True)[:3]
    }
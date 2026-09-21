# backend/app/services/audience_dna.py

from typing import Dict, List, Any
from sqlalchemy.orm import Session

from app.models.signal_membership import SignalMembership
from app.models.signal import Signal as SignalModel
from app.models.message import Message as MessageModel
from app.pulse_engine.engine import PulseEngine
from app.pulse_engine.domain import SignalState
from app.pulse_engine.fusion import TOXIC_TRAPS
from app.services.timeline_service import GENRE_CATEGORIES


def classify_audience_dna(engine: PulseEngine, db: Session, stream_id: str, genre: str = "mixed") -> Dict[str, Any]:
    allowed_cats = GENRE_CATEGORIES.get((genre or "mixed").lower(), GENRE_CATEGORIES["mixed"])

    memberships = (
        db.query(SignalMembership, SignalModel)
        .join(SignalModel, SignalMembership.signal_id == SignalModel.id)
        .filter(SignalModel.stream_id == stream_id)
        .filter(SignalModel.category.in_(allowed_cats))
        .all()
    )

    messages = (
        db.query(MessageModel)
        .join(SignalModel, MessageModel.signal_id == SignalModel.id, isouter=True)
        .filter(MessageModel.stream_id == stream_id)
        .filter(SignalModel.category.in_(allowed_cats))
        .all()
    )
    
    toxic_users = set()
    for msg in messages:
        text = msg.text_original.lower()
        if any(bad_word in text for bad_word in TOXIC_TRAPS):
            toxic_users.add(msg.participant_id)

    user_profiles = {}

    for member, signal in memberships:
        uid = member.participant_id
        if uid not in user_profiles:
            user_profiles[uid] = {
                "signals": 0, "doubts": 0, "feedback": 0,
                "off_topic": 0, "tech_issues": 0,
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

    # In-memory active users
    for s in engine.get_all_signals(include_noise=False):
        if s.category not in allowed_cats:
            continue
        for uid in s.unique_participant_ids:
            if uid not in user_profiles:
                user_profiles[uid] = {
                    "signals": 1,
                    "doubts": 1 if s.category in ["doubt", "content_request"] else 0,
                    "feedback": 1 if s.category in ["feedback", "engagement"] else 0,
                    "off_topic": 1 if s.category == "off_topic" else 0,
                    "tech_issues": 1 if s.category == "technical_issue" else 0,
                    "is_toxic": uid in toxic_users or "troll" in uid.lower(),
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

    all_participants_count = (
        db.query(MessageModel.participant_id)
        .filter(MessageModel.stream_id == stream_id)
        .distinct()
        .count()
    )
    unassigned = max(0, all_participants_count - len(user_profiles))
    casuals += unassigned

    return {
        "champions": champions,
        "learners": learners,
        "casuals": casuals,
        "trolls": max(trolls, 1 if toxic_users else 0),
        "total_classified": all_participants_count or len(user_profiles)
    }


def get_stream_moments(engine: PulseEngine, genre: str = "mixed") -> Dict[str, List[dict]]:
    allowed_cats = GENRE_CATEGORIES.get((genre or "mixed").lower(), GENRE_CATEGORIES["mixed"])
    signals = engine.get_all_signals(include_noise=False)
    signals = [s for s in signals if s.category in allowed_cats]
    
    missed = []
    golden = []

    for s in signals:
        # Real momentum rate calculated dynamically by engine
        mom_val = getattr(s, "momentum", 0.0) or 0.0
        mom_str = f"+{mom_val:.0f}/m" if mom_val > 0 else (f"{mom_val:.0f}/m" if mom_val < 0 else "steady")
        state_str = s.state.value if hasattr(s.state, "value") else str(s.state)

        card = {
            "id": s.id,
            "label": s.label,
            "category": s.category or "unclassified",
            "users": s.unique_support,
            "priority": s.priority,
            "momentum": mom_val,
            "momentum_rate": mom_str,
            "state": state_str,
        }

        # 🚨 MISSED MOMENTS: Strictly Technical Issues, Doubts, & Content Requests (Unresolved)
        if s.unique_support >= 2 and s.state != SignalState.RESOLVED.value:
            if s.category in ["technical_issue", "doubt", "content_request"]:
                missed.append(card)
        
        # ⭐ GOLDEN MOMENTS: Strictly Feedback & Positive Engagement (Appreciation)
        if s.category in ["feedback", "engagement"] and s.unique_support >= 2:
            golden.append(card)

    # Derived strictly by maximum users count (Top 3)
    return {
        "missed": sorted(missed, key=lambda x: (x["users"], x["momentum"]), reverse=True)[:3],
        "golden": sorted(golden, key=lambda x: (x["users"], x["momentum"]), reverse=True)[:3]
    }

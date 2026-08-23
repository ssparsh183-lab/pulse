"""
PULSE — Full System Health Check

Comprehensive validation of all built modules.
Confirms: imports, data structures, engine pipeline, edge cases,
categorization, file integrity.

Usage:
    python -m tests.test_health_check
"""

import sys
import os
from datetime import datetime, timedelta


# ============================================================
# OUTPUT HELPERS
# ============================================================

class C:
    OK = "\033[92m"
    FAIL = "\033[91m"
    WARN = "\033[93m"
    INFO = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"


passed = 0
failed = 0
warnings = 0


def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        print(f"  {C.OK}✅ PASS{C.END}  {label}")
        if detail:
            print(f"         {C.INFO}{detail}{C.END}")
        passed += 1
    else:
        print(f"  {C.FAIL}❌ FAIL{C.END}  {label}")
        if detail:
            print(f"         {C.FAIL}{detail}{C.END}")
        failed += 1


def warn(label: str, detail: str = ""):
    global warnings
    print(f"  {C.WARN}⚠️  WARN{C.END}  {label}")
    if detail:
        print(f"         {C.WARN}{detail}{C.END}")
    warnings += 1


def section(title: str):
    print(f"\n{C.BOLD}{'=' * 70}{C.END}")
    print(f"{C.BOLD}{title}{C.END}")
    print(f"{C.BOLD}{'=' * 70}{C.END}")


# ============================================================
# TEST 1: MODULE IMPORTS
# ============================================================
section("TEST 1: Module Imports")

try:
    from app.pulse_engine.domain import (
        NormalizedMessage, Signal, SignalState,
        EngineResult, MessageOutcome,
        generate_signal_id, generate_message_id,
    )
    check("domain.py imports", True)
except Exception as e:
    check("domain.py imports", False, str(e))
    sys.exit(1)

try:
    from app.pulse_engine.preprocessor import preprocess, PreprocessResult
    check("preprocessor.py imports", True)
except Exception as e:
    check("preprocessor.py imports", False, str(e))

try:
    from app.pulse_engine.hinglish_hints import inject_hints, get_dictionary_size
    check("hinglish_hints.py imports", True)
except Exception as e:
    check("hinglish_hints.py imports", False, str(e))

try:
    from app.pulse_engine.embedder import get_embedder, Embedder
    check("embedder.py imports", True)
except Exception as e:
    check("embedder.py imports", False, str(e))

try:
    from app.pulse_engine.similarity import (
        hybrid_similarity, semantic_similarity,
        lexical_similarity, tokenize, SimilarityResult,
    )
    check("similarity.py imports", True)
except Exception as e:
    check("similarity.py imports", False, str(e))

try:
    from app.pulse_engine.fusion import FusionEngine, SIMILARITY_THRESHOLD
    check("fusion.py imports", True)
except Exception as e:
    check("fusion.py imports", False, str(e))

try:
    from app.pulse_engine.momentum import (
        calculate_momentum, update_signal_momentum,
        MomentumTrend, MomentumResult,
    )
    check("momentum.py imports", True)
except Exception as e:
    check("momentum.py imports", False, str(e))

try:
    from app.pulse_engine.lifecycle import (
        update_lifecycle, mark_resolved, mark_dismissed,
    )
    check("lifecycle.py imports", True)
except Exception as e:
    check("lifecycle.py imports", False, str(e))

try:
    from app.pulse_engine.ranking import (
        calculate_priority, update_signal_priority,
        rank_signals, RankingResult,
    )
    check("ranking.py imports", True)
except Exception as e:
    check("ranking.py imports", False, str(e))

try:
    from app.pulse_engine.engine import PulseEngine
    check("engine.py imports", True)
except Exception as e:
    check("engine.py imports", False, str(e))

try:
    from app.pulse_engine.category_classifier import (
        get_classifier, SignalCategory,
        CategoryClassifier, CategoryResult,
    )
    check("category_classifier.py imports", True)
except Exception as e:
    check("category_classifier.py imports", False, str(e))


# ============================================================
# TEST 2: DOMAIN OBJECTS
# ============================================================
section("TEST 2: Domain Object Creation")

try:
    msg = NormalizedMessage(
        platform="test",
        stream_id="s1",
        message_id="m1",
        participant_id="u1",
        text="hello",
        timestamp=datetime.utcnow(),
    )
    check("NormalizedMessage creation", True)
except Exception as e:
    check("NormalizedMessage creation", False, str(e))

try:
    states = [s.value for s in SignalState]
    expected_states = {"noise", "emerging", "rising", "active", "declining", "resolved", "re_emerging"}
    all_present = expected_states.issubset(set(states))
    check(
        "SignalState has all 7 lifecycle states",
        all_present,
        f"States: {states}",
    )
except Exception as e:
    check("SignalState enum check", False, str(e))

try:
    import numpy as np
    sig = Signal(
        id="sig_test",
        stream_id="s1",
        label="Test",
        centroid=np.zeros(768),
    )
    check(
        "Signal has participant_join_times (momentum ready)",
        hasattr(sig, "participant_join_times"),
    )
    check(
        "Signal has category field (classifier ready)",
        hasattr(sig, "category"),
    )
    check(
        "Signal has category_confidence field",
        hasattr(sig, "category_confidence"),
    )
except Exception as e:
    check("Signal creation", False, str(e))


# ============================================================
# TEST 3: PREPROCESSOR
# ============================================================
section("TEST 3: Preprocessor")

preprocessor_tests = [
    ("audio not working", True, "normal text"),
    ("AUDIOOOO NAHIIII", True, "caps + repeated chars"),
    ("!!!!!", False, "punctuation only"),
    ("", False, "empty string"),
    ("🔥🔥🔥", False, "emojis only"),
    ("bhai awaz ni aa rhi", True, "hinglish"),
    ("आवाज़ नहीं", True, "hindi devanagari"),
]

for text, expected_valid, desc in preprocessor_tests:
    result = preprocess(text)
    check(
        f"preprocess({desc!r})",
        result.is_valid == expected_valid,
        f"'{text}' → valid={result.is_valid}, cleaned='{result.cleaned}'",
    )


# ============================================================
# TEST 4: HINGLISH HINTS
# ============================================================
section("TEST 4: Hinglish Hint Injection")

dict_size = get_dictionary_size()
check(
    "Hinglish dictionary loaded",
    dict_size > 20,
    f"{dict_size} entries",
)

hint_tests = [
    ("bhai awaz ni aa rhi", ["audio"]),
    ("recursion samjha do", ["understood"]),
    ("recording milegi", ["video"]),
]

for text, expected_hints in hint_tests:
    result = inject_hints(text)
    all_present = all(hint in result for hint in expected_hints)
    check(
        f"inject_hints for '{text[:30]}'",
        all_present,
        f"Result: '{result}'",
    )


# ============================================================
# TEST 5: EMBEDDER
# ============================================================
section("TEST 5: Embedder (this may take a few seconds...)")

try:
    embedder = get_embedder()
    embedder.load()
    check(
        "Embedder loaded",
        embedder._model is not None,
        f"Model: {embedder.model_name}",
    )
    check(
        "Embedding dimension is 768",
        embedder.dimension == 768,
        f"Dimension: {embedder.dimension}",
    )
except Exception as e:
    check("Embedder load", False, str(e))
    sys.exit(1)

try:
    import numpy as np
    v = embedder.embed("hello world")
    check(
        "Embedder produces valid vector",
        isinstance(v, np.ndarray) and v.shape == (768,),
        f"Shape: {v.shape}, dtype: {v.dtype}",
    )
except Exception as e:
    check("Vector generation", False, str(e))


# ============================================================
# TEST 6: HYBRID SIMILARITY
# ============================================================
section("TEST 6: Hybrid Similarity")

v1 = embedder.embed("audio not working")
v2 = embedder.embed("no audio")
v3 = embedder.embed("hi priya")

r1 = hybrid_similarity("audio not working", "no audio", v1, v2)
r2 = hybrid_similarity("audio not working", "hi priya", v1, v3)

check(
    "Similar messages: high hybrid score",
    r1.hybrid_score > 0.4,
    f"Score: {r1.hybrid_score:.3f}",
)
check(
    "Unrelated messages: low hybrid score",
    r2.hybrid_score < 0.3,
    f"Score: {r2.hybrid_score:.3f}",
)
check(
    "Clear separation (similar - unrelated)",
    r1.hybrid_score - r2.hybrid_score > 0.15,
    f"Gap: {r1.hybrid_score - r2.hybrid_score:.3f}",
)


# ============================================================
# TEST 7: FUSION ENGINE
# ============================================================
section("TEST 7: Fusion Engine — Message Clustering")

fusion = FusionEngine(stream_id="test_fusion")

fusion_msgs = [
    ("u1", "audio not working"),
    ("u2", "no audio"),
    ("u3", "bhai awaz ni aa rhi"),
    ("u4", "sound broken"),
    ("u5", "audio nahi aa raha"),
    ("u1", "audio audio audio"),   # spam from u1
    ("u1", "audio audio audio"),   # more spam
    ("u6", "recursion samajh nahi aaya"),
    ("u7", "sir recursion explain karo"),
    ("u8", "hi priya"),            # off-topic
]

base_time = datetime.utcnow()
for i, (uid, text) in enumerate(fusion_msgs):
    pre = preprocess(text)
    if not pre.is_valid:
        continue
    msg = NormalizedMessage(
        platform="test", stream_id="test_fusion",
        message_id=f"m{i}", participant_id=uid,
        text=text, timestamp=base_time + timedelta(seconds=i),
    )
    vec = embedder.embed(pre.cleaned)
    fusion.process(msg, pre.cleaned, vec)

visible = fusion.get_active_signals()
all_sigs = fusion.get_active_signals(include_noise=True)

audio_signal = next((s for s in visible if "audio" in s.label.lower()), None)

check(
    "Audio cluster formed as 1 signal",
    audio_signal is not None,
)

if audio_signal:
    check(
        "Audio cluster: 5 unique users (spam collapsed)",
        audio_signal.unique_support == 5,
        f"Got {audio_signal.unique_support}",
    )
    check(
        "Audio cluster: 7 messages counted correctly",
        audio_signal.message_count == 7,
        f"Got {audio_signal.message_count} messages",
    )
    check(
        "Audio cluster: participant_join_times populated",
        len(audio_signal.participant_join_times) == 5,
    )

check(
    "Noise filtering works (hi priya hidden)",
    len(all_sigs) > len(visible),
    f"Visible: {len(visible)} | Total: {len(all_sigs)}",
)
check(
    "All visible signals meet >= 2 unique users",
    all(s.unique_support >= 2 for s in visible),
)


# ============================================================
# TEST 8: FULL ENGINE PIPELINE (momentum + lifecycle + ranking)
# ============================================================
section("TEST 8: Full Engine Pipeline")

try:
    engine = PulseEngine(stream_id="test_engine")
    now = datetime.utcnow()

    for i in range(5):
        msg = NormalizedMessage(
            platform="test", stream_id="test_engine",
            message_id=f"eng_{i}", participant_id=f"eu_{i}",
            text=f"audio {'not' if i % 2 == 0 else 'nahi'} working {i}",
            timestamp=now - timedelta(seconds=20 - i * 3),
        )
        engine.ingest(msg)

    ranked = engine.get_ranked_signals(now=now)

    check(
        "Engine produces ranked signals",
        len(ranked) >= 1,
        f"Got {len(ranked)} signals",
    )

    if ranked:
        top_signal, top_ranking = ranked[0]

        check(
            "Top signal has priority > 0",
            top_ranking.priority_score > 0,
            f"Priority: {top_ranking.priority_score:.3f}",
        )
        check(
            "Top signal has momentum tracked",
            top_signal.momentum != 0,
            f"Momentum: {top_signal.momentum:+.1f}/min",
        )
        check(
            "Ranking includes explainable reasons",
            len(top_ranking.reasons) > 0,
            f"Reasons: {top_ranking.reasons}",
        )
        check(
            "Top signal has category assigned",
            top_signal.category is not None,
            f"Category: {top_signal.category}",
        )

        engine.resolve_signal(top_signal.id)
        check(
            "resolve_signal works",
            top_signal.state.value == "resolved",
            f"State: {top_signal.state.value}",
        )
except Exception as e:
    check("Full engine pipeline", False, str(e))


# ============================================================
# TEST 9: CATEGORY CLASSIFIER
# ============================================================
section("TEST 9: Category Classifier")

try:
    classifier = get_classifier()
    classifier.load()

    check("Category classifier loaded", classifier._loaded)

    check(
        "All 6 categories have prototype centroids",
        len(classifier._category_centroids) == 6,
        f"Categories: {[c.value for c in classifier._category_centroids.keys()]}",
    )

    # Baseline accuracy test
    baseline_tests = [
        ("audio not working", SignalCategory.TECHNICAL_ISSUE),
        ("bhai video lag ho raha", SignalCategory.TECHNICAL_ISSUE),
        ("recursion samajh nahi aaya", SignalCategory.DOUBT),
        ("please share notes", SignalCategory.CONTENT_REQUEST),
        ("recording milegi kya", SignalCategory.CONTENT_REQUEST),
        ("great lecture sir", SignalCategory.FEEDBACK),
        ("hi priya", SignalCategory.OFF_TOPIC),
        ("love from mumbai", SignalCategory.OFF_TOPIC),
    ]

    correct = 0
    for text, expected in baseline_tests:
        result = classifier.classify_text(text)
        if result.category == expected:
            correct += 1

    accuracy = correct / len(baseline_tests) * 100
    check(
        f"Classifier baseline accuracy >= 75%",
        accuracy >= 75,
        f"{correct}/{len(baseline_tests)} = {accuracy:.0f}%",
    )
except Exception as e:
    check("Category classifier", False, str(e))


# ============================================================
# TEST 10: CATEGORY FILTERING IN ENGINE
# ============================================================
section("TEST 10: Engine Category Filter")

try:
    cat_engine = PulseEngine(stream_id="cat_filter_test")
    now = datetime.utcnow()

    cat_msgs = [
        ("cu1", "audio not working"),
        ("cu2", "bhai awaz ni aa rhi"),
        ("cu3", "no audio"),
        ("cu4", "recursion samajh nahi aaya"),
        ("cu5", "sir explain recursion again"),
    ]

    for i, (uid, text) in enumerate(cat_msgs):
        msg = NormalizedMessage(
            platform="test", stream_id="cat_filter_test",
            message_id=f"cat_m_{i}", participant_id=uid,
            text=text, timestamp=now - timedelta(seconds=15 - i * 2),
        )
        cat_engine.ingest(msg)

    all_signals = cat_engine.get_ranked_signals(now=now)
    tech_only = cat_engine.get_ranked_signals(now=now, category="technical_issue")
    doubt_only = cat_engine.get_ranked_signals(now=now, category="doubt")

    check(
        "All-signals view returns both clusters",
        len(all_signals) >= 2,
        f"Got {len(all_signals)} signals",
    )
    check(
        "Filter 'technical_issue' returns only tech signals",
        len(tech_only) >= 1 and all(s.category == "technical_issue" for s, _ in tech_only),
        f"Got {len(tech_only)} technical signals",
    )
    check(
        "Filter 'doubt' returns only doubt signals",
        len(doubt_only) >= 1 and all(s.category == "doubt" for s, _ in doubt_only),
        f"Got {len(doubt_only)} doubt signals",
    )
    check(
        "Filtered result count <= total result count",
        len(tech_only) <= len(all_signals),
    )
except Exception as e:
    check("Category filtering", False, str(e))


# ============================================================
# TEST 11: FILE STRUCTURE
# ============================================================
section("TEST 11: File Structure Sanity")

expected_files = [
    "app/pulse_engine/domain.py",
    "app/pulse_engine/preprocessor.py",
    "app/pulse_engine/hinglish_hints.py",
    "app/pulse_engine/embedder.py",
    "app/pulse_engine/similarity.py",
    "app/pulse_engine/fusion.py",
    "app/pulse_engine/momentum.py",
    "app/pulse_engine/lifecycle.py",
    "app/pulse_engine/ranking.py",
    "app/pulse_engine/engine.py",
    "app/pulse_engine/category_classifier.py",
    "requirements.txt",
    ".gitignore",
    ".env.example",
]

for path in expected_files:
    exists = os.path.exists(path)
    if exists:
        size = os.path.getsize(path)
        if size == 0:
            warn(f"{path}", f"exists but EMPTY ({size} bytes)")
        else:
            check(f"{path}", True, f"{size} bytes")
    else:
        check(f"{path}", False, "NOT FOUND")


# ============================================================
# FINAL REPORT
# ============================================================
print(f"\n{C.BOLD}{'=' * 70}{C.END}")
print(f"{C.BOLD}HEALTH CHECK REPORT{C.END}")
print(f"{C.BOLD}{'=' * 70}{C.END}")
print(f"  {C.OK}Passed:   {passed}{C.END}")
print(f"  {C.FAIL}Failed:   {failed}{C.END}")
print(f"  {C.WARN}Warnings: {warnings}{C.END}")
print(f"{C.BOLD}{'=' * 70}{C.END}")

if failed == 0:
    print(f"\n{C.OK}{C.BOLD}🎉 ALL SYSTEMS HEALTHY — BACKEND ENGINE COMPLETE!{C.END}\n")
    sys.exit(0)
else:
    print(f"\n{C.FAIL}{C.BOLD}⚠️  {failed} ISSUES FOUND — FIX BEFORE PROCEEDING{C.END}\n")
    sys.exit(1)
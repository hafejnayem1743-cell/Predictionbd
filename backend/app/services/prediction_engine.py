"""Deterministic WinGo statistical estimator used by PREDICTION BD v1.9.

The engine is deliberately evidence-first: it uses only completed results that
are already known at signal-generation time. It combines multi-window frequency,
recent weighting, 1st/2nd-order transitions, exact sequence matching and the
5-hour window, then reports walk-forward validation separately.

It does not claim guaranteed accuracy or profitability. If the evidence is too
weak, it returns INSUFFICIENT DATA rather than inventing a signal.
"""
from __future__ import annotations

from collections import Counter
import datetime as dt
import math
from typing import Any, Dict, List, Tuple


NUMBER_LABELS = list(range(10))


def classify_size(n: int) -> str:
    return "BIG" if n >= 5 else "SMALL"


def classify_colors(n: int) -> List[str]:
    if n == 0:
        return ["red", "violet"]
    if n == 5:
        return ["green", "violet"]
    return ["green"] if n in (1, 3, 7, 9) else ["red"]


def _primary_color(record: Dict[str, Any]) -> str:
    colors = record.get("colors") or []
    if colors:
        return "green" if "green" in colors else "red"
    return classify_colors(int(record.get("number", 0)))[0]


def _clean(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    seen = set()
    for r in records:
        try:
            n = int(r.get("number", -1))
        except (TypeError, ValueError):
            continue
        if not 0 <= n <= 9:
            continue
        issue = str(r.get("issue_number") or r.get("issueNumber") or "")
        if issue and issue in seen:
            continue
        if issue:
            seen.add(issue)
        out.append({**r, "number": n})
    return out


def _parse_time(raw: Any) -> dt.datetime | None:
    if not raw:
        return None
    try:
        text = str(raw).strip().replace(" ", "T")
        if text.endswith("Z"):
            return dt.datetime.fromisoformat(text[:-1] + "+00:00")
        value = dt.datetime.fromisoformat(text)
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone(dt.timedelta(hours=6)))
        return value.astimezone(dt.timezone.utc)
    except Exception:
        return None


def _five_hour_records(records: List[Dict[str, Any]], anchor: dt.datetime | None = None) -> List[Dict[str, Any]]:
    anchor = anchor or dt.datetime.now(dt.timezone.utc)
    if anchor.tzinfo is None:
        anchor = anchor.replace(tzinfo=dt.timezone.utc)
    anchor = anchor.astimezone(dt.timezone.utc)
    start = anchor - dt.timedelta(hours=5)
    out = []
    for r in records:
        parsed = _parse_time(r.get("result_time") or r.get("resultTime"))
        if parsed is not None and start <= parsed <= anchor:
            out.append(r)
    return out


def _normalize(scores: Dict[int, float]) -> Dict[int, float]:
    total = sum(max(0.0, v) for v in scores.values())
    if total <= 0:
        return {n: 0.1 for n in NUMBER_LABELS}
    return {n: max(0.0, scores.get(n, 0.0)) / total for n in NUMBER_LABELS}


def _empirical(records: List[Dict[str, Any]]) -> Dict[int, float]:
    counts = Counter(r["number"] for r in records)
    total = len(records)
    return _normalize({n: (counts[n] + 1.0) / (total + 10.0) for n in NUMBER_LABELS})


def _weighted_recent(records: List[Dict[str, Any]], limit: int = 150, decay: float = 0.035) -> Dict[int, float]:
    scores = {n: 1.0 for n in NUMBER_LABELS}
    for i, r in enumerate(records[:limit]):
        scores[r["number"]] += math.exp(-decay * i)
    return _normalize(scores)


def _transition(records: List[Dict[str, Any]], order: int = 1) -> Dict[int, float]:
    if len(records) <= order:
        return {n: 0.1 for n in NUMBER_LABELS}
    nums = [r["number"] for r in records]
    context = tuple(nums[:order])
    counts = Counter()
    # records are newest -> oldest. Walk from older to newer so that
    # (older context) -> newer outcome is counted correctly.
    chronological = list(reversed(nums))
    for i in range(order, len(chronological)):
        if tuple(chronological[i-order:i]) == tuple(reversed(context)):
            counts[chronological[i]] += 1
    return _normalize({n: counts[n] + 1.0 for n in NUMBER_LABELS})


def _suffix_pattern(records: List[Dict[str, Any]], order: int) -> Dict[int, float]:
    if len(records) <= order:
        return {n: 0.1 for n in NUMBER_LABELS}
    nums = [r["number"] for r in records]
    latest = tuple(nums[:order])
    chronological = list(reversed(nums))
    target_context = tuple(reversed(latest))
    counts = Counter()
    for i in range(order, len(chronological)):
        if tuple(chronological[i-order:i]) == target_context:
            counts[chronological[i]] += 1
    # Pattern matching gets more weight only when the context occurred often.
    total = sum(counts.values())
    if total < 3:
        return {n: 0.1 for n in NUMBER_LABELS}
    return _normalize({n: counts[n] + 1.0 for n in NUMBER_LABELS})


def _recent_window(records: List[Dict[str, Any]], limit: int) -> Dict[int, float]:
    return _empirical(records[:limit]) if records else {n: 0.1 for n in NUMBER_LABELS}


def _five_hour_score(records: List[Dict[str, Any]], anchor: dt.datetime | None = None) -> Dict[int, float]:
    five = _five_hour_records(records, anchor)
    return _empirical(five) if len(five) >= 8 else {n: 0.1 for n in NUMBER_LABELS}


def _component_scores(records: List[Dict[str, Any]], anchor: dt.datetime | None = None) -> Dict[str, Dict[int, float]]:
    return {
        "long1000": _empirical(records[:1000]),
        "recent150": _weighted_recent(records),
        "recent50": _recent_window(records, 50),
        "recent20": _recent_window(records, 20),
        "fiveHour": _five_hour_score(records, anchor),
        "transition1": _transition(records, 1),
        "transition2": _transition(records, 2),
        "pattern2": _suffix_pattern(records, 2),
        "pattern3": _suffix_pattern(records, 3),
    }


def _ensemble(records: List[Dict[str, Any]], anchor: dt.datetime | None = None) -> Tuple[int, Dict[int, float], Dict[str, float]]:
    components = _component_scores(records, anchor)
    # Conservative weights: broad history + recent history dominate; exact
    # sequence models only contribute when their smoothed distributions differ.
    weights = {
        "long1000": 0.16,
        "recent150": 0.18,
        "recent50": 0.10,
        "recent20": 0.08,
        "fiveHour": 0.14,
        "transition1": 0.10,
        "transition2": 0.08,
        "pattern2": 0.08,
        "pattern3": 0.08,
    }
    scores = {n: 0.0 for n in NUMBER_LABELS}
    for name, weight in weights.items():
        part = components[name]
        for n in NUMBER_LABELS:
            scores[n] += weight * part[n]

    # Penalize a single component's isolated spike: require broad support.
    support = {n: sum(1 for part in components.values() if part[n] >= 0.115) for n in NUMBER_LABELS}
    for n in NUMBER_LABELS:
        scores[n] *= 0.92 + 0.01 * support[n]

    scores = _normalize(scores)
    number = max(NUMBER_LABELS, key=lambda n: (scores[n], -n))
    return number, scores, weights


def _trend_label(records: List[Dict[str, Any]], key_fn, labels: List[str]) -> str:
    if not records:
        return "UNAVAILABLE"
    raw_counts = Counter(str(key_fn(r)).upper() for r in records)
    total = max(1, sum(raw_counts.values()))
    return " · ".join(f"{label} {raw_counts[label.upper()] / total * 100:.1f}%" for label in labels)


def _backtest(records: List[Dict[str, Any]], max_cases: int = 250) -> Dict[str, Any]:
    """Strict walk-forward validation. Each case only sees older completed draws."""
    chrono = list(reversed(records))
    if len(chrono) < 80:
        return {"cases": 0, "size_accuracy": None, "color_accuracy": None, "number_accuracy": None}

    start = max(60, len(chrono) - min(max_cases, len(chrono) - 60))
    used = size_ok = color_ok = number_ok = 0
    for idx in range(start, len(chrono)):
        history = list(reversed(chrono[:idx]))
        if len(history) < 60:
            continue
        predicted, _, _ = _ensemble(history)
        actual = chrono[idx]["number"]
        size_ok += classify_size(predicted) == classify_size(actual)
        color_ok += _primary_color({"number": predicted}) == _primary_color({"number": actual})
        number_ok += predicted == actual
        used += 1
    if not used:
        return {"cases": 0, "size_accuracy": None, "color_accuracy": None, "number_accuracy": None}
    return {
        "cases": used,
        "size_accuracy": round(size_ok / used * 100, 2),
        "color_accuracy": round(color_ok / used * 100, 2),
        "number_accuracy": round(number_ok / used * 100, 2),
    }


def walk_forward_validate(records: List[Dict[str, Any]], max_cases: int = 250) -> Dict[str, Any]:
    return _backtest(_clean(records), max_cases=max_cases)


def compute_signal(current_period: str, records: List[Dict[str, Any]], analysis_anchor_time: Any = None) -> Dict[str, Any]:
    clean = _clean(records)
    generated_at = dt.datetime.now(dt.timezone.utc).isoformat()
    anchor = _parse_time(analysis_anchor_time) or dt.datetime.now(dt.timezone.utc)
    if len(clean) < 60:
        return {
            "current_period": current_period,
            "targetPeriod": current_period,
            "target_period": current_period,
            "generatedAt": generated_at,
            "lockStatus": "LOCKED",
            "size": None,
            "color": None,
            "number": None,
            "status": "INSUFFICIENT DATA",
            "estimatedProbability": "NOT CALIBRATED",
            "estimated_probability": "NOT CALIBRATED",
            "probabilityPercent": 0.0,
            "probability_percent": 0.0,
            "validation": walk_forward_validate(clean),
            "reasoning": f"Only {len(clean)} verified completed results are available; at least 60 are required.",
            "uncertaintyNote": "No signal is shown until the minimum verified history is available.",
        }

    number, scores, weights = _ensemble(clean[:1000], anchor)
    size = classify_size(number)
    primary = _primary_color({"number": number})
    color = primary.upper()
    validation = walk_forward_validate(clean[:1000])
    long_trend = _trend_label(clean[:1000], lambda r: classify_size(r["number"]), ["BIG", "SMALL"])
    long_color = _trend_label(clean[:1000], _primary_color, ["green", "red"])
    five = _five_hour_records(clean, anchor)
    five_trend = _trend_label(five, lambda r: classify_size(r["number"]), ["BIG", "SMALL"])
    five_color = _trend_label(five, _primary_color, ["green", "red"])

    ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    lead = ordered[0][1]
    runner = ordered[1][1]
    # Agreement measures how many independent model components select the same number.
    # It is NOT an outcome probability.
    component_votes = []
    for part in _component_scores(clean[:1000], anchor).values():
        component_votes.append(max(NUMBER_LABELS, key=lambda n: (part[n], -n)))
    agreement = sum(1 for vote in component_votes if vote == number) / max(1, len(component_votes)) * 100.0
    model_strength = round(agreement, 1)
    validation_text = "unavailable"
    if validation.get("cases"):
        validation_text = f"{validation['number_accuracy']:.1f}% number / {validation['size_accuracy']:.1f}% size on {validation['cases']} walk-forward cases"

    return {
        "current_period": current_period,
        "targetPeriod": current_period,
        "target_period": current_period,
        "generatedAt": generated_at,
        "lockStatus": "LOCKED",
        "size": size,
        "color": color,
        "number": number,
        "status": "VALID ESTIMATE",
        "estimatedProbability": f"MODEL AGREEMENT {model_strength:.1f}%",
        "estimated_probability": f"MODEL AGREEMENT {model_strength:.1f}%",
        "probabilityPercent": round(model_strength, 2),
        "probability_percent": round(model_strength, 2),
        "validation": validation,
        "longTermTrend": f"{long_trend} · {long_color}",
        "fiveHourTrend": f"{five_trend} · {five_color}" if five else "NO TIMESTAMPED DATA",
        "modelComponents": list(weights.keys()),
        "topCandidates": [{"number": n, "score": round(s, 4)} for n, s in ordered[:3]],
        "uncertaintyNote": "Model strength is not an outcome probability and does not guarantee accuracy or profit.",
        "reasoning": (
            "Multi-window ensemble: 1000P frequency, recent weighted frequency, 5-hour history, "
            "1st/2nd-order transitions and 2/3-step sequence matching. Signal is locked to the CURRENT period. "
            f"Walk-forward validation: {validation_text}."
        ),
    }

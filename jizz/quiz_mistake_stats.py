"""
Aggregates for quiz mistake analytics (staff-only).
"""

from __future__ import annotations

import csv
from collections import defaultdict
from io import StringIO
from typing import Any

from django.db.models import Count, F
from django.http import HttpRequest, HttpResponse

from jizz.models import Answer, Country, CountrySpecies, QuestionOption, Species

# Include a species only when it was available as an option at least this many answer opportunities.
MIN_TIMES_SHOWN = 10

# When filtering by country, exclude CountrySpecies rows with these statuses for that country.
EXCLUDED_COUNTRY_SPECIES_STATUSES = frozenset(("introduced", "uncertain", "unknown"))


def _allowed_species_ids_for_country(country_code: str) -> frozenset[int]:
    """Species that have a non-excluded status for this country in CountrySpecies."""
    return frozenset(
        CountrySpecies.objects.filter(country_id=country_code)
        .exclude(status__in=EXCLUDED_COUNTRY_SPECIES_STATUSES)
        .values_list("species_id", flat=True)
    )


def normalize_country_filter(country_code: str | None) -> str | None:
    """Return a valid Country primary key (code) or None for all countries."""
    if country_code is None or not str(country_code).strip():
        return None
    code = str(country_code).strip().upper()
    if Country.objects.filter(pk=code).exists():
        return code
    return None


def _error_rate_pct(wrong: int, correct: int) -> float | None:
    """% wrong among attempts where this species was chosen: wrong / (wrong + correct)."""
    denom = wrong + correct
    if denom <= 0:
        return None
    return 100.0 * wrong / denom


def get_species_mistake_rows(country_code: str | None = None) -> list[dict[str, Any]]:
    """
    Per species (only when the player explicitly picked the species):

    - times_shown: answers where the player picked this species (correct or incorrect).
    - correctly_answered / wrongly_answered: answers where the player picked this species.
    - error_rate: % wrong among picks of this species = wrong / (wrong + correct).

    If country_code is set, only answers from games in that country; CountrySpecies excludes
    introduced / uncertain / unknown for answers (target and pick) and for option rows.
    """
    cc = normalize_country_filter(country_code)
    answers = Answer.objects.all()
    if cc:
        answers = answers.filter(question__game__country_id=cc)
        allowed = _allowed_species_ids_for_country(cc)
        answers = answers.filter(
            question__species_id__in=allowed,
            answer_id__in=allowed,
        )

    times_shown = {
        row["answer_id"]: row["c"]
        for row in answers.values("answer_id").annotate(c=Count("id"))
    }

    picked_correct = {
        row["answer_id"]: row["c"]
        for row in answers.filter(correct=True).values("answer_id").annotate(c=Count("id"))
    }
    picked_wrong = {
        row["answer_id"]: row["c"]
        for row in answers.filter(correct=False).values("answer_id").annotate(c=Count("id"))
    }

    ids = set(times_shown) | set(picked_correct) | set(picked_wrong)
    ids.discard(None)
    if not ids:
        return []

    species_map = Species.objects.in_bulk(ids)

    rows: list[dict[str, Any]] = []
    for sid in ids:
        sp = species_map.get(sid)
        if sp is None:
            continue
        ts = times_shown.get(sid, 0)
        if ts < MIN_TIMES_SHOWN:
            continue
        cor = picked_correct.get(sid, 0)
        wr = picked_wrong.get(sid, 0)
        rows.append(
            {
                "species_id": sid,
                "name": sp.name,
                "name_latin": sp.name_latin,
                "times_shown": ts,
                "correctly_answered": cor,
                "wrongly_answered": wr,
                "error_rate": _error_rate_pct(wr, cor),
            }
        )
    return rows


def sort_species_rows(
    rows: list[dict[str, Any]], sort_key: str, descending: bool = True
) -> list[dict[str, Any]]:
    """sort_key: error_rate | times_shown — None error_rate sorts last when descending."""

    def sort_value(row: dict[str, Any]) -> float:
        if sort_key == "times_shown":
            return float(row["times_shown"])
        r = row["error_rate"]
        if r is None:
            return float("-inf") if descending else float("inf")
        return r

    return sorted(rows, key=sort_value, reverse=descending)


def get_confusion_pair_rows(country_code: str | None = None) -> list[dict[str, Any]]:
    """
    Undirected species pairs from incorrect answers, ordered by total wrong answers (desc).

    Directed columns: when the lower-ID species was the target vs when the higher-ID species was the target.

    If country_code is set, only incorrect answers from games in that country are included, and only
    where both target and picked species have allowed CountrySpecies status for that country.
    """
    cc = normalize_country_filter(country_code)
    pairs = Answer.objects.filter(correct=False).exclude(question__species_id=F("answer_id"))
    if cc:
        allowed = _allowed_species_ids_for_country(cc)
        pairs = pairs.filter(
            question__game__country_id=cc,
            question__species_id__in=allowed,
            answer_id__in=allowed,
        )
    directed = list(
        pairs.values("question__species_id", "answer_id").annotate(c=Count("id"))
    )

    pair_map: dict[tuple[int, int], dict[str, Any]] = {}

    for row in directed:
        target_id = row["question__species_id"]
        pick_id = row["answer_id"]
        c = row["c"]
        low_id, high_id = (target_id, pick_id) if target_id < pick_id else (pick_id, target_id)
        key = (low_id, high_id)
        if key not in pair_map:
            pair_map[key] = {
                "low_id": low_id,
                "high_id": high_id,
                "total_wrong": 0,
                "when_low_was_target": 0,
                "when_high_was_target": 0,
            }
        bucket = pair_map[key]
        bucket["total_wrong"] += c
        if target_id == low_id:
            bucket["when_low_was_target"] += c
        else:
            bucket["when_high_was_target"] += c

    ids = {i for p in pair_map for i in p}
    species_map = Species.objects.in_bulk(ids)

    rows: list[dict[str, Any]] = []
    for _key, bucket in pair_map.items():
        low = species_map.get(bucket["low_id"])
        high = species_map.get(bucket["high_id"])
        rows.append(
            {
                **bucket,
                "low_name": low.name if low else "",
                "high_name": high.name if high else "",
                "low_name_latin": low.name_latin if low else "",
                "high_name_latin": high.name_latin if high else "",
            }
        )

    rows.sort(key=lambda r: r["total_wrong"], reverse=True)
    return rows


def render_species_mistakes_csv(species_rows: list[dict[str, Any]]) -> str:
    buf = StringIO()
    w = csv.writer(buf)

    w.writerow(["SPECIES MISTAKES"])
    w.writerow(
        [
            "species_id",
            "name",
            "name_latin",
            "times_shown",
            "correctly_answered",
            "wrongly_answered",
            "error_rate_pct",
        ]
    )
    for row in species_rows:
        w.writerow(
            [
                row["species_id"],
                row["name"],
                row["name_latin"],
                row["times_shown"],
                row["correctly_answered"],
                row["wrongly_answered"],
                f'{row["error_rate"]:.4f}' if row["error_rate"] is not None else "",
            ]
        )

    return buf.getvalue()


def render_pairs_mistakes_csv(pair_rows: list[dict[str, Any]]) -> str:
    buf = StringIO()
    w = csv.writer(buf)

    w.writerow(["CONFUSED PAIRS (undirected)"])
    w.writerow(
        [
            "species_low_id",
            "species_high_id",
            "low_name",
            "high_name",
            "total_wrong",
            "when_low_id_was_target",
            "when_high_id_was_target",
        ]
    )
    for row in pair_rows:
        w.writerow(
            [
                row["low_id"],
                row["high_id"],
                row["low_name"],
                row["high_name"],
                row["total_wrong"],
                row["when_low_was_target"],
                row["when_high_was_target"],
            ]
        )

    return buf.getvalue()


def quiz_mistakes_species_csv_response(request: HttpRequest) -> HttpResponse:
    species_sort = request.GET.get("species_sort", "error_rate")
    if species_sort not in ("error_rate", "times_shown"):
        species_sort = "error_rate"
    country_code = normalize_country_filter(request.GET.get("country"))
    species_rows = sort_species_rows(get_species_mistake_rows(country_code), species_sort)
    content = render_species_mistakes_csv(species_rows)
    resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
    fname = "quiz-mistake-species"
    if country_code:
        fname += f"-{country_code.lower()}"
    resp["Content-Disposition"] = f'attachment; filename="{fname}.csv"'
    return resp


def quiz_mistakes_pairs_csv_response(request: HttpRequest) -> HttpResponse:
    country_code = normalize_country_filter(request.GET.get("country"))
    pair_rows = get_confusion_pair_rows(country_code)
    content = render_pairs_mistakes_csv(pair_rows)
    resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
    fname = "quiz-mistake-pairs"
    if country_code:
        fname += f"-{country_code.lower()}"
    resp["Content-Disposition"] = f'attachment; filename="{fname}.csv"'
    return resp

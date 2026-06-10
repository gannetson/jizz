from __future__ import annotations

from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import render

from jizz.games_played_stats import (
    default_date_range,
    games_played_payload,
    parse_date_param,
    parse_granularity,
)
from jizz.models import Country, TaxonomicFamily, TaxonomicOrder
from jizz.quiz_mistake_stats import normalize_country_filter
from jizz.services.checklist import CHECKLIST_COUNTRY_SPECIES_STATUSES

ORDER_SORT_FIELDS = {
    "name_latin": "name_latin",
    "name_en": "name_en",
    "species_count": "species_count",
    "count_native": "count_native",
    "count_rare": "count_rare",
    "count_endemic": "count_endemic",
}

FAMILY_SORT_FIELDS = {
    "name_latin": "name_latin",
    "order": "taxonomic_order__name_latin",
    "name_en": "name_en",
    "species_count": "species_count",
    "count_native": "count_native",
    "count_rare": "count_rare",
    "count_endemic": "count_endemic",
}

BASE_SORT_COLUMNS = ("name_latin", "name_en", "species_count")
FAMILY_BASE_SORT_COLUMNS = ("name_latin", "order", "name_en", "species_count")


def _country_context(request):
    country_code = normalize_country_filter(request.GET.get("country"))
    return {
        "countries": Country.objects.order_by("name"),
        "selected_country": country_code or "",
        "country_filter_active": bool(country_code),
        "country_code": country_code,
    }


def _parse_sort(request, allowed_columns, default="name_latin"):
    sort = request.GET.get("sort", default)
    if sort not in allowed_columns:
        sort = default
    direction = request.GET.get("dir", "asc")
    if direction not in ("asc", "desc"):
        direction = "asc"
    return sort, direction


def _apply_sort(queryset, sort_fields, sort_col, sort_dir):
    field = sort_fields[sort_col]
    prefix = "-" if sort_dir == "desc" else ""
    ordering = [f"{prefix}{field}"]
    if sort_col != "name_latin":
        ordering.append("name_latin")
    return queryset.order_by(*ordering)


def _taxon_list_context(request, *, page):
    ctx = _country_context(request)
    sort_fields = ORDER_SORT_FIELDS if page == "orders" else FAMILY_SORT_FIELDS
    allowed = list(FAMILY_BASE_SORT_COLUMNS if page == "families" else BASE_SORT_COLUMNS)
    if ctx["country_filter_active"]:
        allowed.extend(("count_native", "count_rare", "count_endemic"))
    sort_col, sort_dir = _parse_sort(request, allowed)
    ctx.update(
        {
            "sort_col": sort_col,
            "sort_dir": sort_dir,
            "sort_url_name": "data-taxon-orders" if page == "orders" else "data-taxon-families",
        }
    )
    return ctx, sort_fields, sort_col, sort_dir


def _country_status_filter(country_code: str) -> Q:
    return Q(
        species__countryspecies__country_id=country_code,
        species__countryspecies__status__in=CHECKLIST_COUNTRY_SPECIES_STATUSES,
    )


def _annotate_species_counts(queryset, country_code: str | None, sort_fields, sort_col, sort_dir):
    if country_code:
        status_filter = _country_status_filter(country_code)
        queryset = (
            queryset.annotate(
                species_count=Count("species", filter=status_filter, distinct=True),
                count_native=Count(
                    "species",
                    filter=status_filter & Q(species__countryspecies__status="native"),
                    distinct=True,
                ),
                count_rare=Count(
                    "species",
                    filter=status_filter & Q(species__countryspecies__status="rare"),
                    distinct=True,
                ),
                count_endemic=Count(
                    "species",
                    filter=status_filter & Q(species__countryspecies__status="endemic"),
                    distinct=True,
                ),
            )
            .filter(species_count__gt=0)
        )
    else:
        queryset = queryset.annotate(species_count=Count("species", distinct=True)).filter(
            species_count__gt=0
        )

    return _apply_sort(queryset, sort_fields, sort_col, sort_dir)


def data_index_view(request):
    return render(
        request,
        "jizz/data_index.html",
        {
            "active_section": "home",
        },
    )


def data_taxon_orders_view(request):
    ctx, sort_fields, sort_col, sort_dir = _taxon_list_context(request, page="orders")
    ctx.update(
        {
            "active_section": "taxons",
            "active_tab": "orders",
            "rows": _annotate_species_counts(
                TaxonomicOrder.objects.all(),
                ctx["country_code"],
                sort_fields,
                sort_col,
                sort_dir,
            ),
        }
    )
    return render(request, "jizz/data_taxon_orders.html", ctx)


def data_taxon_families_view(request):
    ctx, sort_fields, sort_col, sort_dir = _taxon_list_context(request, page="families")
    ctx.update(
        {
            "active_section": "taxons",
            "active_tab": "families",
            "rows": _annotate_species_counts(
                TaxonomicFamily.objects.select_related("taxonomic_order"),
                ctx["country_code"],
                sort_fields,
                sort_col,
                sort_dir,
            ),
        }
    )
    return render(request, "jizz/data_taxon_families.html", ctx)


def _games_played_query_params(request):
    default_start, default_end = default_date_range()
    start = parse_date_param(request.GET.get("start"), default_start)
    end = parse_date_param(request.GET.get("end"), default_end)
    granularity = parse_granularity(request.GET.get("granularity"))
    return start, end, granularity


def data_games_played_view(request):
    start, end, granularity = _games_played_query_params(request)
    payload = games_played_payload(start, end, granularity=granularity)
    return render(
        request,
        "jizz/data_games_played.html",
        {
            "active_section": "games-played",
            "start": payload["start"],
            "end": payload["end"],
            "granularity": payload["granularity"],
            "chart_json": payload,
        },
    )


def data_games_played_api_view(request):
    start, end, granularity = _games_played_query_params(request)
    return JsonResponse(games_played_payload(start, end, granularity=granularity))

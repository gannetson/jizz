from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from jizz.models import Country
from jizz.quiz_mistake_stats import (
    get_confusion_pair_rows,
    get_species_mistake_rows,
    normalize_country_filter,
    quiz_mistakes_pairs_csv_response,
    quiz_mistakes_species_csv_response,
    sort_species_rows,
)


def quiz_mistake_stats_legacy_redirect(request):
    """Old /staff/quiz-mistakes/ URL redirects to the species page."""
    url = reverse("quiz-mistake-species")
    if request.GET:
        url += "?" + request.GET.urlencode()
    return HttpResponseRedirect(url)


@staff_member_required
def quiz_mistake_species_view(request):
    if request.GET.get("format") == "csv":
        return quiz_mistakes_species_csv_response(request)

    species_sort = request.GET.get("species_sort", "error_rate")
    if species_sort not in ("error_rate", "times_shown"):
        species_sort = "error_rate"

    country_code = normalize_country_filter(request.GET.get("country"))

    species_rows = sort_species_rows(get_species_mistake_rows(country_code), species_sort)

    return render(
        request,
        "jizz/quiz_mistake_species.html",
        {
            "species_rows": species_rows,
            "species_sort": species_sort,
            "countries": Country.objects.order_by("name"),
            "selected_country": country_code or "",
            "active_tab": "species",
        },
    )


@staff_member_required
def quiz_mistake_pairs_view(request):
    if request.GET.get("format") == "csv":
        return quiz_mistakes_pairs_csv_response(request)

    country_code = normalize_country_filter(request.GET.get("country"))
    pair_rows = get_confusion_pair_rows(country_code)

    return render(
        request,
        "jizz/quiz_mistake_pairs.html",
        {
            "pair_rows": pair_rows,
            "countries": Country.objects.order_by("name"),
            "selected_country": country_code or "",
            "active_tab": "pairs",
        },
    )

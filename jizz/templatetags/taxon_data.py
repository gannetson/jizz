from urllib.parse import urlencode

from django import template
from django.urls import reverse

register = template.Library()


@register.simple_tag
def taxon_sort_href(url_name, column, sort_col, sort_dir, country=""):
    if sort_col == column:
        next_dir = "desc" if sort_dir == "asc" else "asc"
    else:
        next_dir = "asc"
    params = {"sort": column, "dir": next_dir}
    if country:
        params["country"] = country
    return reverse(url_name) + "?" + urlencode(params)


@register.simple_tag
def taxon_sort_indicator(column, sort_col, sort_dir):
    if sort_col != column:
        return ""
    return " ▲" if sort_dir == "asc" else " ▼"

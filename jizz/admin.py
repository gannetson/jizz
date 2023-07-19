from django.contrib import admin
from django.contrib.admin import register
from django.urls import reverse
from django.utils.html import format_html

from jizz.models import Country, Species, CountrySpecies, SpeciesImage


class CountrySpeciesInline(admin.TabularInline):
    model = CountrySpecies

    readonly_fields = ['link']
    fields = readonly_fields

    def link(self, obj):
        url = reverse('admin:jizz_species_change', args=((obj.species_id, )))
        return format_html('<a href="{url}">{name}</a>', url=url, name=obj.name)

    def has_add_permission(self, request, obj):
        return False


@register(Country)
class CountryAdmin(admin.ModelAdmin):
    inlines = [CountrySpeciesInline]


class SpeciesImageInline(admin.TabularInline):
    model = SpeciesImage

    readonly_fields = ['img']
    fields = ['img']

    def img(self, obj):
        return format_html("<img src='{url}' width='400px' />", url=obj.url)

    def has_add_permission(self, request, obj):
        return False


@register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    inlines = [SpeciesImageInline]

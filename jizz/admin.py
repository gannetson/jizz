from django.contrib import admin, messages
from django.contrib.admin import register
from django.http import HttpResponseRedirect
from django.urls import reverse, path, re_path
from django.utils.html import format_html

from jizz.models import Country, Species, CountrySpecies, SpeciesImage
from jizz.utils import sync_country, get_country_images


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

    readonly_fields = ['species_list', 'sync_link']
    fields = ['name', 'code', 'codes'] + readonly_fields

    def species_list(self, obj):
        return f'{obj.species.count()} species'

    def sync_link(self, obj):
        if not obj or not obj.pk:
            return '-'
        sync_url = reverse('admin:sync-species', args=(obj.pk,))
        return format_html('<a href="{}">Synchronise species</a>', sync_url)

    def get_urls(self):
        urls = super().get_urls()

        custom_urls = [
            re_path(
                r"^country/(?P<pk>.+)/sync/$",
                self.admin_site.admin_view(self.sync_species),
                name="sync-species"
            ),
        ]
        return custom_urls + urls

    def sync_species(self, request, pk=None):
        country = Country.objects.get(pk=pk)
        if not country.codes:
            country.codes = country.code
            country.save()
        sync_country(country.code)
        get_country_images(country.code)
        messages.add_message(request, messages.INFO, f'Found {country.species.count()} species.')
        country_url = reverse('admin:jizz_country_change', args=(country.pk,))
        response = HttpResponseRedirect(country_url)
        return response




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

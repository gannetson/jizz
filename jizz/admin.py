from django.contrib import admin, messages
from django.contrib.admin import register
from django.db.models import Sum
from django.http import HttpResponseRedirect
from django.urls import reverse, path, re_path
from django.utils.html import format_html

from jizz.models import Country, Species, CountrySpecies, SpeciesImage, Game, Question, SpeciesSound, SpeciesVideo, \
    Answer, Player, QuestionOption, PlayerScore
from jizz.utils import sync_country, get_country_images, get_images, sync_species, get_videos, get_sounds


class CountrySpeciesInline(admin.TabularInline):
    model = CountrySpecies

    readonly_fields = ['link']
    fields = readonly_fields

    def link(self, obj):
        url = reverse('admin:jizz_species_change', args=((obj.species_id,)))
        return format_html('<a href="{url}">{name}</a>', url=url, name=obj.name)

    def has_add_permission(self, request, obj):
        return False


@register(Country)
class CountryAdmin(admin.ModelAdmin):
    readonly_fields = ['species_list', 'sync_link']
    fields = ['name', 'code', 'codes'] + readonly_fields

    def species_list(self, obj):
        return f'{obj.countryspecies.count()} species'

    def sync_link(self, obj):
        if not obj or not obj.pk:
            return '-'
        spec_url = reverse('admin:sync-species', args=(obj.pk,))
        images_url = reverse('admin:sync-images', args=(obj.pk,))
        return format_html('<a href="{}">Synchronise species</a><br><a href="{}">Synchronise images</a>', spec_url,
                           images_url)

    def get_urls(self):
        urls = super().get_urls()

        custom_urls = [
            re_path(
                r"^country/(?P<pk>.+)/get-species/$",
                self.admin_site.admin_view(self.sync_species),
                name="sync-species"
            ),
            re_path(
                r"^country/(?P<pk>.+)/get-images/$",
                self.admin_site.admin_view(self.sync_images),
                name="sync-images"
            ),
        ]
        return custom_urls + urls

    def sync_species(self, request, pk=None):
        country = Country.objects.get(pk=pk)
        if not country.codes:
            country.codes = country.code
            country.save()
        sync_species()
        sync_country(country.code)
        # get_country_images(country.code)
        messages.add_message(request, messages.INFO, f'Found {country.species.count()} species.')
        country_url = reverse('admin:jizz_country_change', args=(country.pk,))
        response = HttpResponseRedirect(country_url)
        return response

    def sync_images(self, request, pk=None):
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


class SpeciesSoundInline(admin.TabularInline):
    model = SpeciesSound

    readonly_fields = ['snd']
    fields = ['snd']

    def snd(self, obj):
        return format_html('<audio controls> <source src="{url}" type="audio/mp3" /></audio>', url=obj.url)

    def has_add_permission(self, request, obj):
        return False


class SpeciesImageInline(admin.TabularInline):
    model = SpeciesImage

    readonly_fields = ['img']
    fields = ['img']

    def img(self, obj):
        return format_html("<img src='{url}' width='400px' />", url=obj.url)

    def has_add_permission(self, request, obj):
        return False


class SpeciesVideoInline(admin.TabularInline):
    model = SpeciesVideo

    readonly_fields = ['vid']
    fields = ['vid']

    def vid(self, obj):
        return format_html('<video controls> <source src="{url}" type="video/mp4" /></video>', url=obj.url)

    def has_add_permission(self, request, obj):
        return False


@register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    inlines = [SpeciesSoundInline, SpeciesImageInline, SpeciesVideoInline]
    searrch_fields = ['name', 'name_nl', 'name_latin']
    readonly_fields = ['sync_media', 'pic_count']
    search_fields = ['name']
    list_display = ['name', 'name_nl', 'pic_count']
    list_filter = ['tax_order']

    def pic_count(self, obj):
        return obj.images.count()

    def sync_media(self, obj):
        if not obj or not obj.pk:
            return '-'
        sync_url = reverse('admin:get-media', args=(obj.pk,))
        return format_html('<a href="{}">Get media</a>', sync_url)

    def get_urls(self):
        urls = super().get_urls()

        custom_urls = [
            re_path(
                r"^species/(?P<pk>.+)/get-media/$",
                self.admin_site.admin_view(self.get_media),
                name="get-media"
            ),
        ]
        return custom_urls + urls

    def get_media(self, request, pk=None):
        species = Species.objects.get(pk=pk)
        get_images(species.id)
        get_sounds(species.id)
        get_videos(species.id)
        messages.add_message(request, messages.INFO, f'Found {species.images.count()} images.')
        species_url = reverse('admin:jizz_species_change', args=(species.pk,))
        response = HttpResponseRedirect(species_url)
        return response


class QuestionInline(admin.TabularInline):
    model = Question
    can_delete = False
    readonly_fields = ['answered', 'correct']
    fields = ['species'] + readonly_fields

    def answered(self, obj):
        return obj.answers.count()

    def correct(self, obj):
        return obj.answers.filter(correct=True).count()

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj):
        return False


class PlayerInline(admin.TabularInline):
    model = Player
    can_delete = False

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj):
        return False


class PlayerScoreInline(admin.TabularInline):
    model = PlayerScore
    can_delete = False

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj):
        return False


@register(Game)
class GameAdmin(admin.ModelAdmin):
    inlines = [PlayerScoreInline, QuestionInline]
    raw_id_fields = ['country', 'host']
    readonly_fields = ['token', 'created', 'correct', 'errors', 'total']
    fields = ['country', 'language', 'host', 'created', 'token', 'length', 'multiplayer', 'media', 'repeat']
    list_display = ['country', 'created', 'level', 'length', 'player_count', 'top_score']

    def player_count(self, obj):
        return obj.scores.count()

    def top_score(self, obj):
        top = obj.scores.order_by('-score').first()
        if top:
            return top.score

    def correct(self, obj):
        return obj.questions.filter(correct=True).count()

    def total(self, obj):
        return obj.questions.count()

    def errors(self, obj):
        return obj.questions.aggregate(errors=Sum('errors'))['errors']


@register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    raw_id_fields = ['answer']


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    readonly_fields = ['question', 'species']


@register(Question)
class QuestionAdmin(admin.ModelAdmin):
    raw_id_fields = ['species']
    inlines = [QuestionOptionInline]


@register(Player)
class PlayerAdmin(admin.ModelAdmin):
    inlines = [PlayerScoreInline]
    raw_id_fields = ['user']
    list_display = ['name', 'token']


@register(PlayerScore)
class PlayerScoreAdmin(admin.ModelAdmin):
    raw_id_fields = ['player', 'game']
    list_display = ['player', 'game', 'score']
    list_filter = ['game__level', 'game__length', 'game__media', ('game__country', admin.RelatedOnlyFieldListFilter)]

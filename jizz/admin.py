from collections import defaultdict

from django.contrib import admin, messages
from django.contrib.admin import register
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.db.models import Count, Sum
from django.conf import settings
from django.http import HttpResponseRedirect
from django.template.loader import render_to_string
from django.urls import path, re_path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from jizz.models import (Answer, BirdrJourney, BirdrJourneyGame, ChallengeLevel, Country, CountryChallenge,
                         CountrySpecies, CountrySpeciesFrequency, Feedback, FlagQuestion, Game, JourneyLevel,
                         JourneyStep, Page, Player,
                         PlayerScore, Question, QuestionOption, Reaction,
                         Species, SpeciesIllustration, SpeciesImage, SpeciesSound, SpeciesVideo,
                         Update, CountryGame, Language, SpeciesName, UserProfile,
                         Friendship, DailyChallenge, DailyChallengeParticipant,
                         DailyChallengeInvite, DailyChallengeRound, DeviceToken, PushDevice)
from jizz.notifications import send_welcome_email
from jizz.utils import (get_country_images, get_images, get_media_citation,
                        get_sounds, get_videos, sync_country, sync_species, get_media)
from media.management.commands import standardize_copyright
from media.first_assertion.run_inference import infer_media_queryset
from media.models import Media, MediaPrediction
from media.utils import get_species_media, parse_copyright


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ['avatar', 'avatar_preview', 'receive_updates', 'language', 'country']
    readonly_fields = ['avatar_preview']

    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 100px; border-radius: 50%;" />',
                obj.avatar.url
            )
        return '-'
    avatar_preview.short_description = 'Avatar Preview'


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'avatar_preview', 'is_staff', 'date_joined']
    actions = ['resend_welcome_email']

    def avatar_preview(self, obj):
        try:
            profile = obj.profile
            if profile.avatar:
                return format_html(
                    '<img src="{}" style="max-width: 32px; max-height: 32px; border-radius: 50%;" />',
                    profile.avatar.url
                )
        except UserProfile.DoesNotExist:
            pass
        return '-'
    avatar_preview.short_description = 'Avatar'

    @admin.action(description='Resend welcome mail')
    def resend_welcome_email(self, request, queryset):
        sent = 0
        skipped = 0
        for user in queryset:
            if not user.email:
                skipped += 1
                continue
            if send_welcome_email(user):
                sent += 1
            else:
                skipped += 1
        if sent:
            self.message_user(request, f'Welcome email sent to {sent} user(s).', messages.SUCCESS)
        if skipped:
            self.message_user(request, f'Skipped or failed for {skipped} user(s) (no email or send failed).', messages.WARNING)

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<int:object_id>/resend-welcome/', self.admin_site.admin_view(self.resend_welcome_view), name='auth_user_resend_welcome'),
        ]
        return custom + urls

    def resend_welcome_view(self, request, object_id):
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, pk=object_id)
        if send_welcome_email(user):
            self.message_user(request, f'Welcome email sent to {user.email}.', messages.SUCCESS)
        else:
            self.message_user(request, f'Failed to send welcome email (no email or error).', messages.ERROR)
        return HttpResponseRedirect(reverse('admin:auth_user_change', args=[object_id]))



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
        messages.add_message(request, messages.INFO, f'Found {country.countryspecies.count()} species.')
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
        messages.add_message(request, messages.INFO, f'Found {country.countryspecies.count()} species.')
        country_url = reverse('admin:jizz_country_change', args=(country.pk,))
        response = HttpResponseRedirect(country_url)
        return response


class MediaInline(admin.TabularInline):
    model = Media
    extra = 0
    ordering = ['type', '-created']
    readonly_fields = ['media_preview', 'media_link', 'type', 'source', 'machine_assertion_brief']
    fields = ['media_preview', 'type', 'source', 'machine_assertion_brief', 'media_link']

    def get_queryset(self, request):
        """Order by type, then by created date (newest first within each type). Exclude hidden media."""
        qs = super().get_queryset(request)
        return (
            qs.filter(hide=False)
            .order_by('type', '-created')
            .select_related('first_assertion_prediction')
        )
    
    def media_preview(self, obj):
        """Display media based on type: large preview for images, inline player for video/audio."""
        if not obj or not obj.url:
            return "No media URL available"
        
        if obj.type == 'image':
            # Large preview for images
            return format_html(
                '<img src="{url}" style="max-width: 200px; max-height: 150px; width: auto; height: auto;" />',
                url=obj.url
            )
        elif obj.type == 'video':
            # Inline video player
            return format_html(
                '<video controls style="max-width: 200px; max-height: 150px;">'
                '<source src="{url}" type="video/mp4" />'
                'Your browser does not support the video tag.'
                '</video>',
                url=obj.url
            )
        elif obj.type == 'audio':
            # Inline audio player
            return format_html(
                '<audio controls style="width: 200px;">'
                '<source src="{url}" type="audio/mpeg" />'
                'Your browser does not support the audio tag.'
                '</audio>',
                url=obj.url
            )
        return "-"
    
    media_preview.short_description = 'Media'
    
    def media_link(self, obj):
        """Link to media detail admin page."""
        if not obj or not obj.pk:
            return "-"
        url = reverse('admin:media_media_change', args=(obj.pk,))
        return format_html('<a href="{}">View Details</a>', url)
    
    media_link.short_description = 'Details'

    def machine_assertion_brief(self, obj):
        if not obj or not obj.pk or obj.type != 'image':
            return '—'
        try:
            p = obj.first_assertion_prediction
        except ObjectDoesNotExist:
            return format_html('<span style="color:#888;">—</span>')
        conf = f'{p.confidence:.2f}' if p.confidence is not None else '—'
        return format_html(
            '<strong>{}</strong> {}<br/><span style="font-size:11px;color:#555;">{}</span>',
            p.get_predicted_review_type_display(),
            conf,
            p.model_version,
        )

    machine_assertion_brief.short_description = 'Machine'

    def has_add_permission(self, request, obj):
        return True


class SpeciesIllustrationInline(admin.StackedInline):
    model = SpeciesIllustration
    extra = 0
    max_num = 1
    readonly_fields = ['status', 'model_name', 'error_message', 'created', 'updated']
    fields = ['image', 'status', 'model_name', 'error_message', 'created']


@register(SpeciesIllustration)
class SpeciesIllustrationAdmin(admin.ModelAdmin):
    list_display = ['species', 'status', 'model_name', 'created']
    list_filter = ['status']
    search_fields = ['species__name', 'species__name_latin', 'species__code']
    raw_id_fields = ['species']


@register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    inlines = [SpeciesIllustrationInline, MediaInline]
    search_fields = ['name', 'name_nl', 'name_latin']
    readonly_fields = ['sync_media', 'pic_count', 'infer_machine_predictions']
    list_display = ['name', 'name_nl', 'pic_count']
    list_filter = ['tax_order']
    actions = ['scrape_traits', 'generate_comparison']

    def pic_count(self, obj):
        return obj.images.count()

    def sync_media(self, obj):
        if not obj or not obj.pk:
            return '-'
        sync_url = reverse('admin:get-media', args=(obj.pk,))
        video_url = reverse('admin:get-video', args=(obj.pk,))
        audio_url = reverse('admin:get-audio', args=(obj.pk,))
        image_url = reverse('admin:get-pics', args=(obj.pk,))

        return format_html(
            '<a href="{}">Get all media</a><br/>'
            '<a href="{}">Get pics</a><br/>'
            '<a href="{}">Get video</a><br/>'
            '<a href="{}">Get audio</a><br/>',
            sync_url, image_url, video_url, audio_url)

    def infer_machine_predictions(self, obj):
        if not obj or not obj.pk:
            return '-'
        base = reverse('admin:infer-machine-assertions', args=(obj.pk,))
        missing = f'{base}?only_missing=1'
        all_imgs = f'{base}?only_missing=0'
        default_ver = getattr(settings, 'MEDIA_FIRST_ASSERTION_DEFAULT_MODEL_VERSION', '') or 'first_assertion_v1'
        hint = format_html(
            '<p style="margin:0.35em 0 0 0;font-size:12px;color:#555;">Uses model version '
            '<code>{}</code> from settings (<code>MEDIA_FIRST_ASSERTION_DEFAULT_MODEL_VERSION</code>); '
            'override with <code>?model_version=...</code> or <code>?artifact_path=...</code>.</p>',
            default_ver,
        )
        return format_html(
            '<a class="button" style="margin-right:8px;" href="{}">Infer machine assertions (missing only)</a>'
            '<a class="button" href="{}">Re-infer all images for this species</a>{}',
            missing,
            all_imgs,
            hint,
        )

    infer_machine_predictions.short_description = 'Machine inference'

    def get_urls(self):
        urls = super().get_urls()

        custom_urls = [
            re_path(
                r"^species/(?P<pk>.+)/get-media/$",
                self.admin_site.admin_view(self.get_media),
                name="get-media"
            ),
            re_path(
                r"^species/(?P<pk>.+)/get-pics/$",
                self.admin_site.admin_view(self.get_pics),
                name="get-pics"
            ),
            re_path(
                r"^species/(?P<pk>.+)/get-audio/$",
                self.admin_site.admin_view(self.get_audio),
                name="get-audio"
            ),
            re_path(
                r"^species/(?P<pk>.+)/get-video/$",
                self.admin_site.admin_view(self.get_video),
                name="get-video"
            ),
            re_path(
                r"^species/(?P<pk>.+)/infer-machine-assertions/$",
                self.admin_site.admin_view(self.infer_machine_assertions),
                name="infer-machine-assertions",
            ),
            re_path(
                r"^species/compare/$",
                self.admin_site.admin_view(self.compare_species),
                name="compare-species"
            ),
        ]
        return custom_urls + urls

    def get_pics(self, request, pk=None):
        return self.get_media(request, pk, 'image')

    def get_audio(self, request, pk=None):
        return self.get_media(request, pk, 'audio')

    def get_video(self, request, pk=None):
        return self.get_media(request, pk, 'video')

    def infer_machine_assertions(self, request, pk=None):
        """Run first-assertion inference for this species' image media (GET, staff-only)."""
        species = Species.objects.get(pk=pk)
        only_missing = request.GET.get('only_missing', '1') not in ('0', 'false', 'False')
        model_version = request.GET.get('model_version') or getattr(
            settings, 'MEDIA_FIRST_ASSERTION_DEFAULT_MODEL_VERSION', None
        )
        artifact_path = request.GET.get('artifact_path')

        if not artifact_path and not model_version:
            messages.add_message(
                request,
                messages.ERROR,
                'Set MEDIA_FIRST_ASSERTION_DEFAULT_MODEL_VERSION or pass ?model_version= or ?artifact_path=.',
            )
            return HttpResponseRedirect(reverse('admin:jizz_species_change', args=(species.pk,)))

        base = (
            Media.objects.filter(species_id=species.pk, type='image')
            .exclude(url__isnull=True)
            .exclude(url='')
        )
        if only_missing:
            predicted_ids = MediaPrediction.objects.values_list('media_id', flat=True)
            qs = base.exclude(pk__in=predicted_ids)
        else:
            qs = base

        try:
            n_ok, n_skip, ver = infer_media_queryset(
                qs,
                artifact_path=artifact_path or None,
                model_version=model_version,
            )
            messages.add_message(
                request,
                messages.SUCCESS,
                f'Machine inference ({ver}): {n_ok} image(s) updated, {n_skip} skipped for species {species.pk}.',
            )
        except FileNotFoundError as exc:
            messages.add_message(
                request,
                messages.ERROR,
                f'Model artifact not found ({exc}). Train with train_media_first_assertion_model or set '
                'MEDIA_FIRST_ASSERTION_DEFAULT_MODEL_VERSION / pass ?artifact_path=.',
            )
        except ValueError as exc:
            messages.add_message(request, messages.ERROR, str(exc))
        except Exception as exc:
            messages.add_message(request, messages.ERROR, f'Inference failed: {exc}')

        species_url = reverse('admin:jizz_species_change', args=(species.pk,))
        return HttpResponseRedirect(species_url)

    def get_media(self, request, pk=None, media_type=None):
        species = Species.objects.get(pk=pk)
        if media_type:
            results = get_species_media(species, [media_type])
        else:
            results = get_species_media(species)
        for media in results:
            for result in results[media]:
                cc_text = result['copyright_text'] or ''
                cc = parse_copyright(cc_text)
                # get_or_create can raise MultipleObjectsReturned if we already have duplicates.
                # In admin scrape flows, it's better to be resilient and reuse an existing row.
                qs = Media.objects.filter(
                    species=species,
                    url=result['url'],
                    type=result['type'],
                ).order_by('id')
                obj = qs.first()
                if obj is None:
                    Media.objects.create(
                        species=species,
                        url=result['url'],
                        type=result['type'],
                        link=result['link'],
                        contributor=result['contributor'],
                        source=result['source'],
                        copyright_text=cc_text,
                        copyright_standardized=cc[0],
                        non_commercial_only=cc[1],
                    )
                else:
                    # Keep the first row; update metadata in case scrapers changed.
                    Media.objects.filter(pk=obj.pk).update(
                        link=result['link'],
                        contributor=result['contributor'],
                        source=result['source'],
                        copyright_text=cc_text,
                        copyright_standardized=cc[0],
                        non_commercial_only=cc[1],
                    )
        image_count = species.media.filter(type='image').count()
        video_count = species.media.filter(type='video').count()
        audio_count = species.media.filter(type='audio').count()
        if media_type == 'image':
            messages.add_message(request, messages.INFO, f'Found {image_count} images.')
        elif media_type == 'video':
            messages.add_message(request, messages.INFO, f'Found {video_count} videos.')
        elif media_type == 'audio':
            messages.add_message(request, messages.INFO, f'Found {audio_count} sound files.')
        else:
            messages.add_message(request, messages.INFO, f'Found {image_count} images, {video_count} videos, and {audio_count} sound files.')

        species_url = reverse('admin:jizz_species_change', args=(species.pk,))
        response = HttpResponseRedirect(species_url)
        return response

    def scrape_traits(self, request, queryset):
        """Admin action to scrape traits for selected species."""
        from compare.scraper import BirdsOfTheWorldScraper
        from compare.models import SpeciesTrait
        from django.db import transaction
        
        scraper = BirdsOfTheWorldScraper()
        total_created = 0
        total_updated = 0
        errors = []
        
        for species in queryset:
            try:
                # Pass species name and scientific name to help find correct Birds of the World code
                scraped_data = scraper.scrape_species(
                    species.code,
                    species_name=species.name,
                    scientific_name=species.name_latin
                )
                
                if not scraped_data or 'traits' not in scraped_data:
                    errors.append(f"{species.name}: No data found")
                    continue
                
                with transaction.atomic():
                    for category, trait_data in scraped_data['traits'].items():
                        trait, created = SpeciesTrait.objects.get_or_create(
                            species=species,
                            category=category,
                            title=trait_data['title'],
                            defaults={
                                'content': trait_data['content'],
                                'source_url': scraped_data.get('source_url'),
                                'section': trait_data.get('section')
                            }
                        )
                        
                        if created:
                            total_created += 1
                        else:
                            # Update existing trait
                            trait.content = trait_data['content']
                            trait.source_url = scraped_data.get('source_url')
                            trait.section = trait_data.get('section')
                            trait.save()
                            total_updated += 1
            except Exception as e:
                errors.append(f"{species.name}: {str(e)}")
        
        # Show results
        if total_created > 0 or total_updated > 0:
            self.message_user(
                request,
                f'Successfully scraped {queryset.count()} species: '
                f'{total_created} traits created, {total_updated} traits updated.',
                messages.SUCCESS
            )
        if errors:
            self.message_user(
                request,
                f'Errors: {"; ".join(errors)}',
                messages.ERROR
            )
    scrape_traits.short_description = 'Scrape traits from Birds of the World'

    def generate_comparison(self, request, queryset):
        """Admin action to generate comparison between two species."""
        if queryset.count() != 2:
            self.message_user(
                request,
                'Please select exactly 2 species to compare.',
                messages.ERROR
            )
            return
        
        species_1, species_2 = queryset[0], queryset[1]
        
        # Check if comparison already exists
        from compare.models import SpeciesComparison
        existing = SpeciesComparison.objects.filter(
            comparison_type='species',
            species_1=species_1,
            species_2=species_2
        ).first()
        
        if existing:
            # Redirect to existing comparison
            comparison_url = reverse('admin:compare_speciescomparison_change', args=(existing.pk,))
            messages.add_message(request, messages.INFO, 'Comparison already exists.')
            return HttpResponseRedirect(comparison_url)
        
        # Generate new comparison
        from compare.ai_service import AIComparisonService
        from compare.models import SpeciesTrait
        
        # Get traits for both species
        traits_1 = {}
        traits_2 = {}
        
        for trait in SpeciesTrait.objects.filter(species=species_1):
            if trait.category not in traits_1:
                traits_1[trait.category] = []
            traits_1[trait.category].append({
                'title': trait.title,
                'content': trait.content
            })
        
        for trait in SpeciesTrait.objects.filter(species=species_2):
            if trait.category not in traits_2:
                traits_2[trait.category] = []
            traits_2[trait.category].append({
                'title': trait.title,
                'content': trait.content
            })
        
        # Format traits for AI service
        def format_traits(traits_dict):
            formatted = {}
            for category, trait_list in traits_dict.items():
                formatted[category] = {
                    'title': category.replace('_', ' ').title(),
                    'content': '\n\n'.join([t['content'] for t in trait_list])
                }
            return formatted
        
        traits_1_formatted = format_traits(traits_1)
        traits_2_formatted = format_traits(traits_2)
        
        if not traits_1_formatted:
            self.message_user(
                request,
                f'No traits found for {species_1.name}. Please scrape traits first.',
                messages.ERROR
            )
            return
        
        if not traits_2_formatted:
            self.message_user(
                request,
                f'No traits found for {species_2.name}. Please scrape traits first.',
                messages.ERROR
            )
            return
        
        # Generate comparison
        try:
            ai_service = AIComparisonService()
            # Add scientific names to traits for better name matching
            traits_1_formatted['name_latin'] = species_1.name_latin
            traits_2_formatted['name_latin'] = species_2.name_latin
            comparison_data = ai_service.generate_species_comparison(
                traits_1_formatted, traits_2_formatted, species_1.name, species_2.name
            )
            
            # Create comparison object
            comparison = SpeciesComparison.objects.create(
                comparison_type='species',
                species_1=species_1,
                species_2=species_2,
                **comparison_data
            )
            
            # Redirect to the new comparison
            comparison_url = reverse('admin:compare_speciescomparison_change', args=(comparison.pk,))
            messages.add_message(
                request,
                messages.SUCCESS,
                f'Successfully generated comparison between {species_1.name} and {species_2.name}.'
            )
            return HttpResponseRedirect(comparison_url)
            
        except Exception as e:
            self.message_user(
                request,
                f'Error generating comparison: {str(e)}',
                messages.ERROR
            )
    generate_comparison.short_description = 'Generate comparison between two selected species'

    def compare_species(self, request):
        """Custom view for comparing species (alternative to action)."""
        from django.shortcuts import render
        from compare.models import SpeciesComparison
        from compare.ai_service import AIComparisonService
        from compare.models import SpeciesTrait
        
        if request.method == 'POST':
            species_1_id = request.POST.get('species_1')
            species_2_id = request.POST.get('species_2')
            
            if not species_1_id or not species_2_id:
                messages.add_message(request, messages.ERROR, 'Please select both species.')
                return HttpResponseRedirect(reverse('admin:jizz_species_changelist'))
            
            species_1 = Species.objects.get(id=species_1_id)
            species_2 = Species.objects.get(id=species_2_id)
            
            # Check if comparison exists
            existing = SpeciesComparison.objects.filter(
                comparison_type='species',
                species_1=species_1,
                species_2=species_2
            ).first()
            
            if existing:
                comparison_url = reverse('admin:compare_speciescomparison_change', args=(existing.pk,))
                return HttpResponseRedirect(comparison_url)
            
            # Generate comparison (same logic as action)
            # ... (implementation similar to generate_comparison action)
        
        # Show form
        species_list = Species.objects.all().order_by('name')
        context = {
            'species_list': species_list,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
        }
        return render(request, 'admin/jizz/species/compare_form.html', context)


@register(Language)
class LanguageAdmin(admin.ModelAdmin):
    fields = ['code', 'name']


@register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'show']
    list_editable = ['show']
    prepopulated_fields = {'slug': ('title',)}
    fields = ['title', 'slug', 'content', 'show']


@register(SpeciesName)
class SpeciesNameAdmin(admin.ModelAdmin):
    readonly_fields = ['language', 'species']
    fields = ['language', 'species', 'name']
    list_display = ['name', 'language', 'species']
    list_filter = ['language']
    search_fields = ['name', 'species__name']



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
    readonly_fields = ['game', 'score', 'playtime']
    fields = ['game', 'score', 'playtime', 'player']

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj):
        return False


@register(Game)
class GameAdmin(admin.ModelAdmin):
    inlines = [PlayerScoreInline, QuestionInline]
    raw_id_fields = ['country', 'host']
    readonly_fields = ['token', 'created', 'correct', 'errors', 'total']
    fields = [
        'country', 'language', 'host', 'created', 'token',
        'length', 'multiplayer', 'media', 'repeat', 'rarity', 'include_escapes',
        'tax_order', 'tax_family'
    ]
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
    search_fields = ['name', 'user__username']
    raw_id_fields = ['user']
    list_display = ['name', 'games', 'playtime']
    readonly_fields = ['token', 'created',  'games', 'playtime']
    fields = ['user', ] + readonly_fields

@register(PlayerScore)
class PlayerScoreAdmin(admin.ModelAdmin):
    raw_id_fields = ['player', 'game']
    list_display = ['player', 'game', 'progress', 'length', 'score']
    list_filter = ['game__level', 'game__length', 'game__media', ('game__country', admin.RelatedOnlyFieldListFilter)]
    readonly_fields = ['playtime', 'order_score']
    fields = ['player', 'game', 'score', 'playtime', 'order_score']

    def order_score(self, obj):
        results = obj.answers.values('question__species__tax_order', 'correct').annotate(correct_count=Count('correct'))
        order_counts = defaultdict(lambda: {'True': 0, 'False': 0})

        for entry in results:
            tax_order = entry['question__species__tax_order']
            correct = str(entry['correct'])
            count = entry['correct_count']
            order_counts[tax_order][correct] = count
            order_counts[tax_order]['percentage'] = int(order_counts[tax_order]['True'] / (order_counts[tax_order]['True'] + order_counts[tax_order]['False']) * 100)

        order_counts = dict(order_counts)
        context = {'order_counts': order_counts}
        html = render_to_string('jizz/order_score.html', context)
        return mark_safe(html)

    def progress(self, obj):
        questions = obj.answers.count()
        correct = obj.answers.filter(correct=True).count()
        return f"{correct} / {questions}"

    def length(self, obj):
        return obj.game.length


class CountrySpeciesFrequencyInline(admin.TabularInline):
    model = CountrySpeciesFrequency
    extra = 0
    fields = [
        'reference_year',
        'month',
        'frequency_pct',
        'frequency',
        'checklist_count',
        'observation_count',
        'occupied_subregions',
        'confidence',
        'is_vagrant_like',
        'source',
        'source_updated_at',
    ]
    readonly_fields = ['source_updated_at']


@register(CountrySpecies)
class CountrySpeciesAdmin(admin.ModelAdmin):
    list_display = ['name', 'country', 'species', 'status', 'frequency', 'frequency_pct']
    search_fields = ['species__name', 'species__name_nl', 'species__name_latin']
    list_filter = ['status', 'frequency', 'country']
    raw_id_fields = ['species', 'country']
    list_editable = ['status', 'frequency']
    inlines = [CountrySpeciesFrequencyInline]


@register(CountrySpeciesFrequency)
class CountrySpeciesFrequencyAdmin(admin.ModelAdmin):
    list_display = [
        'country_species',
        'reference_year',
        'month',
        'frequency_pct',
        'frequency',
        'confidence',
        'is_vagrant_like',
        'source',
        'source_updated_at',
    ]
    list_filter = ['month', 'frequency', 'reference_year', 'confidence', 'source', 'is_vagrant_like']
    raw_id_fields = ['country_species']
    search_fields = ['country_species__species__name', 'country_species__species__code', 'notes']


@register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    readonly_fields = ['player', 'comment', 'rating']
    list_display = ['player', 'comment', 'rating']


class ReactionAdminInline(admin.StackedInline):
    readonly_fields = ['created']
    model = Reaction
    extra = 0


@register(Update)
class UpdateAdmin(admin.ModelAdmin):
    readonly_fields = ['created']
    list_display = ['created', 'user', 'message']
    inlines = [ReactionAdminInline]


class CountryGameInline(admin.TabularInline):
    model = CountryGame
    readonly_fields = ['game', 'challenge_level', 'created', 'status', 'remaining_jokers']
    fields = readonly_fields
    can_delete = False
    extra = 0

    def has_add_permission(self, request, obj):
        return False

@admin.register(CountryChallenge)
class CountryChallengeAdmin(admin.ModelAdmin):
    list_display = ['country', 'player', 'created']
    list_filter = ['country', 'player']
    readonly_fields = ['created']
    inlines = [CountryGameInline]
    raw_id_fields = ['player', 'country']


@admin.register(ChallengeLevel)
class ChallengeLevelAdmin(admin.ModelAdmin):
    list_display = ['sequence', 'level', 'title', 'media', 'length', 'jokers', 'rarity', 'include_escapes']
    list_filter = ['level', 'media', 'rarity', 'include_escapes']
    search_fields = ['title', 'description']
    ordering = ['sequence']


class JourneyStepInline(admin.TabularInline):
    model = JourneyStep
    extra = 1
    fields = [
        'sequence', 'step_type', 'level', 'length', 'jokers', 'rarity',
        'include_escapes', 'media', 'tax_order',
    ]


@admin.register(JourneyLevel)
class JourneyLevelAdmin(admin.ModelAdmin):
    list_display = ['sequence', 'title', 'icon_preview', 'step_count']
    search_fields = ['title', 'description']
    ordering = ['sequence']
    inlines = [JourneyStepInline]

    def icon_preview(self, obj):
        if obj.icon:
            return format_html(
                '<img src="{}" style="max-width: 48px; max-height: 48px;" />',
                obj.icon.url,
            )
        return '-'
    icon_preview.short_description = 'Icon'

    def step_count(self, obj):
        return obj.steps.count()
    step_count.short_description = 'Steps'


class BirdrJourneyGameInline(admin.TabularInline):
    model = BirdrJourneyGame
    readonly_fields = ['journey_step', 'game', 'created', 'status', 'remaining_jokers']
    fields = readonly_fields
    can_delete = False
    extra = 0

    def has_add_permission(self, request, obj):
        return False


@admin.register(BirdrJourneyGame)
class BirdrJourneyGameAdmin(admin.ModelAdmin):
    list_display = ['birdr_journey', 'journey_step', 'game', 'status', 'remaining_jokers', 'created']
    list_filter = ['created']
    readonly_fields = ['birdr_journey', 'journey_step', 'game', 'created', 'status', 'remaining_jokers']
    raw_id_fields = ['birdr_journey', 'journey_step', 'game']

    def has_add_permission(self, request):
        return False


@admin.register(BirdrJourney)
class BirdrJourneyAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'player', 'country', 'current_sequence', 'current_step_sequence',
        'streak_days', 'last_played_date', 'updated',
    ]
    list_filter = ['country', 'current_sequence']
    search_fields = ['user__username', 'player__name']
    readonly_fields = ['created', 'updated']
    raw_id_fields = ['user', 'player', 'country']
    inlines = [BirdrJourneyGameInline]


@register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'avatar_preview', 'receive_updates', 'language', 'country', 'created', 'updated']
    list_filter = ['receive_updates', 'language', 'country', 'created', 'updated']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['created', 'updated', 'avatar_preview']
    fields = ['user', 'avatar', 'avatar_preview', 'receive_updates', 'language', 'country', 'created', 'updated']
    raw_id_fields = ['user']
    
    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 100px;" />',
                obj.avatar.url
            )
        return '-'
    avatar_preview.short_description = 'Avatar Preview'


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ['from_user', 'to_user', 'status', 'created']
    list_filter = ['status', 'created']
    search_fields = ['from_user__username', 'to_user__username']
    raw_id_fields = ['from_user', 'to_user']


class DailyChallengeParticipantInline(admin.TabularInline):
    model = DailyChallengeParticipant
    raw_id_fields = ['user', 'invited_by']
    extra = 0


class DailyChallengeInviteInline(admin.TabularInline):
    model = DailyChallengeInvite
    extra = 0


class DailyChallengeRoundInline(admin.TabularInline):
    model = DailyChallengeRound
    raw_id_fields = ['game']
    extra = 0


@admin.register(DailyChallenge)
class DailyChallengeAdmin(admin.ModelAdmin):
    list_display = ['id', 'token', 'creator', 'country', 'media', 'length', 'duration_days', 'status', 'started_at', 'created']
    list_filter = ['status', 'media', 'created']
    search_fields = ['creator__username', 'token']
    raw_id_fields = ['creator', 'country']
    inlines = [DailyChallengeParticipantInline, DailyChallengeInviteInline, DailyChallengeRoundInline]


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'platform', 'created', 'last_used']
    list_filter = ['platform', 'created']
    search_fields = ['user__username']
    raw_id_fields = ['user']


@admin.register(PushDevice)
class PushDeviceAdmin(admin.ModelAdmin):
    list_display = ['user', 'platform', 'enabled', 'updated_at']
    list_filter = ['platform', 'enabled']
    search_fields = ['user__username', 'expo_push_token']
    raw_id_fields = ['user']

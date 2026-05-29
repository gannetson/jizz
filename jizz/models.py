import math
import uuid
from datetime import timedelta
from random import randint, shuffle, random

from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Sum, Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.functional import lazy
from django.utils.timezone import now
from shortuuid.django_fields import ShortUUIDField

try:
    from django_quill.fields import QuillField
except ImportError:
    QuillField = models.TextField  # fallback if django-quill-editor not installed


class Country(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, primary_key=True)
    codes = models.CharField(max_length=400, null=True, blank=True)

    @property
    def count(self):
        return self.countryspecies.count()

    def __str__(self):
        return self.name

    def __repr__(self):
        return self.code

    class Meta:
        verbose_name = 'country'
        verbose_name_plural = 'countries'
        ordering = ['name']


class Question(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    game = models.ForeignKey('jizz.Game', related_name='questions', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', related_name='questions', on_delete=models.CASCADE)
    options = models.ManyToManyField('jizz.Species', through='jizz.QuestionOption')
    number = models.IntegerField(default=0)
    errors = models.IntegerField(default=0)
    done = models.BooleanField(default=False)
    sequence = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.game} - {self.species}'


class QuestionMediaReady(models.Model):
    """Client reports when primary media finished loading; scoring time uses ready_at instead of question.created."""

    player = models.ForeignKey('Player', on_delete=models.CASCADE, related_name='question_media_ready')
    question = models.ForeignKey('Question', on_delete=models.CASCADE, related_name='media_ready')
    ready_at = models.DateTimeField()

    class Meta:
        unique_together = [('player', 'question')]

    def __str__(self):
        return f'{self.player} Q{self.question_id} @ {self.ready_at}'


class QuestionOption(models.Model):
    question = models.ForeignKey('jizz.Question', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', on_delete=models.CASCADE)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']


class Species(models.Model):
    name = models.CharField(max_length=200)
    name_latin = models.CharField(max_length=200)
    name_nl = models.CharField(max_length=200, null=True, blank=True)
    tax_family_en = models.CharField('Family english', max_length=200, null=True, blank=True)
    tax_family = models.CharField('Family', max_length=200, null=True, blank=True)
    tax_order = models.CharField('Order', max_length=200, null=True, blank=True)
    code = models.CharField(max_length=10)

    @property
    def filtered_media(self):
        """Media that are not rejected. Used as fallback when no approved media exist."""
        return self.media.exclude(reviews__review_type='rejected')

    def _eligible_media(self, media_type):
        """
        Media for game use: approved only, or if none approved then not rejected.
        Ordered by id so index (question.number) is stable.
        """
        approved = self.media.filter(
            type=media_type
        ).filter(reviews__review_type='approved').distinct()
        if approved.exists():
            return approved.order_by('id')
        return self.media.filter(
            type=media_type
        ).exclude(reviews__review_type='rejected').order_by('id')

    @property
    def images(self):
        return self._eligible_media('image')

    @property
    def videos(self):
        return self._eligible_media('video')

    @property
    def sounds(self):
        return self._eligible_media('audio')

    class Meta:
        verbose_name = 'species'
        verbose_name_plural = 'species'
        ordering = ['id']

    def __str__(self):
        return self.name


class SpeciesIllustration(models.Model):
    """AI-generated field-guide style drawing (white background), one per species."""

    STATUS_PENDING = 'pending'
    STATUS_READY = 'ready'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_READY, 'Ready'),
        (STATUS_FAILED, 'Failed'),
    ]

    species = models.OneToOneField(
        Species,
        on_delete=models.CASCADE,
        related_name='illustration',
    )
    image = models.ImageField(
        upload_to='species_illustrations/',
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    model_name = models.CharField(max_length=64, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'species illustration'
        verbose_name_plural = 'species illustrations'

    def __str__(self):
        return f'Illustration for {self.species_id} ({self.status})'


class Language(models.Model):
    code = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class Page(models.Model):
    """Simple CMS page for Help content. Content is Quill rich text (delta JSON); supports images and formatting."""
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    content = QuillField(blank=True)
    show = models.BooleanField(default=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class SpeciesName(models.Model):
    species = models.ForeignKey(Species, on_delete=models.CASCADE)
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)


def get_tax_order_choices(country=None):
    qs = Species.objects.all()

    if country is not None:
        qs = qs.filter(countryspecies__country=country)

    tax_orders = (
        qs.values('tax_order')
        .annotate(
            count=Count('id'),
            first=Min('id')
        )
        .order_by('first')
    )

    return [
        (o['tax_order'], f"{o['tax_order']} ({o['count']})")
        for o in tax_orders
    ]

from django.db.models import Count, Min


def get_tax_family_choices(country=None):
    qs = Species.objects.all()

    if country is not None:
        qs = qs.filter(countryspecies__country=country)

    families = (
        qs.values('tax_family', 'tax_family_en')
        .annotate(
            count=Count('id'),
            first=Min('id')
        )
        .order_by('first')
    )

    return [
        (f['tax_family'], f"{f['tax_family']} - {f['tax_family_en']} ({f['count']})") for f in families
    ]


class Game(models.Model):
    """
    Represents a game session in the Birdr application.
    
    A game contains:
    - Configuration: country, level, length, media type, filters
    - Questions: Generated on-demand as the game progresses
    - Player scores: Tracked for multiplayer games
    - State: ended flag indicates completion
    
    Game Lifecycle:
    1. Created via POST /api/games/ with configuration
    2. Questions generated lazily via add_question() method
    3. Progresses through questions until sequence > length
    4. Marked as ended when all questions completed
    
    See docs/GAME_LIFECYCLE.md for complete documentation.
    """
    MEDIA_CHOICES = [
        ('images', 'Images'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    ]

    country = models.ForeignKey('jizz.Country', on_delete=models.SET_NULL, null=True)
    language = models.CharField(max_length=100, default='en')
    token = ShortUUIDField(
        length=8,
        max_length=10,
        alphabet="abcdefghijklmnopqrstuvwxyz",
    )
    created = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=100)
    multiplayer = models.BooleanField(default=False)
    length = models.IntegerField(default=0)
    media = models.CharField(max_length=10, default='images', choices=MEDIA_CHOICES)
    repeat = models.BooleanField(default=False)
    RARIT_FAMILIAR = 'familiar'
    RARIT_REGULAR = 'regular'
    RARIT_EXCEPTIONAL = 'exceptional'
    RARIT_CHOICES = [
        (RARIT_FAMILIAR, 'Familiar'),
        (RARIT_REGULAR, 'Regular'),
        (RARIT_EXCEPTIONAL, 'Exceptional'),
    ]
    # Relative abundance tiers allowed when picking species (CountrySpecies.frequency).
    RARIT_FREQUENCY_TIERS = {
        RARIT_FAMILIAR: (
            'abundant',
            'very_common',
            'common',
        ),
        RARIT_REGULAR: (
            'abundant',
            'very_common',
            'common',
            'fairly_common',
            'uncommon',
            'rare',
        ),
        RARIT_EXCEPTIONAL: (
            'abundant',
            'very_common',
            'common',
            'fairly_common',
            'uncommon',
            'rare',
            'very_rare',
            'vagrant',
        ),
    }
    rarity = models.CharField(
        max_length=20,
        default=RARIT_REGULAR,
        choices=RARIT_CHOICES,
        help_text='Filter CountrySpecies by frequency tier for question selection.',
    )
    include_escapes = models.BooleanField(default=False)
    host = models.ForeignKey('jizz.Player', null=True, related_name='host', on_delete=models.CASCADE)
    force_ended = models.BooleanField(
        default=False,
        help_text='True when a player ended the session early (WebSocket end_game) before all rounds.',
    )

    tax_family = models.CharField(
        'Taxonomic family',
        help_text='Only show birds from this family',
        max_length=100,
        choices=lazy(get_tax_family_choices, tuple)(),
        null=True,
        blank=True
    )

    tax_order = models.CharField(
        'Taxonomic order',
        help_text='Only show birds from this order',
        max_length=100,
        choices=lazy(get_tax_order_choices, tuple)(),
        null=True,
        blank=True
    )

    @classmethod
    def frequency_filter_q(cls, rarity=None) -> Q:
        """Q filter for species linked to the game country with allowed frequency tiers."""
        tier = rarity or cls.RARIT_REGULAR
        freqs = cls.RARIT_FREQUENCY_TIERS.get(tier, cls.RARIT_FREQUENCY_TIERS[cls.RARIT_REGULAR])
        q = Q(countryspecies__frequency__in=freqs)
        if tier in (cls.RARIT_REGULAR, cls.RARIT_EXCEPTIONAL):
            q |= Q(countryspecies__frequency__isnull=True) | Q(countryspecies__frequency='')
        return q

    @classmethod
    def country_species_rarity_q(cls, rarity=None) -> Q:
        """Same tier rules as ``frequency_filter_q`` on ``CountrySpecies`` rows."""
        tier = rarity or cls.RARIT_REGULAR
        freqs = cls.RARIT_FREQUENCY_TIERS.get(tier, cls.RARIT_FREQUENCY_TIERS[cls.RARIT_REGULAR])
        q = Q(frequency__in=freqs)
        if tier in (cls.RARIT_REGULAR, cls.RARIT_EXCEPTIONAL):
            q |= Q(frequency__isnull=True) | Q(frequency='')
        return q

    @property
    def current_highscore(self):
        return PlayerScore.highscore_by_type(
            level=self.level,
            country=self.country,
            length=self.length,
            media=self.media,
            rarity=self.rarity,
        )

    @property
    def ended(self):
        if self.force_ended:
            return True
        return self.questions.filter(done=True).count() >= self.length

    @property
    def last_question(self):
        return self.questions.last()

    def add_question(self):
        """
        Generate a new question for this game.

        If there is already an active (undone) round that is not finished yet
        (no host answer — see ``can_advance_to_next_question``), returns that
        question and does not create another. This makes duplicate WebSocket/API
        calls idempotent and prevents skipped rounds.

        Process when advancing:
        1. Mark all previous undone questions as done
        2. Select random species based on game filters
        3. Select random media item for the species
        4. Generate answer options based on game level
        5. Create Question and QuestionOption instances

        Returns:
            Question instance or None if game has ended

        Note: Questions are generated lazily (on-demand) rather than
        all at once. This allows for dynamic game progression.

        See docs/GAME_LIFECYCLE.md for detailed documentation.

        Concurrent callers (e.g. many HTTP GETs on /api/games/<token>/question/ when
        ``game_started`` is broadcast) must serialize on this game row or each request
        can observe no active question and create duplicate rounds (sequence jumps).
        """
        with transaction.atomic():
            # Lock only jizz_game — select_related + FOR UPDATE breaks PostgreSQL
            # ("nullable side of an outer join") when FKs like country are nullable.
            game = Game.objects.select_for_update(of=("self",)).get(pk=self.pk)
            current = game.question
            if current is not None and not game.can_advance_to_next_question():
                return current

            game.questions.filter(done=False).update(done=True)
            return Game._add_question_body(game)

    @staticmethod
    def _add_question_body(game):
        """Create the next question row; caller must hold ``game`` locked in ``add_question``."""
        from jizz.game_question_selection import create_question_for_game

        return create_question_for_game(game)

    @property
    def question(self):
        """
        Get the current active (undone) question.

        Returns the first question where done=False, ordered by sequence,
        ensuring players always get the current question, not a completed one.

        Returns:
            Question instance or None if no active question exists
        """
        return self.questions.filter(done=False).order_by('sequence').first()

    def can_advance_to_next_question(self):
        """
        True when the current round may be closed and a new one created.

        Requires an answer from the game host on the current question so duplicate
        ``next_question`` / ``start_game`` WebSocket actions cannot skip rounds.
        If ``host`` is unset, any answer on the current question suffices.
        """
        current = self.question
        if current is None:
            return False
        host = self.host
        if host is None:
            return current.answers.exists()
        return current.answers.filter(player_score__player_id=host.id).exists()

    @property
    def progress(self):
        return self.questions.count()

    def __str__(self):
        return f'{self.country} - {self.level} - {self.created.strftime("%X %x")}'


class CountryBadges(models.Model):
    player = models.ForeignKey('jizz.Player', on_delete=models.CASCADE)
    country = models.ForeignKey('jizz.Country', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)


class Player(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('auth.User', blank=True, null=True, on_delete=models.CASCADE)
    ip = models.GenericIPAddressField(null=True, blank=True)
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=100, default='en')
    token = models.CharField(max_length=100, default=uuid.uuid4, editable=False)
    score = models.IntegerField(default=0)

    @property
    def games(self):
        return self.scores.count()

    @property
    def country_badges(self):
        return self.scores.filter(
            game__length=20,
            score__gte=6000,
            game__level='advanced'
        ).order_by('score').distinct('game__country')

    @property
    def play_time(self):
        return sum([score.play_time for score in self.scores.all()], timedelta())

    @property
    def playtime(self):
        seconds = self.play_time.total_seconds()
        hours = round(seconds // 3600)
        minutes = round((seconds % 3600) // 60)
        if hours == 0:
            return f'{minutes} minutes'
        return f'{hours} hours and {minutes} minutes'

    def __str__(self):
        return f"{self.name} - #{self.id}"


class UserProfile(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    receive_updates = models.BooleanField(default=False, help_text='Receive updates about Birdr app')
    language = models.CharField(max_length=10, default='en', blank=True, help_text='Preferred language')
    country = models.ForeignKey('jizz.Country', on_delete=models.SET_NULL, null=True, blank=True, help_text='Preferred country')
    timezone = models.CharField(
        max_length=63,
        default='Europe/Amsterdam',
        blank=True,
        help_text='Timezone for daily challenge (e.g. Europe/Amsterdam)',
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


class PlayerScore(models.Model):
    player = models.ForeignKey(Player, related_name='scores', on_delete=models.CASCADE)
    game = models.ForeignKey(Game, related_name='scores', blank=True, null=True, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)

    @property
    def play_time(self):
        if not self.answers.exists():
            return timedelta()
        return self.answers.last().created - self.game.created

    @property
    def playtime(self):
        seconds = self.play_time.total_seconds()
        hours = round(seconds // 3600)
        minutes = round((seconds % 3600) // 60)
        if hours == 0:
            return f'{minutes} minutes'
        return f'{hours} hours and {minutes} minutes'

    @classmethod
    def highscore_by_type(cls, level=None, country=None, media=None, length=None, rarity=None):
        qs = cls.objects.filter(
            game__level=level,
            game__country=country,
            game__media=media,
            game__length=length,
        )
        if rarity is not None:
            qs = qs.filter(game__rarity=rarity)
        return qs.order_by('-score').first()

    @property
    def ranking(self):
        scores = PlayerScore.objects.filter(
            game__level=self.game.level,
            game__country=self.game.country,
            game__media=self.game.media,
            game__length=self.game.length,
            game__rarity=self.game.rarity,
        ).order_by('-score').all()
        return list(scores).index(self) + 1

    @property
    def is_host(self):
        return self.game_id and self.game.host == self

    @property
    def status(self):
        question = self.game_id and self.game.questions.last()
        if not question:
            return 'waiting'
        answer = self.answers.filter(question=question).first()
        if answer:
            if answer.correct:
                return 'correct'
            else:
                return 'incorrect'
        return 'waiting'

    @property
    def last_answer(self):
        """Answer on the current (last) question, or None if still waiting."""
        question = self.game_id and self.game.questions.last()
        if not question:
            return None
        return self.answers.filter(question=question).first()

    class Meta:
        unique_together = ('player', 'game')


class Answer(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    question = models.ForeignKey('jizz.Question', related_name='answers', on_delete=models.CASCADE)
    player_score = models.ForeignKey('jizz.PlayerScore', null=True, related_name='answers', on_delete=models.CASCADE)
    answer = models.ForeignKey('jizz.Species', related_name='answer', on_delete=models.CASCADE)
    correct = models.BooleanField(default=False)
    score = models.IntegerField(default=0)

    def calculate_score(self):
        start = self.question.created
        ready = QuestionMediaReady.objects.filter(
            question=self.question,
            player=self.player_score.player,
        ).first()
        if ready and ready.ready_at:
            start = max(start, ready.ready_at)
        time_taken = (now() - start).total_seconds()
        time_taken = max(0.0, time_taken)
        max_score = 500
        min_score = 100
        score = min_score + (max_score - min_score) * math.exp(-time_taken / 10)
        return round(score)

    def save(self, *args, **kwargs):
        if not self.id:
            self.correct = self.answer == self.question.species
            if self.correct:
                self.score = self.calculate_score()
        return super().save(*args, **kwargs)

    class Meta:
        unique_together = ('player_score', 'question')


@receiver(post_save, sender=Answer)
def update_player_score(sender, instance, created, **kwargs):
    if created:
        instance.player_score.score = instance.player_score.answers.filter(
            question__game=instance.question.game
        ).aggregate(score=Sum('score'))['score']
        instance.player_score.save()


class SpeciesImage(models.Model):
    url = models.URLField()
    link = models.URLField(null=True, blank=True)
    contributor = models.CharField(max_length=200, null=True, blank=True)
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='old_images'
    )

    class Meta:
        unique_together = ('species', 'url')



class SpeciesSound(models.Model):
    url = models.URLField()
    link = models.URLField(null=True, blank=True)
    contributor = models.CharField(max_length=200, null=True, blank=True)
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='old_sounds'
    )

    class Meta:
        unique_together = ('species', 'url')


class SpeciesVideo(models.Model):
    url = models.URLField()
    link = models.URLField(null=True, blank=True)
    contributor = models.CharField(max_length=200, null=True, blank=True)
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='old_videos'
    )

    class Meta:
        unique_together = ('species', 'url')


class FlagQuestion(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='flags',
        null=True,
        blank=True
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name='flags'
    )
    media_url = models.URLField(null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)
    created = models.DateTimeField(auto_now=True)
    

class CountrySpecies(models.Model):
    country = models.ForeignKey(
        Country,
        related_name='countryspecies',
        on_delete=models.CASCADE
    )
    species = models.ForeignKey(
        Species,
        related_name='countryspecies',
        on_delete=models.CASCADE
    )

    STATUS_CHOICES = [
        ('unknown', 'Unknown'),
        ('native', 'Native'),
        ('rare', 'Rare'),
        ('introduced', 'Introduced'),
        ('extirpated', 'Extirpated'),
        ('uncertain', 'Uncertain'),
        ('endemic', 'Endemic'),
    ]

    status = models.CharField(max_length=100, default='unknown', choices=STATUS_CHOICES)

    FREQUENCY_CHOICES = [
        ('abundant', 'Abundant'),
        ('very_common', 'Very common'),
        ('common', 'Common'),
        ('fairly_common', 'Fairly common'),
        ('uncommon', 'Uncommon'),
        ('rare', 'Rare'),
        ('very_rare', 'Very rare'),
        ('vagrant', 'Vagrant'),
    ]
    frequency = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=FREQUENCY_CHOICES,
        help_text='Relative abundance/frequency in this country (e.g. from eBird regional stats)',
    )

    frequency_pct = models.FloatField(
        null=True,
        blank=True,
        help_text='Raw percentage from source (e.g. range_occupied_percent from eBird Status and Trends CSV)',
    )

    @property
    def name(self):
        return self.species.name

    def __repr__(self):
        return self.species.name_latin

    def __str__(self):
        return self.species.name

    class Meta:
        verbose_name = 'Country Species'
        verbose_name_plural = 'Country Species'
        unique_together = ('country', 'species')


class CountrySpeciesFrequency(models.Model):
    """Per-month frequency from eBird (API, Status & Trends CSV, or future bulk CSV)."""

    CONFIDENCE_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    country_species = models.ForeignKey(
        CountrySpecies,
        on_delete=models.CASCADE,
        related_name='frequency_by_month',
    )
    month = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    reference_year = models.PositiveSmallIntegerField(
        default=2020,
        help_text='Calendar year this month slice refers to (imports default to command --year).',
    )
    frequency_pct = models.FloatField(
        null=True,
        blank=True,
        help_text=(
            'When from checklist-based eBird metrics: % of complete checklists in scope that '
            'report the species (0–100). Other sources: document in notes.'
        ),
    )
    frequency = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=CountrySpecies.FREQUENCY_CHOICES,
    )
    checklist_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Complete checklists in scope (denominator), when the source provides it.',
    )
    observation_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Raw observation or row count if available; never used alone for tiering.',
    )
    occupied_subregions = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Count of subregions / cells / locids where reported (meaning depends on source).',
    )
    occurrence_event_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Deduplicated occurrence estimate when the source provides it.',
    )
    source = models.CharField(
        max_length=64,
        default='ebird',
        blank=True,
        help_text='e.g. ebird_api_freqlist, ebird_st_pct_percentile',
    )
    source_updated_at = models.DateTimeField(null=True, blank=True)
    confidence = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=CONFIDENCE_CHOICES,
    )
    is_vagrant_like = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Country Species Frequency'
        verbose_name_plural = 'Country Species Frequencies'
        constraints = [
            models.UniqueConstraint(
                fields=('country_species', 'month', 'reference_year'),
                name='jizz_countryspeciesfrequency_unique_cs_month_year',
            ),
        ]
        ordering = ['country_species', 'reference_year', 'month']


class Feedback(models.Model):
    player = models.ForeignKey(
        Player,
        related_name='feedback',
        on_delete=models.CASCADE
    )
    comment = models.TextField(default='', null=True, blank=True)
    rating = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)


class Update(models.Model):
    title = models.CharField(max_length=200)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    message = models.TextField()
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']


class Reaction(models.Model):
    player = models.ForeignKey(
        Player,
        related_name='reactions',
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )
    update = models.ForeignKey(
        Update,
        related_name='reactions',
        on_delete=models.CASCADE
    )
    message = models.TextField()
    created = models.DateTimeField(auto_now_add=True)

    @property
    def name(self):
        return self.player.name


class ChallengeLevel(models.Model):
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]

    sequence = models.IntegerField(default=0)  # renamed from 'level'
    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default='advanced'
    )
    length = models.IntegerField(default=0)
    jokers = models.IntegerField(default=0)
    rarity = models.CharField(
        max_length=20,
        default=Game.RARIT_REGULAR,
        choices=Game.RARIT_CHOICES,
    )
    include_escapes = models.BooleanField(default=False)
    media = models.CharField(max_length=10, default='images')
    title = models.CharField(max_length=200)
    description = models.TextField(default='')
    title_nl = models.CharField(max_length=200, null=True, blank=True)
    description_nl = models.TextField(default='', null=True, blank=True)
    tax_order = models.CharField(
        'Order',
        max_length=200,
        null=True,
        blank=True,
        help_text='Only show birds from this taxonomic order'
    )


class CountryChallenge(models.Model):
    country = models.ForeignKey(
        Country,
        related_name='challenges',
        on_delete=models.CASCADE
    )
    player = models.ForeignKey(
        Player,
        related_name='challenges',
        on_delete=models.CASCADE
    )
    created = models.DateTimeField(auto_now_add=True)


class CountryGame(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('running', 'Running'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
    ]

    country_challenge = models.ForeignKey(
        CountryChallenge,
        related_name='games',
        on_delete=models.CASCADE
    )
    game = models.ForeignKey(
        Game,
        related_name='country_games',
        on_delete=models.CASCADE
    )
    challenge_level = models.ForeignKey(
        ChallengeLevel,
        related_name='country_games',
        on_delete=models.CASCADE
    )
    created = models.DateTimeField(auto_now_add=True)

    @property
    def remaining_jokers(self):
        failed = self.game.questions.filter(
            answers__correct=False,
            answers__answer__isnull=False
        ).count()
        return self.challenge_level.jokers - failed

    @property
    def status(self):
        if self.remaining_jokers < 0:
            return 'failed'
        elif self.game.ended and self.remaining_jokers >= 0:
            return 'passed'
        elif self.game.questions.count():
            return 'running'
        return 'new'

    def update_status(self):
        """No-op for compatibility with save(); status is a property."""
        pass

    def save(self, *args, **kwargs):
        # Only update status if the instance already exists
        if self.pk:
            self.update_status()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-id']


# --- Birdr Journey ---


class BirdrJourney(models.Model):
    """Solo level progression (sequences 0–7) per country for a user or guest player."""
    user = models.ForeignKey(
        'auth.User',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='birdr_journeys',
    )
    player = models.ForeignKey(
        Player,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='birdr_journeys',
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='birdr_journeys',
    )
    current_sequence = models.PositiveSmallIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    last_played_date = models.DateField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(user__isnull=False, player__isnull=True)
                    | models.Q(user__isnull=True, player__isnull=False)
                ),
                name='birdr_journey_user_xor_player',
            ),
            models.UniqueConstraint(
                fields=['user', 'country'],
                condition=models.Q(user__isnull=False),
                name='birdr_journey_unique_user_country',
            ),
            models.UniqueConstraint(
                fields=['player', 'country'],
                condition=models.Q(player__isnull=False),
                name='birdr_journey_unique_player_country',
            ),
        ]

    def __str__(self):
        owner = self.user_id or f'player:{self.player_id}'
        return f'Journey {owner} @ {self.country_id} seq={self.current_sequence}'


# --- Daily Challenge & Friends ---


class Friendship(models.Model):
    """Friend request / friendship between two users. Symmetric once accepted."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    from_user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='friendship_sent'
    )
    to_user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='friendship_received'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')
        ordering = ['-created']


class DailyChallenge(models.Model):
    """A 7-day (or configurable) daily challenge series."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_accept', 'Pending accept'),
        ('active', 'Active'),
        ('ended', 'Ended'),
    ]
    creator = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='daily_challenges_created'
    )
    country = models.ForeignKey(
        'jizz.Country',
        on_delete=models.CASCADE,
        related_name='daily_challenges'
    )
    media = models.CharField(max_length=10, choices=Game.MEDIA_CHOICES, default='images')
    length = models.IntegerField(default=10)
    duration_days = models.IntegerField(default=7)
    level = models.CharField(max_length=20, default='advanced')
    started_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    token = ShortUUIDField(
        length=12,
        max_length=16,
        alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
        unique=True,
        editable=False,
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']


class DailyChallengeParticipant(models.Model):
    """User participating in a daily challenge (creator or invited)."""
    STATUS_CHOICES = [
        ('invited', 'Invited'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    challenge = models.ForeignKey(
        DailyChallenge,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='daily_challenge_participations'
    )
    invited_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_challenge_invites_sent'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='invited')
    accepted_at = models.DateTimeField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('challenge', 'user')
        ordering = ['-created']


class DailyChallengeInvite(models.Model):
    """Invite by email/phone for users not yet on Birdr (accept via link)."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
    ]
    challenge = models.ForeignKey(
        DailyChallenge,
        on_delete=models.CASCADE,
        related_name='invites'
    )
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=30, null=True, blank=True)
    invite_token = ShortUUIDField(
        length=16,
        max_length=24,
        alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
        unique=True,
        editable=False,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created']

    def save(self, *args, **kwargs):
        if not self.expires_at and self.pk is None:
            from django.utils.timezone import now
            self.expires_at = now() + timedelta(days=7)
        super().save(*args, **kwargs)


class DailyChallengeRound(models.Model):
    """One round = one day = one game in a daily challenge."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    challenge = models.ForeignKey(
        DailyChallenge,
        on_delete=models.CASCADE,
        related_name='rounds'
    )
    day_number = models.PositiveIntegerField()  # 1..duration_days
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name='daily_challenge_rounds',
        null=True,
        blank=True
    )
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('challenge', 'day_number')
        ordering = ['challenge', 'day_number']


class DeviceToken(models.Model):
    """Push notification device token (FCM or Expo). Legacy; prefer PushDevice."""
    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
    ]
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='device_tokens'
    )
    token = models.CharField(max_length=500)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    created = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'token')
        ordering = ['-last_used']


class PushDevice(models.Model):
    """Expo push token for mobile app (one row per device token)."""

    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
    ]
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='push_devices',
    )
    expo_push_token = models.CharField(max_length=500, unique=True)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.user_id} {self.platform} ({self.expo_push_token[:24]}…)'


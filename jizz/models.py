import math
import uuid
from datetime import timedelta
from email.policy import default
from random import randint, shuffle, random

from django.db import models
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.timezone import now
from shortuuid.django_fields import ShortUUIDField


class Country(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, primary_key=True)
    codes = models.CharField(max_length=400, null=True, blank=True)

    @property
    def count(self):
        return self.species.count()

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


class QuestionOption(models.Model):
    question = models.ForeignKey('jizz.Question', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', on_delete=models.CASCADE)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']


class Game(models.Model):
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
    include_rare = models.BooleanField(default=True)
    include_escapes = models.BooleanField(default=False)
    host = models.ForeignKey('jizz.Player', null=True, related_name='host', on_delete=models.CASCADE)
    tax_order = models.CharField(
        'Taxonomic order',
        help_text='Only show birds from this order',
        max_length=100,
        null=True,
        blank=True
    )

    @property
    def current_highscore(self):
        return PlayerScore.highscore_by_type(
            level=self.level, country=self.country,
            length=self.length, media=self.media
        )

    @property
    def ended(self):
        return self.questions.count() >= self.length

    @property
    def last_question(self):
        return self.questions.last()

    def add_question(self):
        self.questions.filter(done=False).update(done=True)
        statuses = ['native', 'endemic']
        if self.include_rare:
            statuses.extend(['rare', 'extirpated'])
        if self.include_escapes:
            statuses.extend(['introduced', 'uncertain', 'unknown'])

        all_species = Species.objects.filter(
            images__isnull=False,
            countryspecies__status__in=statuses,
            countryspecies__country=self.country
        ).distinct().order_by('id')
        if self.media == 'video':
            all_species = Species.objects.filter(
                videos__isnull=False,
                countryspecies__status__in=statuses,
                countryspecies__country=self.country
            ).distinct().order_by('id')
        if self.media == 'audio':
            if self.tax_order:
                all_species = Species.objects.filter(
                    sounds__isnull=False,
                    status__in=statuses,
                    countryspecies__countryspecies__country=self.country,
                    tax_order=self.tax_order
                ).distinct().order_by('id')
            else:
                all_species = Species.objects.filter(
                    sounds__isnull=False,
                    countryspecies__status__in=statuses,
                    countryspecies__country=self.country
                ).distinct().order_by('id')

        left_species = all_species.exclude(id__in=self.questions.values_list('species_id', flat=True))
        species = left_species.order_by('?').first()

        sequence = self.questions.count() + 1
        number = randint(1, species.images.count()) - 1
        if self.media == 'video':
            number = randint(1, species.videos.count()) - 1
        if self.media == 'audio':
            number = randint(1, species.sounds.count()) - 1

        if self.level == 'advanced':
            options1 = all_species.filter(id__lt=species.id).order_by('-id')[:2]
            next = 5 - options1.count()
            options2 = all_species.filter(id__gt=species.id).order_by('id')[:next]
            if options2.count() < 2:
                prev = 5 - options2.count()
                options1 = all_species.filter(id__lt=species.id).order_by('-id')[:prev]

            options = list(options1) + list(options2) + [species]
            shuffle(options)
            question = self.questions.create(species=species, number=number, sequence=sequence)
            for index, species in enumerate(options):
                QuestionOption.objects.create(
                    question=question,
                    species=species,
                    order=index
                )
            return question

        elif self.level == 'beginner':
            options = all_species.order_by('?')[:3]

            question = self.questions.create(
                species=species, number=number, sequence=sequence
            )
            options = list(options) + [species]
            shuffle(options)
            for index, species in enumerate(options):
                QuestionOption.objects.create(
                    question=question,
                    species=species,
                    order=index
                )
            return question
        else:
            question = self.questions.create(
                species=species, number=number, sequence=sequence
            )
            return question

    @property
    def question(self):
        return self.questions.filter(done=False).first()

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
    language = models.CharField(max_length=2, default='en')
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
    def highscore_by_type(cls, level=None, country=None, media=None, length=None):
        return cls.objects.filter(
            game__level=level,
            game__country=country,
            game__media=media,
            game__length=length
        ).order_by('-score').first()

    @property
    def ranking(self):
        scores = PlayerScore.objects.filter(game__level=self.game.level, game__country=self.game.country,
                                            game__media=self.game.media, game__length=self.game.length).order_by(
            '-score').all()
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
        question = self.game_id and self.game.questions.last()
        if not question:
            return 'waiting'
        answer = self.answers.filter(question=question).first()
        return answer

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
        time_taken = (now() - self.question.created).total_seconds()
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


class Species(models.Model):
    name = models.CharField(max_length=200)
    name_latin = models.CharField(max_length=200)
    name_nl = models.CharField(max_length=200, null=True, blank=True)
    tax_family_en = models.CharField('Family english', max_length=200, null=True, blank=True)
    tax_family = models.CharField('Family', max_length=200, null=True, blank=True)
    tax_order = models.CharField('Order', max_length=200, null=True, blank=True)
    code = models.CharField(max_length=10)

    class Meta:
        verbose_name = 'species'
        verbose_name_plural = 'species'
        ordering = ['id']

    def __str__(self):
        return self.name


class SpeciesImage(models.Model):
    url = models.URLField()
    link = models.URLField(null=True, blank=True)
    contributor= models.CharField(max_length=200, null=True, blank=True)
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='images'
    )

    class Meta:
        unique_together = ('species', 'url')


class SpeciesSound(models.Model):
    url = models.URLField()
    link = models.URLField(null=True, blank=True)
    contributor= models.CharField(max_length=200, null=True, blank=True)
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='sounds'
    )

    class Meta:
        unique_together = ('species', 'url')


class SpeciesVideo(models.Model):
    url = models.URLField()
    link = models.URLField(null=True, blank=True)
    contributor= models.CharField(max_length=200, null=True, blank=True)
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='videos'
    )

    class Meta:
        unique_together = ('species', 'url')


class FlagQuestion(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='flags'
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name='flags'
    )
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

    @property
    def name(self):
        return self.species.name

    def __repr__(self):
        return self.species.name_latin

    class Meta:
        unique_together = ('country', 'species')


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


LEVELS = [
    {
        'level': 'beginner',
        'length': 10,
        'media': 'images',
        'jokers': 2,
        'include_rare': False,
        'include_escapes': False,
    },
    {
        'level': 'beginner',
        'length': 20,
        'media': 'video',
        'jokers': 2,
        'include_rare': False,
        'include_escapes': False,
    },
    {
        'level': 'advanced',
        'length': 20,
        'media': 'images',
        'jokers': 2,
        'include_rare': False,
        'include_escapes': False,
    },
    {
        'level': 'advanced',
        'length': 50,
        'media': 'images',
        'jokers': 5,
        'include_rare': True,
        'include_escapes': False,
    },
    {
        'level': 'advanced',
        'length': 10,
        'media': 'videos',
        'jokers': 0,
        'include_rare': True,
        'include_escapes': False,
    },
    {
        'level': 'expert',
        'length': 20,
        'media': 'images',
        'jokers': 2,
        'include_rare': True,
        'include_escapes': False,
    },
    {
        'level': 'advanced',
        'length': 20,
        'media': 'sounds',
        'jokers': 5,
        'include_rare': True,
        'include_escapes': False,
    },
    {
        'level': 'expert',
        'length': 20,
        'media': 'videos',
        'jokers': 1,
        'include_rare': True,
        'include_escapes': False,
    },
]


class ChallengeLevel(models.Model):
    game = models.ForeignKey(
        Game,
        related_name='challenges',
        on_delete=models.CASCADE
    )
    challenge = models.ForeignKey(
        'jizz.CountryChallenge',
        related_name='levels',
        on_delete=models.CASCADE
    )
    level = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    jokers = models.IntegerField(default=0)
    passed = models.BooleanField(default=True)


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

    level = models.IntegerField(default=0)

    def new_level(self):
        specs = LEVELS[self.level]
        game = Game.objects.create(
            host=self.player,
            country=self.country,
            **specs
        )

        level = ChallengeLevel.objects.create(
            level=self.level,
            game=game,
            **specs
        )
        return level

    @property
    def last_level(self):
        if self.levels.exists():
            return self.levels.last()
        else:
            return self.new_level()

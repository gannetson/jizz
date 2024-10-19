import math
import uuid
from random import randint, shuffle

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
    host = models.ForeignKey('jizz.Player', null=True, related_name='host', on_delete=models.CASCADE)

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
        all_species = Species.objects.filter(images__isnull=False,
                                             countryspecies__country=self.country).distinct().order_by('id')
        if self.media == 'video':
            all_species = Species.objects.filter(videos__isnull=False,
                                                 countryspecies__country=self.country).distinct().order_by('id')
        if self.media == 'audio':
            all_species = Species.objects.filter(sounds__isnull=False,
                                                 countryspecies__country=self.country).distinct().order_by('id')

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


class Player(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('auth.User', blank=True, null=True, on_delete=models.CASCADE)
    ip = models.GenericIPAddressField(null=True, blank=True)
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=2, default='en')
    token = models.CharField(max_length=100, default=uuid.uuid4, editable=False)
    score = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} - #{self.id}"


class PlayerScore(models.Model):
    player = models.ForeignKey(Player, related_name='scores', on_delete=models.CASCADE)
    game = models.ForeignKey(Game, related_name='scores', blank=True, null=True, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)

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
        scores = PlayerScore.objects.filter(game__level=self.game.level, game__country=self.game.country, game__media=self.game.media, game__length=self.game.length).order_by('-score').all()
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
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='images'
    )

    class Meta:
        unique_together = ('species', 'url')


class SpeciesSound(models.Model):
    url = models.URLField()
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='sounds'
    )

    class Meta:
        unique_together = ('species', 'url')


class SpeciesVideo(models.Model):
    url = models.URLField()
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='videos'
    )

    class Meta:
        unique_together = ('species', 'url')


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

    @property
    def name(self):
        return self.species.name

    def __repr__(self):
        return self.species.name_latin

    class Meta:
        unique_together = ('country', 'species')

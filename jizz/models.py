import uuid

from django.db import models
from django.urls import reverse


class Country(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, primary_key=True)
    codes = models.CharField(max_length=400, null=True, blank=True)

    def __str__(self):
        return self.name

    def __repr__(self):
        return self.code

    class Meta:
        verbose_name = 'country'
        verbose_name_plural = 'countries'
        ordering = ['name']


class Game(models.Model):
    country = models.ForeignKey('jizz.Country', on_delete=models.SET_NULL, null=True)
    language = models.CharField(max_length=100, default='en')
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=100)
    multiplayer = models.BooleanField(default=False)
    length = models.IntegerField(default=0)

    @property
    def progress(self):
        return self.questions.filter(done=True).count()

    def __str__(self):
        return f'{self.country} - {self.level} - {self.created.strftime("%X %x")}'


class Question(models.Model):
    game = models.ForeignKey('jizz.Game', related_name='questions', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', related_name='questions', on_delete=models.CASCADE)
    errors = models.IntegerField(default=0)
    done = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.game} - {self.species}'

class QuestionOption(models.Model):
    question = models.ForeignKey('jizz.Question', related_name='questions', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', on_delete=models.CASCADE)


class Player(models.Model):
    game = models.ForeignKey(Game, related_name='players', blank=True, null=True, on_delete=models.CASCADE)
    user = models.ForeignKey('auth.User', blank=True, null=True, on_delete=models.CASCADE)
    ip = models.GenericIPAddressField(null=True, blank=True)
    is_host = models.BooleanField(default=False)
    name = models.CharField(max_length=255)
    token = models.CharField(max_length=100, default=uuid.uuid4, editable=False)
    score = models.IntegerField(default=0)


class Answer(models.Model):
    question = models.ForeignKey('jizz.Question', related_name='answer', on_delete=models.CASCADE)
    player = models.ForeignKey('jizz.Player', related_name='answer', on_delete=models.CASCADE)
    answer = models.ForeignKey('jizz.Species', related_name='answer', on_delete=models.CASCADE)


class Species(models.Model):
    name = models.CharField(max_length=200)
    name_latin = models.CharField(max_length=200)
    name_nl = models.CharField(max_length=200, null=True, blank=True)
    code = models.CharField(max_length=10)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'species'
        verbose_name_plural = 'species'
        ordering = ['id']


class SpeciesImage(models.Model):
    url = models.URLField()
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='images'
    )


class SpeciesSound(models.Model):
    url = models.URLField()
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='sounds'
    )


class SpeciesVideo(models.Model):
    url = models.URLField()
    species = models.ForeignKey(
        Species,
        on_delete=models.CASCADE,
        related_name='videos'
    )


class CountrySpecies(models.Model):
    country = models.ForeignKey(
        Country,
        related_name='species',
        on_delete=models.CASCADE
    )
    species = models.ForeignKey(
        Species,
        related_name='countries',
        on_delete=models.CASCADE
    )

    @property
    def name(self):
        return self.species.name

    def __repr__(self):
        return self.species.name_latin

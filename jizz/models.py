import uuid
from random import randint, shuffle

from django.db import models
from django.urls import reverse


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


class Game(models.Model):
    country = models.ForeignKey('jizz.Country', on_delete=models.SET_NULL, null=True)
    language = models.CharField(max_length=100, default='en')
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=100)
    multiplayer = models.BooleanField(default=False)
    length = models.IntegerField(default=0)

    def add_question(self):
        all_species = Species.objects.filter(countryspecies__country=self.country)
        left_species = all_species.exclude(id__in=self.questions.values_list('species_id', flat=True))
        species = left_species.order_by('?').first()

        if self.level == 'advanced':
            options1 = all_species.filter(id__lt=species.id).order_by('-id')[:2]
            next = 4 - options1.count()
            options2 = all_species.filter(id__gt=species.id).order_by('id')[:next]
            if options2.count() < 2:
                prev = 4 - options2.count()
                options1 = all_species.filter(id__lt=species.id).order_by('-id')[:prev]

            options = list(options1) + list(options2) + [species]
            shuffle(options)
            question = self.questions.create(species=species)
            question.options.add(*options)

        elif self.level == 'beginner':
            options = all_species.order_by('?')[:3]

            question = self.questions.create(
                species=species,
            )
            options = list(options) + [species]
            shuffle(options)
            question.options.add(*options)
        else:
            self.questions.create(
                species_id=species.id,
            )

    @property
    def question(self):
        return self.questions.filter(done=False).first()

    @property
    def progress(self):
        return self.questions.filter(done=True).count()

    def __str__(self):
        return f'{self.country} - {self.level} - {self.created.strftime("%X %x")}'


class Question(models.Model):
    game = models.ForeignKey('jizz.Game', related_name='questions', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', related_name='questions', on_delete=models.CASCADE)
    options = models.ManyToManyField('jizz.Species')
    errors = models.IntegerField(default=0)
    done = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.game} - {self.species}'


class Player(models.Model):
    game = models.ForeignKey(Game, related_name='players', blank=True, null=True, on_delete=models.CASCADE)
    user = models.ForeignKey('auth.User', blank=True, null=True, on_delete=models.CASCADE)
    ip = models.GenericIPAddressField(null=True, blank=True)
    is_host = models.BooleanField(default=False)
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=2, default='en')
    token = models.CharField(max_length=100, default=uuid.uuid4, editable=False)
    score = models.IntegerField(default=0)


class Answer(models.Model):
    question = models.ForeignKey('jizz.Question', related_name='answer', on_delete=models.CASCADE)
    player = models.ForeignKey('jizz.Player', related_name='answer', on_delete=models.CASCADE)
    answer = models.ForeignKey('jizz.Species', related_name='answer', on_delete=models.CASCADE)
    correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('player', 'question')

class Species(models.Model):
    name = models.CharField(max_length=200)
    name_latin = models.CharField(max_length=200)
    name_nl = models.CharField(max_length=200, null=True, blank=True)
    code = models.CharField(max_length=10)

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

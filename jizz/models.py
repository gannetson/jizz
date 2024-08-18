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
    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    country = models.ForeignKey('jizz.Country', on_delete=models.SET_NULL, null=True)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=100)

    def __str__(self):
        return f'{self.country} - {self.level} - {self.created.strftime("%X %x")}'


class Question(models.Model):
    game = models.ForeignKey('jizz.Game', related_name='questions', on_delete=models.CASCADE)
    species = models.ForeignKey('jizz.Species', related_name='questions', on_delete=models.CASCADE)
    errors = models.IntegerField(default=0)
    correct = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.game} - {self.species}'

class Species(models.Model):
    name = models.CharField(max_length=200)
    name_latin = models.CharField(max_length=200)
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

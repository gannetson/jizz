import csv
import re

import requests
from django.conf import settings

from jizz.models import Species, Country, CountrySpecies, SpeciesImage

SERVER_NAME = 'api.ebird.org'
API_VERSION = 'v2'


def sync_species():

    data = requests.get(
        f'https://{SERVER_NAME}/{API_VERSION}/ref/taxonomy/ebird',
        headers={'x-ebirdapitoken': settings.EBIRD_API_TOKEN}
    )

    for row in data.content.splitlines():
        parts = row.decode().split(',')
        if parts[3] == 'species':
            Species.objects.update_or_create(
                code= parts[2],
                defaults={
                    'name': parts[1],
                    'name_latin': parts[0]
                }
            )


def sync_regions(country, code):
    data = requests.get(
        f'https://{SERVER_NAME}/{API_VERSION}/product/spplist/{code}',
        headers={'x-ebirdapitoken': settings.EBIRD_API_TOKEN}
    )
    for species in data.json():
        try:
            CountrySpecies.objects.get_or_create(
                country=country,
                species=Species.objects.get(code=species)
            )
        except Species.DoesNotExist:
            print(f'{species} does not exist')


def sync_country(code='ZNZ'):
    country = Country.objects.get(code=code)
    for code in country.codes.split(','):
        sync_regions(country, code)


def get_images(id=1):
    species = Species.objects.get(id=id)
    data = requests.get(
        f'https://ebird.org/species/{species.code}'
    )
    pattern = r'https://cdn\.download\.ams\.birds\.cornell\.edu/api/v1/asset/(\d+)/1800'
    matches = re.findall(pattern, data.text)
    for match in matches:
        SpeciesImage.objects.get_or_create(
            url=f'https://cdn.download.ams.birds.cornell.edu/api/v1/asset/{match}/1800',
            species=species
        )


def get_country_images(code='TZ-15'):
    country = Country.objects.get(code=code)
    nr = 0
    count = CountrySpecies.objects.filter(country=country).count()
    print (f'{country.name} {count} species')
    count = CountrySpecies.objects.filter(country=country, species__images=None).count()
    print (f'{count} still need to retrieve images')
    for species in CountrySpecies.objects.filter(country=country, species__images=None):
        nr += 1
        if species.species.images.count() == 0:
            print(f'🔎 [{nr}/{count}] {species.species.name}' , end='\r')
            get_images(species.species.id)
            print(f'☑️ [{nr}/{count}] {species.species.name}')
        else:
            print(f'☑️ [{nr}/{count}] {species.species.name}')


def get_all_images():
    count = Species.objects.filter(images=None).count()
    nr = 0
    print (f'{count} still need to retrieve images')
    for species in Species.objects.filter(images=None):
        nr += 1
        if species.species.images.count() == 0:
            print(f'🔎 [{nr}/{count}] {species.species.name}' , end='\r')
            get_images(species.species.id)
            print(f'☑️ [{nr}/{count}] {species.species.name}')
        else:
            print(f'☑️ [{nr}/{count}] {species.species.name}')

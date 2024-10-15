import csv
import re

import requests
from django.conf import settings

from jizz.models import Species, Country, CountrySpecies, SpeciesImage, SpeciesSound, SpeciesVideo

SERVER_NAME = 'api.ebird.org'
API_VERSION = 'v2'


def sync_species():

    data = requests.get(
        f'https://{SERVER_NAME}/{API_VERSION}/ref/taxonomy/ebird?locale=en_UK',
        headers={'x-ebirdapitoken': settings.EBIRD_API_TOKEN}
    )

    for row in data.content.splitlines():
        parts = row.decode().split(',')
        if parts[3] == 'species':
            Species.objects.update_or_create(
                code= parts[2],
                defaults={
                    'name': parts[1],
                }
            )

    data = requests.get(
        f'https://{SERVER_NAME}/{API_VERSION}/ref/taxonomy/ebird?locale=nl',
        headers={'x-ebirdapitoken': settings.EBIRD_API_TOKEN}
    )

    for row in data.content.splitlines():
        parts = row.decode().split(',')
        if parts[3] == 'species':
            Species.objects.update_or_create(
                code= parts[2],
                defaults={
                    'name_nl': parts[1],
                }
            )


def sync_regions(country, code):
    data = requests.get(
        f'https://{SERVER_NAME}/{API_VERSION}/product/spplist/{code}',
        headers={'x-ebirdapitoken': settings.EBIRD_API_TOKEN}
    )
    print('Got data')
    codes = data.json()

    print('Going loopy')
    ids = Species.objects.filter(code__in=codes).values_list('id', flat=True)
    specs = [CountrySpecies(country_id=country.code, species_id=id) for id in ids]
    print('Got some work to do ', len(specs))
    CountrySpecies.objects.bulk_create(specs, ignore_conflicts=True)


def sync_country(code='ZNZ'):
    country = Country.objects.get(code=code)
    if country.codes:
        for code in country.codes.split(','):
            sync_regions(country, code)
    else:
        sync_regions(country, country.code)


def get_media(id=1, media='photo'):
    species = Species.objects.get(id=id)
    data = requests.get(
        f'https://media.ebird.org/catalog?taxonCode={species.code}&mediaType={media}&sort=rating_rank_desc'
    )
    pattern = r'assetId:(\d+)'
    matches = re.findall(pattern, data.text)
    print(f'found {len(matches)} matches')
    for match in matches[0:10]:
        if media == 'photo':
            SpeciesImage.objects.get_or_create(
                url=f'https://cdn.download.ams.birds.cornell.edu/api/v2/asset/{match}/1800',
                species=species
            )
        elif media == 'audio':
            SpeciesSound.objects.get_or_create(
                url=f'https://cdn.download.ams.birds.cornell.edu/api/v2/asset/{match}/mp3',
                species=species
            )
        elif media == 'video':
           SpeciesVideo.objects.get_or_create(
                url=f'https://cdn.download.ams.birds.cornell.edu/api/v2/asset/{match}/mp4/1280',
                species=species
            )



def get_images(id=1, save=True):
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


def get_sounds(id=1, save=True):
    species = Species.objects.get(id=id)
    data = requests.get(
        f'https://media.ebird.org/catalog?taxonCode={species.code}&mediaType=audio&sort=rating_rank_desc'
    )
    pattern = r'assetId:(\d+)'
    matches = re.findall(pattern, data.text)
    for match in matches[0:5]:
        SpeciesSound.objects.get_or_create(
            url=f'https://cdn.download.ams.birds.cornell.edu/api/v2/asset/{match}/mp3',
            species=species
        )


def get_videos(id=1):
    species = Species.objects.get(id=id)
    data = requests.get(
        f'https://media.ebird.org/catalog?taxonCode={species.code}&mediaType=video&sort=rating_rank_desc'
    )
    pattern = r'assetId:(\d+)'
    matches = re.findall(pattern, data.text)
    for match in matches[0:5]:
        SpeciesVideo.objects.get_or_create(
            url=f'https://cdn.download.ams.birds.cornell.edu/api/v2/asset/{match}/mp4/1280',
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
            print(f'☑️ [{nr}/{count}] images {species.species.name}')
        else:
            print(f'☑️ [{nr}/{count}] images {species.species.name}')

    nr = 0
    count = CountrySpecies.objects.filter(country=country, species__sounds=None).count()
    print (f'{count} still need to retrieve sounds')
    for species in CountrySpecies.objects.filter(country=country, species__sounds=None):
        nr += 1
        if species.species.sounds.count() == 0:
            print(f'🔎 [{nr}/{count}] {species.species.name}' , end='\r')
            get_sounds(species.species.id)
            print(f'☑️ [{nr}/{count}] sounds {species.species.name}')
        else:
            print(f'☑️ [{nr}/{count}] sounds {species.species.name}')

    nr = 0
    count = CountrySpecies.objects.filter(country=country, species__videos=None).count()
    print (f'{count} still need to retrieve videos')
    for species in CountrySpecies.objects.filter(country=country, species__videos=None):
        nr += 1
        if species.species.videos.count() == 0:
            print(f'🔎 [{nr}/{count}] {species.species.name}' , end='\r')
            get_videos(species.species.id)
            print(f'☑️ [{nr}/{count}] sounds {species.species.name}')
        else:
            print(f'☑️ [{nr}/{count}] sounds {species.species.name}')



def get_country_media(code='NL'):
    country = Country.objects.get(code=code)
    count = CountrySpecies.objects.filter(country=country).count()
    print (f'{country.name} {count} species')

    species = CountrySpecies.objects.filter(country=country, species__images=None)
    print (f'{species.count()} still need to retrieve images')
    nr = 0
    media = []
    for spec in species:
        nr += 1
        print(f'🔎 [{nr}/{species.count()}] {spec.species.name}' , end='\r\n')
        get_media(spec.species.id, 'photo')

    species = CountrySpecies.objects.filter(country=country, species__sounds=None)
    print (f'{species.count()} still need to retrieve sounds')
    nr = 0
    for spec in species:
        nr += 1
        print(f'🔎 [{nr}/{species.count()}] {spec.species.name}' , end='\r\n')
        get_media(spec.species.id, 'audio')

    species = CountrySpecies.objects.filter(country=country, species__videos=None)
    print (f'{species.count()} still need to retrieve videos')
    nr = 0
    for spec in species:
        nr += 1
        print(f'🔎 [{nr}/{species.count()}] {spec.species.name}' , end='\r\n')
        get_media(spec.species.id, 'video')


def get_all_species():
    species = Species.objects.filter(images=None)
    print (f'{species.count()} still need to retrieve images')
    nr = 0
    for spec in species:
        nr += 1
        print(f'🔎 [{nr}/{species.count()}] {spec.species.name}' , end='\r\n')
        get_media(spec.species.id, 'photo')

    species = CountrySpecies.objects.filter(sounds=None)
    print (f'{species.count()} still need to retrieve sounds')
    nr = 0
    for spec in species:
        nr += 1
        print(f'🔎 [{nr}/{species.count()}] {spec.species.name}' , end='\r\n')
        get_media(spec.species.id, 'audio')

    species = CountrySpecies.objects.filter(videos=None)
    print (f'{species.count()} still need to retrieve videos')
    nr = 0
    for spec in species:
        nr += 1
        print(f'🔎 [{nr}/{species.count()}] {spec.species.name}' , end='\r\n')
        get_media(spec.species.id, 'video')


def get_all_countries():
    countries = Country.objects.filter(countryspecies=None).all()
    count = countries.count()
    nr = 0
    print (f'{count} still need to retrieve species')
    for country in countries:
        nr += 1
        print(f'☑️ [{nr}/{count}] {country.name}')
        sync_country(country.code)


def get_all_images():
    count = Species.objects.filter(images=None).count()
    nr = 0
    print (f'{count} still need to retrieve images')
    for species in Species.objects.filter(images=None):
        nr += 1
        print(f'☑️ [{nr}/{count}] {species.name}')
        get_images(species.id)


def get_all_sounds():
    count = Species.objects.filter(images=None).count()
    nr = 0
    print (f'{count} still need to retrieve sounds')
    for species in Species.objects.filter(images=None):
        nr += 1
        print(f'☑️ [{nr}/{count}] {species.name}')
        get_sounds(species.id)

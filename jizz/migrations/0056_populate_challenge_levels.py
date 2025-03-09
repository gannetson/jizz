from django.db import migrations

def create_challenge_levels(apps, schema_editor):
    ChallengeLevel = apps.get_model('jizz', 'ChallengeLevel')
    
    LEVELS = [
        {
            'level': 0,
            'title': 'Beginner Bird Images',
            'description': 'Start with 10 common birds using images',
            'length': 10,
            'media': 'images',
            'jokers': 2,
            'include_rare': False,
            'include_escapes': False,
        },
        {
            'level': 1,
            'title': 'Beginner Bird Videos',
            'description': 'Test your skills with 20 bird videos',
            'length': 20,
            'media': 'video',
            'jokers': 2,
            'include_rare': False,
            'include_escapes': False,
        },
        {
            'level': 2,
            'title': 'Advanced Bird Images',
            'description': 'Challenge yourself with 20 bird images',
            'length': 20,
            'media': 'images',
            'jokers': 2,
            'include_rare': False,
            'include_escapes': False,
        },
        {
            'level': 3,
            'title': 'Advanced Marathon',
            'description': '50 bird images including rare species',
            'length': 50,
            'media': 'images',
            'jokers': 5,
            'include_rare': True,
            'include_escapes': False,
        },
        {
            'level': 4,
            'title': 'Advanced Video Sprint',
            'description': '10 bird videos including rare species',
            'length': 10,
            'media': 'videos',
            'jokers': 0,
            'include_rare': True,
            'include_escapes': False,
        },
        {
            'level': 5,
            'title': 'Expert Bird Images',
            'description': '20 challenging bird images',
            'length': 20,
            'media': 'images',
            'jokers': 2,
            'include_rare': True,
            'include_escapes': False,
        },
        {
            'level': 6,
            'title': 'Advanced Bird Sounds',
            'description': '20 bird sounds including rare species',
            'length': 20,
            'media': 'sounds',
            'jokers': 5,
            'include_rare': True,
            'include_escapes': False,
        },
        {
            'level': 7,
            'title': 'Expert Bird Videos',
            'description': '20 challenging bird videos',
            'length': 20,
            'media': 'videos',
            'jokers': 1,
            'include_rare': True,
            'include_escapes': False,
        },
    ]

    for level_data in LEVELS:
        ChallengeLevel.objects.create(**level_data)

def remove_challenge_levels(apps, schema_editor):
    ChallengeLevel = apps.get_model('jizz', 'ChallengeLevel')
    ChallengeLevel.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('jizz', '0055_alter_countryspecies_options_and_more'),  # Replace with the actual previous migration
    ]

    operations = [
        migrations.RunPython(create_challenge_levels, remove_challenge_levels),
    ] 
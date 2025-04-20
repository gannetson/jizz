from django.db import migrations

def copy_translations(apps, schema_editor):
    ChallengeLevel = apps.get_model('jizz', 'ChallengeLevel')
    for level in ChallengeLevel.objects.all():
        level.title_nl = level.title
        level.description_nl = level.description
        level.save()

def reverse_copy_translations(apps, schema_editor):
    ChallengeLevel = apps.get_model('jizz', 'ChallengeLevel')
    for level in ChallengeLevel.objects.all():
        level.title_nl = None
        level.description_nl = None
        level.save()

class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0066_alter_countrygame_options_and_more'),
    ]

    operations = [
        migrations.RunPython(
            copy_translations,
            reverse_copy_translations
        ),
    ] 
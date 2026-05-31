from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0103_remove_journeylevel_shadow'),
    ]

    operations = [
        migrations.DeleteModel(
            name='CountryGame',
        ),
        migrations.DeleteModel(
            name='CountryChallenge',
        ),
        migrations.DeleteModel(
            name='ChallengeLevel',
        ),
    ]

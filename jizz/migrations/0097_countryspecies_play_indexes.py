from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0096_game_rarit'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='countryspecies',
            index=models.Index(
                fields=['country', 'status'],
                name='jizz_cs_country_status_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='countryspecies',
            index=models.Index(
                fields=['country', 'frequency'],
                name='jizz_cs_country_freq_idx',
            ),
        ),
    ]

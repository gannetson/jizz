# Generated for UserProfile.timezone (default Europe/Amsterdam for daily challenge)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0080_add_daily_challenge_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='timezone',
            field=models.CharField(
                default='Europe/Amsterdam',
                help_text='Timezone for daily challenge (e.g. Europe/Amsterdam)',
                max_length=63,
                blank=True,
            ),
        ),
    ]

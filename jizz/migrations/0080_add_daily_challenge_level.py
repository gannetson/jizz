# Generated for DailyChallenge.level (default advanced)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0079_daily_challenge_and_friends'),
    ]

    operations = [
        migrations.AddField(
            model_name='dailychallenge',
            name='level',
            field=models.CharField(default='advanced', max_length=20),
        ),
    ]

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('jizz', '0091_countryspeciesfrequency_source_wider'),
    ]

    operations = [
        migrations.CreateModel(
            name='BirdrJourney',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('current_sequence', models.PositiveSmallIntegerField(default=0)),
                ('streak_days', models.PositiveIntegerField(default=0)),
                ('last_played_date', models.DateField(blank=True, null=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('country', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='birdr_journeys', to='jizz.country')),
                ('player', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='birdr_journeys', to='jizz.player')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='birdr_journeys', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name='birdrjourney',
            constraint=models.CheckConstraint(
                check=models.Q(('user__isnull', False), ('player__isnull', True))
                | models.Q(('user__isnull', True), ('player__isnull', False)),
                name='birdr_journey_user_xor_player',
            ),
        ),
        migrations.AddConstraint(
            model_name='birdrjourney',
            constraint=models.UniqueConstraint(
                condition=models.Q(('user__isnull', False)),
                fields=('user', 'country'),
                name='birdr_journey_unique_user_country',
            ),
        ),
        migrations.AddConstraint(
            model_name='birdrjourney',
            constraint=models.UniqueConstraint(
                condition=models.Q(('player__isnull', False)),
                fields=('player', 'country'),
                name='birdr_journey_unique_player_country',
            ),
        ),
    ]

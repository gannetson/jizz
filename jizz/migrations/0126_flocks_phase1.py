# Generated manually for Birdr Flocks Phase 1

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('media', '0016_media_species_type_hide_idx'),
        ('jizz', '0125_species_practice'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='game_type',
            field=models.CharField(
                choices=[
                    ('standard', 'Standard'),
                    ('extreme', 'Extreme'),
                    ('pair_practice', 'Pair practice'),
                    ('species_practice', 'Species practice'),
                    ('flock_challenge', 'Flock challenge'),
                ],
                default='standard',
                help_text='Extreme: favor rare species and species this player has missed before.',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='Flock',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('slug', models.SlugField(max_length=50, unique=True)),
                ('is_private', models.BooleanField(default=True, help_text='Private flocks are only visible to members and invitees.')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='flock_logos/')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('default_country', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='flocks', to='jizz.country')),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='owned_flocks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='FlockMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Owner'), ('admin', 'Admin'), ('member', 'Member')], default='member', max_length=16)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('flock', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='jizz.flock')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flock_memberships', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FlockInvite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=8)),
                ('token', models.CharField(max_length=32, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='flock_invites_created', to=settings.AUTH_USER_MODEL)),
                ('flock', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invites', to='jizz.flock')),
            ],
        ),
        migrations.CreateModel(
            name='FlockChallenge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=160)),
                ('length', models.PositiveSmallIntegerField(default=20)),
                ('preset', models.CharField(choices=[('club_mix', 'Club Mix')], default='club_mix', max_length=32)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('active', 'Active'), ('ended', 'Ended')], default='draft', max_length=16)),
                ('starts_at', models.DateTimeField()),
                ('ends_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('public_token', models.CharField(editable=False, max_length=16, unique=True)),
                ('country', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='flock_challenges', to='jizz.country')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='flock_challenges_created', to=settings.AUTH_USER_MODEL)),
                ('flock', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='challenges', to='jizz.flock')),
            ],
            options={
                'ordering': ['-starts_at'],
            },
        ),
        migrations.CreateModel(
            name='FlockChallengeItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence', models.PositiveSmallIntegerField()),
                ('media_type', models.CharField(max_length=16)),
                ('level', models.CharField(max_length=32)),
                ('rarity', models.CharField(max_length=32)),
                ('option_species_ids', models.JSONField(default=list)),
                ('challenge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='jizz.flockchallenge')),
                ('media', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='media.media')),
                ('species', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='jizz.species')),
            ],
            options={
                'ordering': ['sequence'],
            },
        ),
        migrations.CreateModel(
            name='FlockChallengeAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_ranked', models.BooleanField(default=False)),
                ('is_practice', models.BooleanField(default=False)),
                ('correct_count', models.PositiveSmallIntegerField(default=0)),
                ('birdr_score', models.IntegerField(default=0)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('result_token', models.CharField(editable=False, max_length=24, unique=True)),
                ('challenge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='jizz.flockchallenge')),
                ('game', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='flock_challenge_attempt', to='jizz.game')),
                ('player', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flock_challenge_attempts', to='jizz.player')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flock_challenge_attempts', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FlockChallengeAttemptQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('attempt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='question_links', to='jizz.flockchallengeattempt')),
                ('challenge_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='jizz.flockchallengeitem')),
                ('question', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='flock_attempt_link', to='jizz.question')),
            ],
        ),
        migrations.AddIndex(
            model_name='flockmembership',
            index=models.Index(fields=['flock', 'role'], name='jizz_flockm_flock_i_1e25eb_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='flockmembership',
            unique_together={('flock', 'user')},
        ),
        migrations.AddConstraint(
            model_name='flockinvite',
            constraint=models.UniqueConstraint(condition=models.Q(('is_active', True)), fields=('code',), name='flock_invite_active_code_uniq'),
        ),
        migrations.AlterUniqueTogether(
            name='flockchallengeitem',
            unique_together={('challenge', 'sequence')},
        ),
        migrations.AlterUniqueTogether(
            name='flockchallengeattemptquestion',
            unique_together={('attempt', 'challenge_item')},
        ),
        migrations.AddIndex(
            model_name='flockchallengeattempt',
            index=models.Index(fields=['challenge', '-correct_count', '-birdr_score', 'completed_at'], name='jizz_flockc_challen_c2bde4_idx'),
        ),
        migrations.AddIndex(
            model_name='flockchallengeattempt',
            index=models.Index(fields=['challenge', 'user'], name='jizz_flockc_challen_77cff4_idx'),
        ),
        migrations.AddConstraint(
            model_name='flockchallengeattempt',
            constraint=models.UniqueConstraint(
                condition=models.Q(('completed_at__isnull', False), ('is_ranked', True)),
                fields=('challenge', 'user'),
                name='flock_one_ranked_completed_attempt',
            ),
        ),
        migrations.AddIndex(
            model_name='flockchallenge',
            index=models.Index(fields=['flock', 'status', '-starts_at'], name='jizz_flockc_flock_i_7d48df_idx'),
        ),
        migrations.AddIndex(
            model_name='flockchallenge',
            index=models.Index(fields=['ends_at'], name='jizz_flockc_ends_at_004b3c_idx'),
        ),
    ]

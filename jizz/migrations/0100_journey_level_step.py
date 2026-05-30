from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0099_speciesillustration'),
    ]

    operations = [
        migrations.CreateModel(
            name='JourneyLevel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence', models.PositiveSmallIntegerField(unique=True)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(default='')),
                ('title_nl', models.CharField(blank=True, max_length=200, null=True)),
                ('description_nl', models.TextField(blank=True, default='', null=True)),
                ('icon', models.ImageField(upload_to='journey_levels/')),
                ('shadow', models.ImageField(upload_to='journey_levels/')),
            ],
            options={
                'ordering': ['sequence'],
            },
        ),
        migrations.CreateModel(
            name='JourneyStep',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence', models.PositiveSmallIntegerField(default=0)),
                ('step_type', models.CharField(
                    choices=[('plain', 'Plain')],
                    default='plain',
                    max_length=32,
                )),
                ('level', models.CharField(
                    choices=[('beginner', 'Beginner'), ('advanced', 'Advanced'), ('expert', 'Expert')],
                    default='advanced',
                    max_length=20,
                )),
                ('length', models.IntegerField(default=0)),
                ('jokers', models.IntegerField(default=0)),
                ('rarity', models.CharField(
                    choices=[
                        ('familiar', 'Familiar'),
                        ('regular', 'Regular'),
                        ('exceptional', 'Exceptional'),
                    ],
                    default='regular',
                    max_length=20,
                )),
                ('include_escapes', models.BooleanField(default=False)),
                ('media', models.CharField(default='images', max_length=10)),
                ('tax_order', models.CharField(
                    blank=True,
                    help_text='Only show birds from this taxonomic order',
                    max_length=200,
                    null=True,
                    verbose_name='Order',
                )),
                ('journey_level', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='steps',
                    to='jizz.journeylevel',
                )),
            ],
            options={
                'ordering': ['journey_level', 'sequence'],
            },
        ),
        migrations.AddField(
            model_name='birdrjourney',
            name='current_step_sequence',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.CreateModel(
            name='BirdrJourneyGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('birdr_journey', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='games',
                    to='jizz.birdrjourney',
                )),
                ('game', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='birdr_journey_games',
                    to='jizz.game',
                )),
                ('journey_step', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='journey_games',
                    to='jizz.journeystep',
                )),
            ],
            options={
                'ordering': ['-id'],
            },
        ),
        migrations.AddConstraint(
            model_name='journeystep',
            constraint=models.UniqueConstraint(
                fields=('journey_level', 'sequence'),
                name='journey_step_unique_level_sequence',
            ),
        ),
    ]

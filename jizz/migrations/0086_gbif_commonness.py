# GBIF commonness pipeline models and CountrySpecies / Species extensions

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0085_questionmediaready'),
    ]

    operations = [
        migrations.AddField(
            model_name='species',
            name='gbif_species_key',
            field=models.BigIntegerField(
                blank=True,
                db_index=True,
                help_text='GBIF species taxon key; used to link occurrence pipeline to CountrySpecies',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_commonness',
            field=models.CharField(
                blank=True,
                choices=[
                    ('abundant', 'Abundant'),
                    ('very_common', 'Very common'),
                    ('common', 'Common'),
                    ('uncommon', 'Uncommon'),
                    ('scarce', 'Scarce'),
                    ('rare', 'Rare'),
                    ('extremely_rare', 'Extremely rare'),
                    ('insufficient_data', 'Insufficient data'),
                ],
                help_text='GBIF occupancy/persistence classification (parallel to eBird frequency)',
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_commonness_computed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_commonness_confidence',
            field=models.CharField(
                blank=True,
                choices=[('high', 'High'), ('medium', 'Medium'), ('low', 'Low')],
                max_length=16,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_commonness_score',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_dedup_events',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_last_year',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_occupied_cells',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='countryspecies',
            name='gbif_years_present_recent',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='GbifOccurrenceRaw',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gbif_id', models.BigIntegerField(db_index=True, unique=True)),
                ('species_key', models.BigIntegerField(db_index=True)),
                ('scientific_name', models.CharField(blank=True, max_length=512, null=True)),
                ('species', models.CharField(blank=True, max_length=512, null=True)),
                ('decimal_latitude', models.FloatField()),
                ('decimal_longitude', models.FloatField()),
                ('event_date', models.DateField(blank=True, db_index=True, null=True)),
                ('year', models.IntegerField(blank=True, null=True)),
                ('month', models.IntegerField(blank=True, null=True)),
                ('day', models.IntegerField(blank=True, null=True)),
                ('basis_of_record', models.CharField(blank=True, max_length=64, null=True)),
                ('occurrence_status', models.CharField(blank=True, max_length=32, null=True)),
                ('dataset_key', models.CharField(blank=True, db_index=True, max_length=64, null=True)),
                ('publisher', models.CharField(blank=True, max_length=512, null=True)),
                ('taxon_rank', models.CharField(blank=True, max_length=64, null=True)),
                ('taxonomic_class', models.CharField(blank=True, max_length=128, null=True, verbose_name='taxon class')),
                ('taxonomic_order', models.CharField(blank=True, max_length=128, null=True, verbose_name='taxon order')),
                ('family', models.CharField(blank=True, max_length=128, null=True)),
                ('genus', models.CharField(blank=True, max_length=128, null=True)),
                ('h3_cell', models.CharField(db_index=True, max_length=32)),
                ('ingested_at', models.DateTimeField(auto_now_add=True)),
                ('country', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gbif_occurrence_raw', to='jizz.country')),
            ],
            options={
                'verbose_name': 'GBIF occurrence (raw)',
                'verbose_name_plural': 'GBIF occurrences (raw)',
            },
        ),
        migrations.CreateModel(
            name='OccurrenceEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('species_key', models.BigIntegerField(db_index=True)),
                ('scientific_name', models.CharField(blank=True, max_length=512, null=True)),
                ('h3_cell', models.CharField(db_index=True, max_length=32)),
                ('event_date', models.DateField(db_index=True)),
                ('dedup_mode', models.CharField(choices=[('relaxed', 'Relaxed'), ('strict', 'Strict')], max_length=16)),
                ('basis_of_record', models.CharField(default='', max_length=64)),
                ('dataset_key', models.CharField(default='', max_length=64)),
                ('raw_records_in_event', models.PositiveIntegerField(default=1)),
                ('country', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='occurrence_events', to='jizz.country')),
            ],
            options={
                'verbose_name': 'Occurrence event',
                'verbose_name_plural': 'Occurrence events',
            },
        ),
        migrations.CreateModel(
            name='CountryCoverageStats',
            fields=[
                ('total_bird_cells_all', models.PositiveIntegerField(default=0)),
                ('total_bird_cells_recent', models.PositiveIntegerField(default=0)),
                ('total_dedup_events_all', models.PositiveIntegerField(default=0)),
                ('total_dedup_events_recent', models.PositiveIntegerField(default=0)),
                ('recent_years', models.PositiveIntegerField(default=5)),
                ('passes_coverage_gate', models.BooleanField(default=False)),
                ('computed_at', models.DateTimeField()),
                (
                    'country',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name='coverage_stats',
                        serialize=False,
                        to='jizz.country',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Country coverage stats',
                'verbose_name_plural': 'Country coverage stats',
            },
        ),
        migrations.CreateModel(
            name='SpeciesCountryStats',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gbif_species_key', models.BigIntegerField(db_index=True)),
                ('scientific_name', models.CharField(blank=True, max_length=512, null=True)),
                ('raw_record_count', models.PositiveIntegerField(default=0)),
                ('dedup_event_count', models.PositiveIntegerField(default=0)),
                ('occupied_cell_count', models.PositiveIntegerField(default=0)),
                ('occupied_cell_count_recent', models.PositiveIntegerField(default=0)),
                ('years_present_count', models.PositiveIntegerField(default=0)),
                ('years_present_recent', models.PositiveIntegerField(default=0)),
                ('first_year', models.PositiveIntegerField(blank=True, null=True)),
                ('last_year', models.PositiveIntegerField(blank=True, null=True)),
                ('total_country_cells_all', models.PositiveIntegerField(default=0)),
                ('total_country_cells_recent', models.PositiveIntegerField(default=0)),
                ('occupancy_ratio', models.FloatField(blank=True, null=True)),
                ('recent_occupancy_ratio', models.FloatField(blank=True, null=True)),
                ('computed_at', models.DateTimeField()),
                (
                    'country',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='species_country_stats',
                        to='jizz.country',
                    ),
                ),
                (
                    'country_species',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='gbif_stats',
                        to='jizz.countryspecies',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Species country stats (GBIF)',
                'verbose_name_plural': 'Species country stats (GBIF)',
            },
        ),
        migrations.CreateModel(
            name='SpeciesCommonnessClassification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gbif_species_key', models.BigIntegerField(db_index=True)),
                ('scientific_name', models.CharField(blank=True, max_length=512, null=True)),
                ('score', models.FloatField(blank=True, null=True)),
                (
                    'classification',
                    models.CharField(
                        choices=[
                            ('abundant', 'Abundant'),
                            ('very_common', 'Very common'),
                            ('common', 'Common'),
                            ('uncommon', 'Uncommon'),
                            ('scarce', 'Scarce'),
                            ('rare', 'Rare'),
                            ('extremely_rare', 'Extremely rare'),
                            ('insufficient_data', 'Insufficient data'),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    'confidence',
                    models.CharField(
                        choices=[('high', 'High'), ('medium', 'Medium'), ('low', 'Low')],
                        max_length=16,
                    ),
                ),
                ('raw_record_count', models.PositiveIntegerField(default=0)),
                ('dedup_event_count', models.PositiveIntegerField(default=0)),
                ('occupied_cell_count', models.PositiveIntegerField(default=0)),
                ('years_present_recent', models.PositiveIntegerField(default=0)),
                ('last_year', models.PositiveIntegerField(blank=True, null=True)),
                ('config_hash', models.CharField(blank=True, max_length=64, null=True)),
                ('computed_at', models.DateTimeField()),
                (
                    'country',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='species_commonness_classifications',
                        to='jizz.country',
                    ),
                ),
                (
                    'country_species',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='gbif_classification',
                        to='jizz.countryspecies',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Species commonness (GBIF)',
                'verbose_name_plural': 'Species commonness (GBIF)',
            },
        ),
        migrations.AddConstraint(
            model_name='occurrenceevent',
            constraint=models.UniqueConstraint(
                fields=(
                    'country',
                    'species_key',
                    'h3_cell',
                    'event_date',
                    'dedup_mode',
                    'basis_of_record',
                    'dataset_key',
                ),
                name='uniq_occurrence_event_identity',
            ),
        ),
        migrations.AddIndex(
            model_name='occurrenceevent',
            index=models.Index(fields=['species_key', 'country', 'h3_cell', 'event_date'], name='jizz_occurr_species_d5f154_idx'),
        ),
        migrations.AddConstraint(
            model_name='speciescountrystats',
            constraint=models.UniqueConstraint(
                fields=('country', 'gbif_species_key'), name='uniq_species_country_stats_country_gbifkey'
            ),
        ),
        migrations.AddIndex(
            model_name='speciescountrystats',
            index=models.Index(fields=['country', 'gbif_species_key'], name='jizz_species_countr_f70478_idx'),
        ),
        migrations.AddConstraint(
            model_name='speciescommonnessclassification',
            constraint=models.UniqueConstraint(
                fields=('country', 'gbif_species_key'), name='uniq_species_commonness_country_gbifkey'
            ),
        ),
        migrations.AddIndex(
            model_name='speciescommonnessclassification',
            index=models.Index(fields=['country', 'classification'], name='jizz_species_country_a37568_idx'),
        ),
        migrations.AddIndex(
            model_name='gbifoccurrenceraw',
            index=models.Index(fields=['country', 'species_key'], name='jizz_gbifoccur_country_3b8e03_idx'),
        ),
        migrations.AddIndex(
            model_name='gbifoccurrenceraw',
            index=models.Index(
                fields=['species_key', 'country', 'event_date'], name='jizz_gbifoccur_species_ef77c6_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='gbifoccurrenceraw',
            index=models.Index(fields=['country', 'h3_cell', 'event_date'], name='jizz_gbifoccur_country_dbf603_idx'),
        ),
    ]

# CountrySpeciesFrequency: reference_year, provenance, anti-vagrant fields; unique (cs, month, year)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0089_remove_countrycoveragestats_country_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='reference_year',
            field=models.PositiveSmallIntegerField(
                default=2020,
                help_text='Calendar year this month slice refers to (imports default to command --year).',
            ),
        ),
        migrations.AlterField(
            model_name='countryspeciesfrequency',
            name='frequency_pct',
            field=models.FloatField(
                blank=True,
                help_text=(
                    'When from checklist-based eBird metrics: % of complete checklists in scope that '
                    'report the species (0–100). Other sources: document in notes.'
                ),
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='checklist_count',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Complete checklists in scope (denominator), when the source provides it.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='observation_count',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Raw observation or row count if available; never used alone for tiering.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='occupied_subregions',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Count of subregions / cells / locids where reported (meaning depends on source).',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='occurrence_event_count',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Deduplicated occurrence estimate when the source provides it.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='source',
            field=models.CharField(
                blank=True,
                default='ebird',
                help_text='e.g. ebird_api_freqlist, ebird_st_csv',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='source_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='confidence',
            field=models.CharField(
                blank=True,
                choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='is_vagrant_like',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='countryspeciesfrequency',
            name='notes',
            field=models.TextField(blank=True),
        ),
        migrations.AlterUniqueTogether(
            name='countryspeciesfrequency',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='countryspeciesfrequency',
            constraint=models.UniqueConstraint(
                fields=('country_species', 'month', 'reference_year'),
                name='jizz_countryspeciesfrequency_unique_cs_month_year',
            ),
        ),
    ]

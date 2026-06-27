# Generated manually for taxonomic genus and eBird taxonOrder

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0123_pair_practice'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaxonomicGenus',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_latin', models.CharField(max_length=200, unique=True)),
                ('name_en', models.CharField(blank=True, default='', max_length=200)),
                ('name_nl', models.CharField(blank=True, default='', max_length=200)),
                (
                    'taxonomic_family',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='genera',
                        to='jizz.taxonomicfamily',
                    ),
                ),
            ],
            options={
                'verbose_name': 'taxonomic genus',
                'verbose_name_plural': 'taxonomic genera',
                'ordering': ['name_latin'],
            },
        ),
        migrations.AddField(
            model_name='species',
            name='tax_ordering',
            field=models.FloatField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='species',
            name='taxonomic_genus',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='species',
                to='jizz.taxonomicgenus',
            ),
        ),
    ]

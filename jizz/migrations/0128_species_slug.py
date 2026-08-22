from django.db import migrations, models
from django.utils.text import slugify


def populate_species_slugs(apps, schema_editor):
    Species = apps.get_model('jizz', 'Species')
    used = set()
    batch = []
    for species in Species.objects.all().only('id', 'name', 'name_latin', 'code').iterator(chunk_size=500):
        base = slugify(species.name or '') or slugify(species.name_latin or '') or f'species-{species.id}'
        base = base[:200]
        slug = base
        n = 2
        while slug in used:
            slug = f'{base[:170]}-{species.id}'
            if slug in used:
                slug = f'{base[:160]}-{species.id}-{n}'
                n += 1
            else:
                break
        used.add(slug)
        species.slug = slug
        batch.append(species)
        if len(batch) >= 500:
            Species.objects.bulk_update(batch, ['slug'])
            batch = []
    if batch:
        Species.objects.bulk_update(batch, ['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0127_pregenerated_questions'),
    ]

    operations = [
        migrations.AddField(
            model_name='species',
            name='slug',
            field=models.SlugField(blank=True, db_index=False, default='', max_length=220),
        ),
        migrations.RunPython(populate_species_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='species',
            name='slug',
            field=models.SlugField(blank=True, max_length=220, unique=True),
        ),
    ]

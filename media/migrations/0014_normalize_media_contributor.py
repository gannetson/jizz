# Data migration: apply normalize_contributor to all existing Media rows.

from django.db import migrations


def normalize_all_contributors(apps, schema_editor):
    from media.utils import normalize_contributor

    Media = apps.get_model('media', 'Media')
    batch = []
    batch_size = 500

    for m in Media.objects.all().iterator(chunk_size=batch_size):
        cleaned = normalize_contributor(m.contributor)
        if cleaned != m.contributor:
            m.contributor = cleaned
            batch.append(m)
            if len(batch) >= batch_size:
                Media.objects.bulk_update(batch, ['contributor'])
                batch = []

    if batch:
        Media.objects.bulk_update(batch, ['contributor'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0013_mediareview_user_player_optional'),
    ]

    operations = [
        migrations.RunPython(normalize_all_contributors, noop_reverse),
    ]

# Data migration: clean Media.contributor — replace HTML (e.g. <a>...</a>) with plain text (link text only).

import re
import html as html_module

from django.db import migrations


def extract_anchor_text(s):
    """If value contains <a>...</a>, use only that tag's inner text (the name); strip any other HTML."""
    if not s or '<' not in s:
        return s
    # If there's an <a> tag, take only its inner text (the "title" of the tag) — contributor should be just a name
    match = re.search(r'<a[^>]*>([^<]*)</a>', s, re.IGNORECASE)
    if match:
        s = match.group(1)
    else:
        # No anchor; just strip any other tags
        s = re.sub(r'<[^>]+>', '', s)
    s = html_module.unescape(s)
    s = ' '.join(s.split()).strip()
    return s


def cleanup_contributor(apps, schema_editor):
    Media = apps.get_model('media', 'Media')
    for m in Media.objects.filter(contributor__contains='<').iterator():
        cleaned = extract_anchor_text(m.contributor)
        if cleaned != m.contributor:
            Media.objects.filter(pk=m.pk).update(contributor=cleaned[:500])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0011_migrate_flagmedia_to_mediareview'),
    ]

    operations = [
        migrations.RunPython(cleanup_contributor, noop_reverse),
    ]

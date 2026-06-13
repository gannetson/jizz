import json

from django.db import migrations
import django_quill.fields


def _plain_html_to_quill(text: str) -> str:
    if not text:
        return json.dumps({'delta': '', 'html': ''})
    if text.strip().startswith('{'):
        return text
    return json.dumps({'delta': '', 'html': text})


def convert_mail_footer_to_quill(apps, schema_editor):
    MailSettings = apps.get_model('jizz', 'MailSettings')
    for settings in MailSettings.objects.all().iterator():
        changed = False
        for attr in ('footer_html_en', 'footer_html_nl'):
            value = getattr(settings, attr) or ''
            if value and not value.strip().startswith('{'):
                setattr(settings, attr, _plain_html_to_quill(value))
                changed = True
        if changed:
            settings.save(update_fields=['footer_html_en', 'footer_html_nl'])


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0114_update_blog_email_settings'),
    ]

    operations = [
        migrations.RunPython(convert_mail_footer_to_quill, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='mailsettings',
            name='footer_html_en',
            field=django_quill.fields.QuillField(blank=True),
        ),
        migrations.AlterField(
            model_name='mailsettings',
            name='footer_html_nl',
            field=django_quill.fields.QuillField(blank=True),
        ),
    ]

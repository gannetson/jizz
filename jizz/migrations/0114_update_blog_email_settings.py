import json
import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django_quill.fields


def _plain_text_to_quill(text: str) -> str:
    from django.utils.html import escape

    if not text:
        return json.dumps({'delta': '', 'html': ''})
    parts = escape(text).replace('\r\n', '\n').split('\n')
    html = ''.join(f'<p>{part}</p>' if part else '<p><br></p>' for part in parts)
    return json.dumps({'delta': '', 'html': html})


def migrate_update_fields(apps, schema_editor):
    Update = apps.get_model('jizz', 'Update')
    for update in Update.objects.all().iterator():
        title = getattr(update, 'title', '') or ''
        message = getattr(update, 'message', '') or ''
        update.title_en = title
        update.body_en = _plain_text_to_quill(message)
        update.save(update_fields=['title_en', 'body_en'])


def enable_receive_updates_for_all(apps, schema_editor):
    UserProfile = apps.get_model('jizz', 'UserProfile')
    UserProfile.objects.all().update(receive_updates=True)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('jizz', '0113_usageevent'),
    ]

    operations = [
        migrations.AddField(
            model_name='update',
            name='body_en',
            field=django_quill.fields.QuillField(blank=True, default='{"delta":"","html":""}'),
        ),
        migrations.AddField(
            model_name='update',
            name='body_nl',
            field=django_quill.fields.QuillField(blank=True),
        ),
        migrations.AddField(
            model_name='update',
            name='published',
            field=models.BooleanField(default=True, help_text='Show in app and allow email sends'),
        ),
        migrations.AddField(
            model_name='update',
            name='title_en',
            field=models.CharField(default='Untitled', max_length=200),
        ),
        migrations.AddField(
            model_name='update',
            name='title_nl',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.RunPython(migrate_update_fields, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='update',
            name='message',
        ),
        migrations.RemoveField(
            model_name='update',
            name='title',
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='receive_updates',
            field=models.BooleanField(default=True, help_text='Receive Birdr news and update emails'),
        ),
        migrations.RunPython(enable_receive_updates_for_all, migrations.RunPython.noop),
        migrations.CreateModel(
            name='MailSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='mail/')),
                ('footer_html_en', models.TextField(blank=True, default='<p><strong>Birdr</strong> — Test your bird knowledge</p>')),
                ('footer_html_nl', models.TextField(blank=True, default='<p><strong>Birdr</strong> — Test je vogelkennis</p>')),
            ],
            options={
                'verbose_name': 'Mail settings',
                'verbose_name_plural': 'Mail settings',
            },
        ),
        migrations.CreateModel(
            name='UpdateEmailDelivery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_test', models.BooleanField(default=False)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('recipient_count', models.PositiveIntegerField(default=0)),
                ('sent_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='update_email_deliveries', to=settings.AUTH_USER_MODEL)),
                ('update', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='email_deliveries', to='jizz.update')),
            ],
            options={
                'verbose_name_plural': 'Update email deliveries',
                'ordering': ['-sent_at'],
            },
        ),
        migrations.CreateModel(
            name='UpdateThumbsUp',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('player', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='update_thumbs_ups', to='jizz.player')),
                ('update', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='thumbs_ups', to='jizz.update')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='update_thumbs_ups', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created'],
            },
        ),
        migrations.CreateModel(
            name='UpdateEmailRecipient',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254)),
                ('tracking_token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('opened_at', models.DateTimeField(blank=True, null=True)),
                ('delivery', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recipients', to='jizz.updateemaildelivery')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='update_emails_received', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-sent_at'],
                'unique_together': {('delivery', 'user')},
            },
        ),
        migrations.AddConstraint(
            model_name='updatethumbsup',
            constraint=models.UniqueConstraint(condition=models.Q(('user__isnull', False)), fields=('update', 'user'), name='unique_update_thumbs_up_user'),
        ),
        migrations.AddConstraint(
            model_name='updatethumbsup',
            constraint=models.UniqueConstraint(condition=models.Q(('player__isnull', False)), fields=('update', 'player'), name='unique_update_thumbs_up_player'),
        ),
    ]

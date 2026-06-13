from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('jizz', '0112_remove_journeystep_dificult_species'),
    ]

    operations = [
        migrations.CreateModel(
            name='UsageEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('page_view', 'Page view'), ('feature', 'Feature')], default='page_view', max_length=20)),
                ('path', models.CharField(max_length=500)),
                ('platform', models.CharField(choices=[('web', 'Web'), ('ios', 'iOS'), ('android', 'Android')], default='web', max_length=20)),
                ('device_type', models.CharField(choices=[('desktop', 'Desktop'), ('mobile', 'Mobile'), ('tablet', 'Tablet'), ('unknown', 'Unknown')], default='unknown', max_length=20)),
                ('country_code', models.CharField(blank=True, default='', max_length=2)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('session_key', models.CharField(blank=True, default='', max_length=64)),
                ('user_agent', models.TextField(blank=True, default='')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='usage_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['path', 'created_at'], name='jizz_usagee_path_7a8f2d_idx'),
                    models.Index(fields=['platform', 'created_at'], name='jizz_usagee_platfor_4c1b9e_idx'),
                    models.Index(fields=['country_code', 'created_at'], name='jizz_usagee_country_2f8a1c_idx'),
                ],
            },
        ),
    ]

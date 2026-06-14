from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0116_updateemaildelivery_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='IpGeoCache',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.GenericIPAddressField(unique=True)),
                ('country_code', models.CharField(blank=True, default='', max_length=2)),
                ('country_name', models.CharField(blank=True, default='', max_length=100)),
                ('city', models.CharField(blank=True, default='', max_length=100)),
                ('is_private', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'IP geolocation cache',
                'verbose_name_plural': 'IP geolocation cache',
            },
        ),
    ]

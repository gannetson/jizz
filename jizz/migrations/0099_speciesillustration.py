from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0098_pushdevice'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpeciesIllustration',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(blank=True, null=True, upload_to='species_illustrations/')),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('ready', 'Ready'), ('failed', 'Failed')],
                    default='pending',
                    max_length=20,
                )),
                ('model_name', models.CharField(blank=True, default='', max_length=64)),
                ('error_message', models.TextField(blank=True, default='')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('species', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='illustration',
                    to='jizz.species',
                )),
            ],
            options={
                'verbose_name': 'species illustration',
                'verbose_name_plural': 'species illustrations',
            },
        ),
    ]

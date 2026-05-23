# Generated manually for MediaPrediction

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0014_normalize_media_contributor'),
    ]

    operations = [
        migrations.CreateModel(
            name='MediaPrediction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('predicted_review_type', models.CharField(choices=[('approved', 'Approved'), ('rejected', 'Rejected')], max_length=20)),
                ('confidence', models.FloatField(blank=True, help_text='Model confidence (e.g. max class probability).', null=True)),
                ('model_version', models.CharField(db_index=True, max_length=64)),
                ('features_version', models.CharField(blank=True, default='', max_length=64)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('media', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='first_assertion_prediction', to='media.media')),
            ],
            options={
                'verbose_name': 'Media prediction',
                'verbose_name_plural': 'Media predictions',
            },
        ),
    ]

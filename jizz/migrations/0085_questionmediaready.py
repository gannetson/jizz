# Generated manually for QuestionMediaReady

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0084_countryspeciesfrequency'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuestionMediaReady',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ready_at', models.DateTimeField()),
                ('player', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='question_media_ready', to='jizz.player')),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='media_ready', to='jizz.question')),
            ],
            options={
                'unique_together': {('player', 'question')},
            },
        ),
    ]

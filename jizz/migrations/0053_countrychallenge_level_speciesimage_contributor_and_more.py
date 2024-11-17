# Generated by Django 4.2.3 on 2024-11-17 12:59

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0052_rename_message_feedback_comment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='countrychallenge',
            name='level',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='speciesimage',
            name='contributor',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='speciesimage',
            name='link',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='speciessound',
            name='contributor',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='speciessound',
            name='link',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='speciesvideo',
            name='contributor',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='speciesvideo',
            name='link',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='ChallengeLevel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('level', models.IntegerField(default=0)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('jokers', models.IntegerField(default=0)),
                ('passed', models.BooleanField(default=True)),
                ('challenge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='levels', to='jizz.countrychallenge')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='challenges', to='jizz.game')),
            ],
        ),
    ]

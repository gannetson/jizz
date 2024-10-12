# Generated by Django 4.2.3 on 2024-10-12 12:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0032_question_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='media',
            field=models.CharField(choices=[('images', 'Images'), ('video', 'Video'), ('audio', 'Audio')], default='images', max_length=10),
        ),
        migrations.AddField(
            model_name='game',
            name='repeat',
            field=models.BooleanField(default=False),
        ),
    ]

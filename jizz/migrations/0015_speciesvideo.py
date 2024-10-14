# Generated by Django 4.2.3 on 2024-10-05 16:26

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0014_rename_speciessounds_speciessound'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpeciesVideo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField()),
                ('species', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='videos', to='jizz.species')),
            ],
        ),
    ]

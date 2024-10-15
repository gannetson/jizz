# Generated by Django 4.2.3 on 2024-10-09 22:52

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0026_rename_publications_question_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='language',
            field=models.CharField(default='en', max_length=2),
        ),
        migrations.AlterField(
            model_name='countryspecies',
            name='country',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='countryspecies', to='jizz.country'),
        ),
        migrations.AlterField(
            model_name='countryspecies',
            name='species',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='countryspecies', to='jizz.species'),
        ),
    ]
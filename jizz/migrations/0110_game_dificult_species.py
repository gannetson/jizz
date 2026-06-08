from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0109_journeystep_family_step_remove_tax_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='dificult_species',
            field=models.BooleanField(
                default=False,
                help_text='Pick question species randomly from the top 100 most often answered wrong for this country (global mistake stats).',
            ),
        ),
    ]

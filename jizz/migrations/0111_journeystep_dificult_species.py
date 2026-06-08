from django.db import migrations, models


def set_dificult_species_from_step_type(apps, schema_editor):
    JourneyStep = apps.get_model('jizz', 'JourneyStep')
    JourneyStep.objects.filter(step_type='dificult').update(dificult_species=True)


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0110_game_dificult_species'),
    ]

    operations = [
        migrations.RenameField(
            model_name='journeystep',
            old_name='include_escapes',
            new_name='dificult_species',
        ),
        migrations.AlterField(
            model_name='journeystep',
            name='dificult_species',
            field=models.BooleanField(
                default=False,
                help_text='Pick question species from top mistake targets for this country.',
            ),
        ),
        migrations.RunPython(set_dificult_species_from_step_type, migrations.RunPython.noop),
    ]

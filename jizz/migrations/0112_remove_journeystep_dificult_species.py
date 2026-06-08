from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0111_journeystep_dificult_species'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='journeystep',
            name='dificult_species',
        ),
    ]

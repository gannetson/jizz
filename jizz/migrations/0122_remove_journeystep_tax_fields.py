from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0121_journeystep_game_params'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='journeystep',
            name='tax_order',
        ),
        migrations.RemoveField(
            model_name='journeystep',
            name='tax_family',
        ),
    ]

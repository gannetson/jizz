from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jizz", "0087_alter_frequency_choices_ebird_st"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="force_ended",
            field=models.BooleanField(
                default=False,
                help_text="True when a player ended the session early (WebSocket end_game) before all rounds.",
            ),
        ),
    ]

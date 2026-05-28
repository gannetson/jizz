"""Replace Game.include_rare / ChallengeLevel.include_rare with rarity frequency tiers."""

from django.db import migrations, models


def forwards_rarity_from_include_rare(apps, schema_editor):
    Game = apps.get_model("jizz", "Game")
    ChallengeLevel = apps.get_model("jizz", "ChallengeLevel")
    Game.objects.filter(include_rare=False).update(rarity="regular")
    Game.objects.filter(include_rare=True).update(rarity="exceptional")
    ChallengeLevel.objects.filter(include_rare=False).update(rarity="regular")
    ChallengeLevel.objects.filter(include_rare=True).update(rarity="exceptional")


class Migration(migrations.Migration):
    dependencies = [
        ("jizz", "0095_country_iso3_codes"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="rarity",
            field=models.CharField(
                choices=[
                    ("familiar", "Familiar"),
                    ("regular", "Regular"),
                    ("exceptional", "Exceptional"),
                ],
                default="regular",
                help_text="Filter CountrySpecies by frequency tier for question selection.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="challengelevel",
            name="rarity",
            field=models.CharField(
                choices=[
                    ("familiar", "Familiar"),
                    ("regular", "Regular"),
                    ("exceptional", "Exceptional"),
                ],
                default="regular",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards_rarity_from_include_rare, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="game",
            name="include_rare",
        ),
        migrations.RemoveField(
            model_name="challengelevel",
            name="include_rare",
        ),
    ]

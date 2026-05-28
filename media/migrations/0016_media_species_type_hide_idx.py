from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0015_mediaprediction'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='media',
            index=models.Index(
                fields=['species', 'type', 'hide'],
                name='media_species_type_hide_idx',
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0120_speed_challenge'),
    ]

    operations = [
        migrations.AddField(
            model_name='journeystep',
            name='include_escapes',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='journeystep',
            name='tax_order',
            field=models.CharField(
                blank=True,
                help_text='Only show birds from this order',
                max_length=100,
                null=True,
                verbose_name='Taxonomic order',
            ),
        ),
        migrations.AddField(
            model_name='journeystep',
            name='tax_family',
            field=models.CharField(
                blank=True,
                help_text='Only show birds from this family (family steps auto-pick when empty)',
                max_length=100,
                null=True,
                verbose_name='Taxonomic family',
            ),
        ),
        migrations.AlterField(
            model_name='journeystep',
            name='media',
            field=models.CharField(
                choices=[('images', 'Images'), ('video', 'Video'), ('audio', 'Audio')],
                default='images',
                max_length=10,
            ),
        ),
    ]

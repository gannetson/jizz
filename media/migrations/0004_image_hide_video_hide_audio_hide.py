from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0003_alter_image_link_alter_image_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='audio',
            name='hide',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='image',
            name='hide',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='video',
            name='hide',
            field=models.BooleanField(default=False),
        ),
    ]


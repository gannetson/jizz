from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0132_userprofile_visual_style'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='visual_style',
            field=models.CharField(
                choices=[
                    ('classic', 'Classic'),
                    ('stylish', 'Stylish'),
                    ('none', 'None'),
                ],
                default='classic',
                help_text='In-app illustration style (classic comic, stylish, or none)',
                max_length=16,
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0131_userprofile_app_language'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='visual_style',
            field=models.CharField(
                choices=[('classic', 'Classic'), ('stylish', 'Stylish')],
                default='classic',
                help_text='In-app illustration style (classic comic or stylish)',
                max_length=16,
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0130_feedback_contact'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='app_language',
            field=models.CharField(
                blank=True,
                default='',
                help_text='App UI language (empty = not set; clients guess from the device)',
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='language',
            field=models.CharField(
                blank=True,
                default='en',
                help_text='Bird name language',
                max_length=10,
            ),
        ),
    ]

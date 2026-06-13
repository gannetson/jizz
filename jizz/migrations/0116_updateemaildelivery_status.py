from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0115_mailsettings_footer_quill'),
    ]

    operations = [
        migrations.AddField(
            model_name='updateemaildelivery',
            name='status',
            field=models.CharField(
                choices=[
                    ('sending', 'Sending'),
                    ('completed', 'Completed'),
                    ('failed', 'Failed'),
                ],
                default='completed',
                max_length=20,
            ),
        ),
    ]

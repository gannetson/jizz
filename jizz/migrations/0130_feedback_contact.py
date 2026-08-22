from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0129_marketingpage'),
    ]

    operations = [
        migrations.AddField(
            model_name='feedback',
            name='contact_email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='feedback',
            name='contact_name',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0102_merge_20260530_1105'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='journeylevel',
            name='shadow',
        ),
    ]

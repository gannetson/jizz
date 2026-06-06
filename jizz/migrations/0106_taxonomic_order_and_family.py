from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0105_feedback_user_nullable_player'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaxonomicOrder',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_latin', models.CharField(max_length=200, unique=True)),
                ('name_en', models.CharField(max_length=200)),
                ('name_nl', models.CharField(max_length=200)),
                ('description_en', models.TextField(blank=True, default='')),
                ('description_nl', models.TextField(blank=True, default='')),
            ],
            options={
                'verbose_name': 'taxonomic order',
                'verbose_name_plural': 'taxonomic orders',
                'ordering': ['name_latin'],
            },
        ),
        migrations.CreateModel(
            name='TaxonomicFamily',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_latin', models.CharField(max_length=200, unique=True)),
                ('name_en', models.CharField(max_length=200)),
                ('name_nl', models.CharField(max_length=200)),
                ('description_en', models.TextField(blank=True, default='')),
                ('description_nl', models.TextField(blank=True, default='')),
                (
                    'taxonomic_order',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='families',
                        to='jizz.taxonomicorder',
                    ),
                ),
            ],
            options={
                'verbose_name': 'taxonomic family',
                'verbose_name_plural': 'taxonomic families',
                'ordering': ['name_latin'],
            },
        ),
    ]

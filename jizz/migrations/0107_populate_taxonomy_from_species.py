from django.db import migrations, models
import django.db.models.deletion


def populate_and_link_taxonomy(apps, schema_editor):
    Species = apps.get_model('jizz', 'Species')
    TaxonomicOrder = apps.get_model('jizz', 'TaxonomicOrder')
    TaxonomicFamily = apps.get_model('jizz', 'TaxonomicFamily')

    order_names = (
        Species.objects.exclude(tax_order__isnull=True)
        .exclude(tax_order='')
        .values_list('tax_order', flat=True)
        .distinct()
    )
    for name_latin in order_names:
        TaxonomicOrder.objects.get_or_create(
            name_latin=name_latin,
            defaults={'name_en': name_latin, 'name_nl': name_latin},
        )

    family_names = (
        Species.objects.exclude(tax_family__isnull=True)
        .exclude(tax_family='')
        .values_list('tax_family', flat=True)
        .distinct()
    )
    for name_latin in family_names:
        TaxonomicFamily.objects.get_or_create(
            name_latin=name_latin,
            defaults={'name_en': name_latin, 'name_nl': name_latin},
        )

    for order in TaxonomicOrder.objects.all():
        Species.objects.filter(tax_order=order.name_latin).update(taxonomic_order_id=order.id)

    for family in TaxonomicFamily.objects.all():
        Species.objects.filter(tax_family=family.name_latin).update(taxonomic_family_id=family.id)


def reverse_populate_and_link_taxonomy(apps, schema_editor):
    Species = apps.get_model('jizz', 'Species')
    TaxonomicFamily = apps.get_model('jizz', 'TaxonomicFamily')
    TaxonomicOrder = apps.get_model('jizz', 'TaxonomicOrder')
    Species.objects.update(taxonomic_order_id=None, taxonomic_family_id=None)
    TaxonomicFamily.objects.all().delete()
    TaxonomicOrder.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0106_taxonomic_order_and_family'),
    ]

    operations = [
        migrations.AddField(
            model_name='species',
            name='taxonomic_order',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='species',
                to='jizz.taxonomicorder',
            ),
        ),
        migrations.AddField(
            model_name='species',
            name='taxonomic_family',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='species',
                to='jizz.taxonomicfamily',
            ),
        ),
        migrations.RunPython(populate_and_link_taxonomy, reverse_populate_and_link_taxonomy),
    ]

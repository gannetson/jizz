from django.test import TestCase

from jizz.models import Species, TaxonomicFamily, TaxonomicOrder
from jizz.tests.taxonomy_helpers import make_species_with_taxonomy


class TaxonomyMigrationTestCase(TestCase):
    def test_species_taxonomy_properties_match_fk_values(self):
        order = TaxonomicOrder.objects.create(
            name_latin='Passeriformes',
            name_en='Passeriformes',
            name_nl='Passeriformes',
        )
        family = TaxonomicFamily.objects.create(
            name_latin='Paridae',
            name_en='Tits and Chickadees',
            name_nl='Tits and Chickadees',
            taxonomic_order=order,
        )
        species = Species.objects.create(
            name='Great Tit',
            name_latin='Parus major',
            code='gretit1',
            taxonomic_order=order,
            taxonomic_family=family,
        )
        self.assertEqual(species.tax_order, 'Passeriformes')
        self.assertEqual(species.tax_family, 'Paridae')
        self.assertEqual(species.tax_family_en, 'Tits and Chickadees')

    def test_make_species_with_taxonomy_helper(self):
        species = make_species_with_taxonomy(
            name='Robin',
            name_latin='Erithacus rubecula',
            code='eurrob1',
            tax_order='Passeriformes',
            tax_family='Muscicapidae',
            tax_family_en='Old World Flycatchers',
        )
        self.assertEqual(species.tax_order, 'Passeriformes')
        self.assertEqual(species.tax_family, 'Muscicapidae')
        self.assertEqual(species.tax_family_en, 'Old World Flycatchers')
        self.assertEqual(TaxonomicOrder.objects.filter(name_latin='Passeriformes').count(), 1)
        self.assertEqual(TaxonomicFamily.objects.filter(name_latin='Muscicapidae').count(), 1)

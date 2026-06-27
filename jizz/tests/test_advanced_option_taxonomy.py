from django.test import SimpleTestCase, TestCase

from jizz.game_question_selection import advanced_option_species
from jizz.taxonomy_parse import parse_genus_from_sci_name
from jizz.tests.taxonomy_helpers import make_species_with_taxonomy


class ParseGenusFromSciNameTests(SimpleTestCase):
    def test_binomial(self):
        self.assertEqual(parse_genus_from_sci_name('Turdus migratorius'), 'Turdus')

    def test_hybrid_returns_none(self):
        self.assertIsNone(parse_genus_from_sci_name('Anas platyrhynchos x Anas rubripes'))

    def test_sp_returns_none(self):
        self.assertIsNone(parse_genus_from_sci_name('Accipiter sp.'))

    def test_single_word_returns_none(self):
        self.assertIsNone(parse_genus_from_sci_name('Anseriformes'))


class AdvancedOptionTaxonomyTests(TestCase):
    def _distractors(self, candidate_ids, answer):
        options = advanced_option_species(candidate_ids, answer)
        self.assertEqual(len(options), 6)
        self.assertEqual(len({s.id for s in options}), 6)
        self.assertIn(answer, options)
        return [s for s in options if s.id != answer.id]

    def test_prefers_same_genus(self):
        order = 'Passeriformes'
        family = 'Parulidae'
        genus = 'Setophaga'
        answer = make_species_with_taxonomy(
            name='Yellow Warbler',
            name_latin='Setophaga petechia',
            code='yelwar',
            tax_order=order,
            tax_family=family,
            tax_genus=genus,
            tax_ordering=500.0,
        )
        same_genus = [
            make_species_with_taxonomy(
                name=f'Warbler {i}',
                name_latin=f'Setophaga sp{i}',
                code=f'war{i}',
                tax_order=order,
                tax_family=family,
                tax_genus=genus,
                tax_ordering=490.0 + i,
            )
            for i in range(5)
        ]
        other_family = make_species_with_taxonomy(
            name='Robin',
            name_latin='Turdus migratorius',
            code='amerob',
            tax_order='Passeriformes',
            tax_family='Turdidae',
            tax_genus='Turdus',
            tax_ordering=600.0,
        )
        candidate_ids = [s.id for s in same_genus] + [other_family.id, answer.id]
        distractors = self._distractors(candidate_ids, answer)
        self.assertEqual(len(distractors), 5)
        for species in distractors:
            self.assertEqual(species.taxonomic_genus_id, answer.taxonomic_genus_id)

    def test_fills_from_family_when_genus_exhausted(self):
        order = 'Passeriformes'
        family = 'Parulidae'
        answer = make_species_with_taxonomy(
            name='Yellow Warbler',
            name_latin='Setophaga petechia',
            code='yelwar',
            tax_order=order,
            tax_family=family,
            tax_genus='Setophaga',
            tax_ordering=500.0,
        )
        same_genus = make_species_with_taxonomy(
            name='Other Setophaga',
            name_latin='Setophaga coronata',
            code='yelwar2',
            tax_order=order,
            tax_family=family,
            tax_genus='Setophaga',
            tax_ordering=501.0,
        )
        same_family = [
            make_species_with_taxonomy(
                name=f'Parula {i}',
                name_latin=f'Parula sp{i}',
                code=f'par{i}',
                tax_order=order,
                tax_family=family,
                tax_genus='Parula',
                tax_ordering=510.0 + i,
            )
            for i in range(3)
        ]
        other_order = make_species_with_taxonomy(
            name='Duck',
            name_latin='Anas platyrhynchos',
            code='mallar3',
            tax_order='Anseriformes',
            tax_family='Anatidae',
            tax_genus='Anas',
            tax_ordering=100.0,
        )
        candidate_ids = [same_genus.id] + [s.id for s in same_family] + [other_order.id, answer.id]
        distractors = self._distractors(candidate_ids, answer)
        family_ids = {same_genus.id} | {s.id for s in same_family}
        self.assertTrue(all(s.id in family_ids for s in distractors))

    def test_fills_from_order_when_family_exhausted(self):
        order_obj_name = 'Passeriformes'
        answer = make_species_with_taxonomy(
            name='Yellow Warbler',
            name_latin='Setophaga petechia',
            code='yelwar',
            tax_order=order_obj_name,
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=500.0,
        )
        same_order = [
            make_species_with_taxonomy(
                name=f'Thrush {i}',
                name_latin=f'Turdus sp{i}',
                code=f'thr{i}',
                tax_order=order_obj_name,
                tax_family='Turdidae',
                tax_genus='Turdus',
                tax_ordering=600.0 + i,
            )
            for i in range(4)
        ]
        other_order = make_species_with_taxonomy(
            name='Duck',
            name_latin='Anas platyrhynchos',
            code='mallar4',
            tax_order='Anseriformes',
            tax_family='Anatidae',
            tax_genus='Anas',
            tax_ordering=100.0,
        )
        candidate_ids = [s.id for s in same_order] + [other_order.id, answer.id]
        distractors = self._distractors(candidate_ids, answer)
        same_order_ids = {s.id for s in same_order}
        self.assertTrue(all(s.id in same_order_ids for s in distractors))

    def test_falls_back_to_global_tax_ordering(self):
        answer = make_species_with_taxonomy(
            name='Yellow Warbler',
            name_latin='Setophaga petechia',
            code='yelwar',
            tax_order='Passeriformes',
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=500.0,
        )
        neighbors = [
            make_species_with_taxonomy(
                name=f'Neighbor {i}',
                name_latin=f'Genus{i} sp',
                code=f'nb{i}',
                tax_order='Anseriformes',
                tax_family='Anatidae',
                tax_genus=f'Genus{i}',
                tax_ordering=498.0 + i,
            )
            for i in range(4)
        ]
        far = make_species_with_taxonomy(
            name='Far',
            name_latin='Far away',
            code='faraw',
            tax_order='Galliformes',
            tax_family='Phasianidae',
            tax_genus='Phasianus',
            tax_ordering=900.0,
        )
        candidate_ids = [s.id for s in neighbors] + [far.id, answer.id]
        distractors = self._distractors(candidate_ids, answer)
        neighbor_ids = {s.id for s in neighbors}
        self.assertTrue(all(s.id in neighbor_ids for s in distractors))

    def test_null_tax_ordering_uses_id_within_tier(self):
        answer = make_species_with_taxonomy(
            name='Answer',
            name_latin='Setophaga petechia',
            code='ans001',
            tax_order='Passeriformes',
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=None,
        )
        lower = make_species_with_taxonomy(
            name='Lower',
            name_latin='Setophaga a',
            code='low001',
            tax_order='Passeriformes',
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=None,
        )
        higher = [
            make_species_with_taxonomy(
                name=f'Higher {i}',
                name_latin=f'Setophaga h{i}',
                code=f'hi{i:02d}',
                tax_order='Passeriformes',
                tax_family='Parulidae',
                tax_genus='Setophaga',
                tax_ordering=None,
            )
            for i in range(3)
        ]
        candidate_ids = [lower.id] + [s.id for s in higher] + [answer.id]
        distractors = self._distractors(candidate_ids, answer)
        self.assertEqual(len(distractors), 5)
        self.assertTrue(all(s.taxonomic_genus_id == answer.taxonomic_genus_id for s in distractors))

    def test_no_duplicate_options_when_pool_is_small(self):
        answer = make_species_with_taxonomy(
            name='Answer',
            name_latin='Setophaga petechia',
            code='dupans',
            tax_order='Passeriformes',
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=500.0,
        )
        lower = make_species_with_taxonomy(
            name='Lower',
            name_latin='Setophaga a',
            code='duplow',
            tax_order='Passeriformes',
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=499.0,
        )
        higher = make_species_with_taxonomy(
            name='Higher',
            name_latin='Setophaga b',
            code='duphi',
            tax_order='Passeriformes',
            tax_family='Parulidae',
            tax_genus='Setophaga',
            tax_ordering=501.0,
        )
        extras = [
            make_species_with_taxonomy(
                name=f'Extra {i}',
                name_latin=f'Setophaga e{i}',
                code=f'dupex{i}',
                tax_order='Passeriformes',
                tax_family='Parulidae',
                tax_genus='Setophaga',
                tax_ordering=502.0 + i,
            )
            for i in range(3)
        ]
        candidate_ids = [lower.id, higher.id] + [s.id for s in extras] + [answer.id]
        options = advanced_option_species(candidate_ids, answer)
        self.assertEqual(len(options), 6)
        self.assertEqual(len({s.id for s in options}), 6)

    def test_hybrid_skips_genus_tier(self):
        answer = make_species_with_taxonomy(
            name='Hybrid',
            name_latin='Anas x Something',
            code='hyb001',
            tax_order='Anseriformes',
            tax_family='Anatidae',
            tax_genus=None,
            tax_ordering=200.0,
        )
        same_family = [
            make_species_with_taxonomy(
                name=f'Duck {i}',
                name_latin=f'Anas sp{i}',
                code=f'duk{i}',
                tax_order='Anseriformes',
                tax_family='Anatidae',
                tax_genus='Anas',
                tax_ordering=201.0 + i,
            )
            for i in range(4)
        ]
        candidate_ids = [s.id for s in same_family] + [answer.id]
        distractors = self._distractors(candidate_ids, answer)
        self.assertTrue(
            all(s.taxonomic_family_id == answer.taxonomic_family_id for s in distractors)
        )

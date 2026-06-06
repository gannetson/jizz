from django.test import SimpleTestCase

from jizz.services.taxonomy_texts import (
    apply_wikipedia_texts,
    build_ebird_family_maps,
    build_ebird_order_names,
    clean_sp_placeholder,
    dutch_name_from_wikipedia,
    family_order_links_to_apply,
    first_sentences,
    langlink_target,
    lookup_is_complete,
    wiki_title_to_name,
)


class TaxonomyTextsUtilTestCase(SimpleTestCase):
    def test_first_sentences_limits_to_three(self):
        text = 'One. Two. Three. Four. Five.'
        self.assertEqual(first_sentences(text, max_sentences=3), 'One. Two. Three.')

    def test_wiki_title_to_name_strips_disambiguation(self):
        self.assertEqual(wiki_title_to_name('Mezen (vogels)'), 'Mezen')
        self.assertEqual(wiki_title_to_name('Passerine'), 'Passerine')

    def test_clean_sp_placeholder(self):
        self.assertEqual(clean_sp_placeholder('passerine sp.'), 'passerine')
        self.assertEqual(clean_sp_placeholder('Thrush sp.'), 'Thrush')

    def test_build_ebird_family_maps_picks_most_common_name(self):
        rows = [
            {'category': 'species', 'familySciName': 'Paridae', 'familyComName': 'Tits', 'order': 'Passeriformes'},
            {'category': 'species', 'familySciName': 'Paridae', 'familyComName': 'Tits', 'order': 'Passeriformes'},
            {'category': 'species', 'familySciName': 'Paridae', 'familyComName': 'Chickadees', 'order': 'Passeriformes'},
        ]
        family_en, family_order = build_ebird_family_maps(rows)
        self.assertEqual(family_en['Paridae'], 'Tits')
        self.assertEqual(family_order['Paridae'], 'Passeriformes')

    def test_build_ebird_order_names_uses_order_level_spuh(self):
        rows = [
            {
                'category': 'spuh',
                'order': 'Passeriformes',
                'sciName': 'Passeriformes sp.',
                'comName': 'passerine sp.',
            },
        ]
        order_en = build_ebird_order_names(rows, groups=[])
        self.assertEqual(order_en['Passeriformes'], 'Passerine')

    def test_build_ebird_order_names_uses_sppgroup_majority(self):
        rows = [
            {'category': 'species', 'order': 'Anseriformes', 'taxonOrder': 300.0},
            {'category': 'species', 'order': 'Anseriformes', 'taxonOrder': 400.0},
        ]
        groups = [
            {
                'groupName': 'Waterfowl',
                'taxonOrderBounds': [[200.0, 500.0]],
            },
            {
                'groupName': 'Screamers',
                'taxonOrderBounds': [[232.0, 250.0]],
            },
        ]
        order_en = build_ebird_order_names(rows, groups=groups)
        self.assertEqual(order_en['Anseriformes'], 'Waterfowl')

    def test_dutch_name_from_wikipedia_keeps_latin_when_nl_title_matches(self):
        name = dutch_name_from_wikipedia(
            'Accipitriformes',
            {
                'title': 'Accipitriformes',
                'name': 'Accipitriformes',
                'description': 'De Accipitriformes (ook wel roestvogels genoemd) zijn een orde.',
            },
        )
        self.assertEqual(name, 'Accipitriformes')

    def test_dutch_name_from_wikipedia_uses_localized_title(self):
        name = dutch_name_from_wikipedia(
            'Passeriformes',
            {
                'title': 'Zangvogels',
                'name': 'Zangvogels',
                'description': 'Zangvogels (Passeriformes) zijn ...',
            },
        )
        self.assertEqual(name, 'Zangvogels')

    def test_apply_wikipedia_texts_keeps_separate_nl_description(self):
        result = apply_wikipedia_texts(
            name_latin='Paridae',
            name_en='Tits, Chickadees, and Titmice',
            wiki_en={
                'name': 'Tits',
                'description': 'The tits are a family of small passerine birds.',
            },
            wiki_nl={
                'name': 'Mezen',
                'description': 'De mezen zijn een familie kleine zangvogels.',
            },
        )
        self.assertEqual(result['name_en'], 'Tits, Chickadees, and Titmice')
        self.assertEqual(result['name_nl'], 'Mezen')
        self.assertIn('tits', result['description_en'].lower())
        self.assertIn('mezen', result['description_nl'].lower())
        self.assertNotEqual(result['description_en'], result['description_nl'])

    def test_apply_wikipedia_texts_leaves_nl_description_empty_without_translation(self):
        result = apply_wikipedia_texts(
            name_latin='Fooidae',
            name_en='Foo family',
            wiki_en={'name': 'Foo family', 'description': 'English only intro.'},
            wiki_nl={'name': 'Foo', 'description': ''},
        )
        self.assertEqual(result['description_en'], 'English only intro.')
        self.assertEqual(result['description_nl'], '')

    def test_langlink_target_reads_star_field(self):
        self.assertEqual(langlink_target({'lang': 'nl', '*': 'Zangvogels'}), 'Zangvogels')

    def test_lookup_is_complete_requires_description_or_localized_name(self):
        self.assertTrue(lookup_is_complete({'name': 'Zangvogels', 'description': ''}, latin_name='Passeriformes'))
        self.assertFalse(lookup_is_complete({'name': 'Passeriformes', 'description': ''}, latin_name='Passeriformes'))

    def test_family_order_links_to_apply_skips_unchanged(self):
        class Family:
            def __init__(self, name_latin, taxonomic_order_id):
                self.name_latin = name_latin
                self.taxonomic_order_id = taxonomic_order_id

        class Order:
            def __init__(self, pk, name_latin):
                self.pk = pk
                self.name_latin = name_latin

        order = Order(1, 'Passeriformes')
        families = [
            Family('Paridae', 1),
            Family('Turdidae', 2),
        ]
        links = family_order_links_to_apply(
            family_order={'Paridae': 'Passeriformes', 'Turdidae': 'Passeriformes'},
            families=families,
            orders_by_latin={'Passeriformes': order},
        )
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0][0].name_latin, 'Turdidae')
        self.assertEqual(links[0][2], 'Passeriformes')

    def test_apply_wikipedia_texts_falls_back_to_latin_for_nl_name(self):
        result = apply_wikipedia_texts(
            name_latin='Paridae',
            name_en='Tits, Chickadees, and Titmice',
            wiki_en={'name': 'Tits', 'description': ''},
            wiki_nl={'name': '', 'description': ''},
        )
        self.assertEqual(result['name_nl'], 'Paridae')

from django.test import Client, TestCase
from django.urls import reverse

from jizz.models import (
    Answer,
    Country,
    CountrySpecies,
    Game,
    Player,
    PlayerScore,
    Question,
    QuestionOption,
    Species,
)
from jizz.quiz_mistake_stats import (
    MIN_TIMES_SHOWN_COUNTRY,
    get_confusion_pair_rows,
    get_species_mistake_rows,
    get_top_mistake_species_ids,
    get_top_mistake_target_species_ids,
    min_times_shown_for_filter,
    normalize_country_filter,
    sort_species_rows,
)


class QuizMistakeStatsTests(TestCase):
    def setUp(self):
        self.country = Country.objects.create(code="QM", name="Quiz Mistake Land")
        self.game = Game.objects.create(
            country=self.country,
            level="beginner",
            length=5,
            media="images",
            multiplayer=False,
        )
        self.player = Player.objects.create(name="P", language="en")
        self.score = PlayerScore.objects.create(player=self.player, game=self.game)

        self.sp_a = Species.objects.create(name="Alpha", name_latin="Alpha a", code="QA01")
        self.sp_b = Species.objects.create(name="Beta", name_latin="Beta b", code="QB02")
        self.sp_c = Species.objects.create(name="Gamma", name_latin="Gamma c", code="QC03")

        for sp in (self.sp_a, self.sp_b, self.sp_c):
            CountrySpecies.objects.create(country=self.country, species=sp, status="native")

        # Question 1: target A, options A,B,C — two wrong picks of B (as distractor)
        self.q1 = Question.objects.create(game=self.game, species=self.sp_a, number=1, sequence=1)
        for order, sp in enumerate([self.sp_a, self.sp_b, self.sp_c], start=1):
            QuestionOption.objects.create(question=self.q1, species=sp, order=order)

        Answer.objects.create(
            player_score=self.score,
            question=self.q1,
            answer=self.sp_b,
            correct=False,
        )

        # Second player answers same question wrong again (another score row — second answer row)
        self.player2 = Player.objects.create(name="P2", language="en")
        self.score2 = PlayerScore.objects.create(player=self.player2, game=self.game)
        Answer.objects.create(
            player_score=self.score2,
            question=self.q1,
            answer=self.sp_b,
            correct=False,
        )

        # Question 2: target B, wrong pick A — pair (A,B) reverse direction from q1
        self.q2 = Question.objects.create(game=self.game, species=self.sp_b, number=2, sequence=2)
        for order, sp in enumerate([self.sp_b, self.sp_a, self.sp_c], start=1):
            QuestionOption.objects.create(question=self.q2, species=sp, order=order)

        Answer.objects.create(
            player_score=self.score,
            question=self.q2,
            answer=self.sp_a,
            correct=False,
        )

        # Species table requires ≥10 times shown as an option on answered questions.
        for i in range(8):
            p = Player.objects.create(name=f"Pq1-{i}", language="en")
            sc = PlayerScore.objects.create(player=p, game=self.game)
            Answer.objects.create(
                player_score=sc,
                question=self.q1,
                answer=self.sp_b,
                correct=False,
            )
        for i in range(9):
            p = Player.objects.create(name=f"Pq2-{i}", language="en")
            sc = PlayerScore.objects.create(player=p, game=self.game)
            Answer.objects.create(
                player_score=sc,
                question=self.q2,
                answer=self.sp_a,
                correct=False,
            )

    def test_species_columns_and_error_rate(self):
        rows = {r["species_id"]: r for r in get_species_mistake_rows()}
        # B: picked wrong on q1 only = 10
        self.assertEqual(rows[self.sp_b.id]["times_shown"], 10)
        self.assertEqual(rows[self.sp_b.id]["correctly_answered"], 0)
        self.assertEqual(rows[self.sp_b.id]["wrongly_answered"], 10)
        self.assertAlmostEqual(rows[self.sp_b.id]["error_rate"], 100.0)

        # A: picked wrong on q2 only = 10
        self.assertEqual(rows[self.sp_a.id]["times_shown"], 10)
        self.assertEqual(rows[self.sp_a.id]["wrongly_answered"], 10)
        self.assertAlmostEqual(rows[self.sp_a.id]["error_rate"], 100.0)

        # C: never chosen → not included (times_shown=0 < MIN_TIMES_SHOWN)
        self.assertNotIn(self.sp_c.id, rows)

    def test_pair_aggregation_undirected_and_directed(self):
        """Same pair (A,B) from A→B wrong and B→A wrong ends up one bucket."""
        low_id, high_id = sorted([self.sp_a.id, self.sp_b.id])
        rows = get_confusion_pair_rows()
        pair = next(r for r in rows if r["low_id"] == low_id and r["high_id"] == high_id)
        # q1: target low (A) pick high (B) + q2: target high (B) pick low (A) → 3 total if q1 has 2 + q2 has 1
        self.assertEqual(pair["total_wrong"], 20)
        if low_id == self.sp_a.id:
            self.assertEqual(pair["when_low_was_target"], 10)
            self.assertEqual(pair["when_high_was_target"], 10)
        else:
            self.assertEqual(pair["when_low_was_target"], 10)
            self.assertEqual(pair["when_high_was_target"], 10)

    def test_sort_species_rows_error_rate(self):
        rows = get_species_mistake_rows()
        sorted_rows = sort_species_rows(rows, "error_rate", descending=True)
        self.assertGreaterEqual(
            sorted_rows[0]["error_rate"] or 0,
            sorted_rows[-1]["error_rate"] or 0,
        )

    def test_public_access(self):
        c = Client()
        res = c.get(reverse("data-quiz-mistakes"))
        self.assertEqual(res.status_code, 302)
        res = c.get(reverse("data-quiz-mistake-species"))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Species mistake statistics")
        res_pairs = c.get(reverse("data-quiz-mistake-pairs"))
        self.assertEqual(res_pairs.status_code, 200)

    def test_staff_urls_redirect_to_data(self):
        c = Client()
        res = c.get(reverse("quiz-mistake-species"))
        self.assertEqual(res.status_code, 302)
        self.assertTrue(res.url.endswith("/data/quiz-mistakes/species/"))

    def test_csv_download_public(self):
        c = Client()
        res = c.get(reverse("data-quiz-mistake-species"), {"format": "csv"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res["Content-Type"])
        self.assertIn("SPECIES MISTAKES", res.content.decode())

        res_pairs = c.get(reverse("data-quiz-mistake-pairs"), {"format": "csv"})
        self.assertEqual(res_pairs.status_code, 200)
        self.assertIn("CONFUSED PAIRS", res_pairs.content.decode())

    def test_country_filter_scopes_species_list_not_answers(self):
        Country.objects.create(code="OT", name="Empty land")
        rows_all = {r["species_id"]: r for r in get_species_mistake_rows()}
        rows_qm = {r["species_id"]: r for r in get_species_mistake_rows("QM")}
        self.assertEqual(set(rows_qm), set(rows_all))
        self.assertEqual(get_species_mistake_rows("OT"), [])
        self.assertEqual(len(get_confusion_pair_rows("OT")), 0)
        self.assertGreater(len(get_confusion_pair_rows("QM")), 0)

    def test_country_filter_uses_global_answers_for_checklist_species(self):
        """A country with no local games still gets stats from answers elsewhere."""
        neighbour = Country.objects.create(code="NB", name="Neighbour land")
        for sp in (self.sp_a, self.sp_b, self.sp_c):
            CountrySpecies.objects.create(country=neighbour, species=sp, status="native")

        rows_nb = {r["species_id"]: r for r in get_species_mistake_rows("NB")}
        rows_qm = {r["species_id"]: r for r in get_species_mistake_rows("QM")}

        self.assertEqual(rows_nb[self.sp_b.id]["times_shown"], rows_qm[self.sp_b.id]["times_shown"])
        self.assertEqual(
            rows_nb[self.sp_a.id]["wrongly_answered"],
            rows_qm[self.sp_a.id]["wrongly_answered"],
        )
        pair_nb = get_confusion_pair_rows("NB")
        pair_qm = get_confusion_pair_rows("QM")
        self.assertEqual(len(pair_nb), len(pair_qm))
        self.assertEqual(pair_nb[0]["total_wrong"], pair_qm[0]["total_wrong"])

    def test_normalize_country_filter(self):
        self.assertIsNone(normalize_country_filter(""))
        self.assertIsNone(normalize_country_filter("nosuch"))
        self.assertEqual(normalize_country_filter("qm"), "QM")

    def test_country_filter_uses_lower_min_times_shown(self):
        """Country-scoped stats include species below the global 10-pick threshold."""
        self.assertEqual(min_times_shown_for_filter("QM"), MIN_TIMES_SHOWN_COUNTRY)
        self.assertEqual(min_times_shown_for_filter(None), 10)

        game = Game.objects.create(
            country=self.country,
            level="beginner",
            length=5,
            media="images",
            multiplayer=False,
        )
        ps = PlayerScore.objects.create(player=self.player, game=game)
        q = Question.objects.create(game=game, species=self.sp_c, number=1, sequence=1)
        for order, sp in enumerate([self.sp_c, self.sp_a, self.sp_b], start=1):
            QuestionOption.objects.create(question=q, species=sp, order=order)
        for _i in range(MIN_TIMES_SHOWN_COUNTRY):
            Answer.objects.create(
                player_score=ps,
                question=q,
                answer=self.sp_c,
                correct=False,
            )

        rows_global = {r["species_id"]: r for r in get_species_mistake_rows()}
        self.assertNotIn(self.sp_c.id, rows_global)

        rows_qm = {r["species_id"]: r for r in get_species_mistake_rows("QM")}
        self.assertIn(self.sp_c.id, rows_qm)
        self.assertGreater(len(get_confusion_pair_rows("QM")), 0)

    def test_country_filter_excludes_introduced_uncertain_unknown_status(self):
        """Country-filtered stats ignore CountrySpecies with introduced / uncertain / unknown."""
        sp_intro = Species.objects.create(name="Introduced duck", name_latin="Intro i", code="QI99")
        CountrySpecies.objects.create(country=self.country, species=sp_intro, status="introduced")

        game2 = Game.objects.create(
            country=self.country,
            level="beginner",
            length=5,
            media="images",
            multiplayer=False,
        )
        ps = PlayerScore.objects.create(player=self.player, game=game2)
        q = Question.objects.create(game=game2, species=sp_intro, number=1, sequence=1)
        for order, sp in enumerate([sp_intro, self.sp_a, self.sp_b], start=1):
            QuestionOption.objects.create(question=q, species=sp, order=order)
        for _i in range(10):
            Answer.objects.create(
                player_score=ps,
                question=q,
                answer=self.sp_a,
                correct=False,
            )

        rows_global = {r["species_id"]: r for r in get_species_mistake_rows()}
        self.assertIn(sp_intro.id, rows_global)

        rows_qm = {r["species_id"]: r for r in get_species_mistake_rows("QM")}
        self.assertNotIn(sp_intro.id, rows_qm)

    def test_get_top_mistake_species_ids(self):
        top = get_top_mistake_species_ids("QM", limit=1)
        self.assertEqual(len(top), 1)
        rows = {r["species_id"]: r for r in get_species_mistake_rows("QM")}
        self.assertEqual(top[0], max(rows, key=lambda sid: rows[sid]["wrongly_answered"]))

    def test_get_top_mistake_target_species_ids(self):
        top = get_top_mistake_target_species_ids("QM", limit=2)
        self.assertGreaterEqual(len(top), 1)
        self.assertIn(self.sp_a.id, top)
        self.assertIn(self.sp_b.id, top)

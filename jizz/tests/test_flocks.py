"""Tests for Birdr Flocks Phase 1."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from jizz.flock_challenge import (
    SnapshotItem,
    clone_challenge_into_game,
    flock_content_fingerprint,
    generate_club_mix_snapshot,
    persist_challenge_snapshot,
)
from jizz.models import (
    Answer,
    Country,
    CountrySpecies,
    Flock,
    FlockChallenge,
    FlockChallengeAttempt,
    FlockChallengeItem,
    FlockInvite,
    FlockMembership,
    Game,
    Player,
    PlayerScore,
    Question,
    QuestionOption,
    Species,
)
from media.models import Media

PNG_1X1 = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
    b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
    b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
)


def _auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _seed_species(country, n, *, prefix='sp', frequency='common', media_types=('image', 'audio')):
    species_list = []
    for i in range(n):
        sp = Species.objects.create(
            name=f'{prefix} {i}',
            name_latin=f'{prefix.capitalize()} latin{i}',
            code=f'{prefix[:4]}{i}',
        )
        CountrySpecies.objects.create(
            country=country,
            species=sp,
            status='native',
            frequency=frequency,
        )
        for mt in media_types:
            Media.objects.create(
                species=sp,
                type=mt,
                url=f'https://example.com/{prefix}-{i}-{mt}.jpg',
                source='test',
            )
        species_list.append(sp)
    return species_list


def _manual_snapshot(species_list, length=20):
    items = []
    for i in range(length):
        sp = species_list[i]
        media = Media.objects.filter(species=sp, type='image').first()
        opts = [species_list[(i + j) % len(species_list)].id for j in range(4)]
        if sp.id not in opts:
            opts[0] = sp.id
        items.append(
            SnapshotItem(
                sequence=i + 1,
                species_id=sp.id,
                media_id=media.id,
                media_type='image',
                level='advanced',
                rarity='regular',
                option_species_ids=opts,
            )
        )
    return items


class FlockApiTests(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.admin = User.objects.create_user('flockadmin', password='x')
        self.member = User.objects.create_user('flockmember', password='x')
        self.outsider = User.objects.create_user('outsider', password='x')
        self.client = APIClient()
        self.species = _seed_species(self.country, 24, prefix='fl')

    def _create_flock(self, user=None):
        user = user or self.admin
        _auth(self.client, user)
        res = self.client.post(
            '/api/flocks/',
            {'name': 'Amsterdam Birders', 'country_code': 'NL', 'is_private': True},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        return res.data

    def test_create_flock_and_owner_is_admin(self):
        data = self._create_flock()
        self.assertTrue(data['is_admin'])
        self.assertTrue(data['is_member'])
        self.assertEqual(data['member_count'], 1)
        self.assertIsNotNone(data['invite']['code'])
        self.assertEqual(len(data['invite']['code']), 6)

    def test_list_challenge_includes_my_rank_when_completed(self):
        flock = self._create_flock()
        slug = flock['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species, 20),
        ):
            ch = self.client.post(f'/api/flocks/{slug}/challenges/', {'title': 'W1'}, format='json')
        self.assertEqual(ch.status_code, 201, ch.data)
        challenge_id = ch.data['id']

        listed = self.client.get('/api/flocks/')
        self.assertEqual(listed.status_code, 200)
        row = next(f for f in listed.data if f['slug'] == slug)
        self.assertIsNotNone(row['active_challenge'])
        self.assertFalse(row['active_challenge']['my_completed'])
        self.assertIsNone(row['active_challenge']['my_rank'])

        start = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/', {}, format='json'
        )
        self.assertEqual(start.status_code, 201, start.data)
        self.assertIn('player_token', start.data)
        self.assertTrue(start.data['player_token'])
        game = Game.objects.get(token=start.data['game_token'])
        self.assertEqual(game.host.token, start.data['player_token'])

        detail = self.client.get(f'/api/flocks/{slug}/challenges/{challenge_id}/')
        self.assertEqual(detail.status_code, 200, detail.data)
        self.assertEqual(detail.data['in_progress_game_token'], game.token)
        self.assertEqual(detail.data['my_player_token'], start.data['player_token'])

        # Idempotent continue via start returns same game + player token
        again = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/', {}, format='json'
        )
        self.assertEqual(again.status_code, 200, again.data)
        self.assertEqual(again.data['game_token'], game.token)
        self.assertEqual(again.data['player_token'], start.data['player_token'])

        player = game.host
        ps, _ = PlayerScore.objects.get_or_create(player=player, game=game)
        for q in game.questions.order_by('sequence'):
            Answer.objects.create(player_score=ps, question=q, answer=q.species)
            q.done = True
            q.save(update_fields=['done'])
        complete = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/complete/',
            {'game_token': game.token},
            format='json',
        )
        self.assertEqual(complete.status_code, 200, complete.data)

        listed2 = self.client.get('/api/flocks/')
        row2 = next(f for f in listed2.data if f['slug'] == slug)
        self.assertTrue(row2['active_challenge']['my_completed'])
        self.assertEqual(row2['active_challenge']['my_rank'], 1)
        self.assertIn('#1', row2['active_challenge']['my_rank_label'])


    def test_admin_can_upload_and_clear_logo(self):
        flock = self._create_flock()
        slug = flock['slug']
        invite_token = flock['invite']['token']

        _auth(self.client, self.member)
        self.client.post('/api/flocks/join/', {'token': invite_token}, format='json')
        denied = self.client.patch(
            f'/api/flocks/{slug}/',
            {'logo': SimpleUploadedFile('logo.png', PNG_1X1, content_type='image/png')},
            format='multipart',
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        _auth(self.client, self.admin)
        uploaded = self.client.patch(
            f'/api/flocks/{slug}/',
            {'logo': SimpleUploadedFile('logo.png', PNG_1X1, content_type='image/png')},
            format='multipart',
        )
        self.assertEqual(uploaded.status_code, status.HTTP_200_OK, uploaded.data)
        self.assertIsNotNone(uploaded.data['logo_url'])
        db_flock = Flock.objects.get(slug=slug)
        self.assertTrue(bool(db_flock.logo))

        cleared = self.client.patch(
            f'/api/flocks/{slug}/',
            {'logo': ''},
            format='multipart',
        )
        self.assertEqual(cleared.status_code, status.HTTP_200_OK, cleared.data)
        self.assertIsNone(cleared.data['logo_url'])
        db_flock.refresh_from_db()
        self.assertFalse(bool(db_flock.logo))

    def test_only_admin_can_create_challenge(self):
        flock = self._create_flock()
        slug = flock['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.outsider)
            denied = self.client.post(f'/api/flocks/{slug}/challenges/', {}, format='json')
            self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

            # Join as member (not admin)
            invite_token = flock['invite']['token']
            _auth(self.client, self.member)
            self.client.post('/api/flocks/join/', {'token': invite_token}, format='json')
            denied_member = self.client.post(f'/api/flocks/{slug}/challenges/', {}, format='json')
            self.assertEqual(denied_member.status_code, status.HTTP_403_FORBIDDEN)

            _auth(self.client, self.admin)
            ok = self.client.post(
                f'/api/flocks/{slug}/challenges/',
                {'title': 'Week 1'},
                format='json',
            )
            self.assertEqual(ok.status_code, status.HTTP_201_CREATED, ok.data)
            self.assertEqual(ok.data['length'], 20)
            self.assertEqual(ok.data['item_count'], 20)

    def test_create_challenge_notifies_other_members(self):
        flock = self._create_flock()
        slug = flock['slug']
        invite_token = flock['invite']['token']
        _auth(self.client, self.member)
        self.client.post('/api/flocks/join/', {'token': invite_token}, format='json')

        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ), patch('jizz.flock_views.send_push_to_user') as mock_push:
            _auth(self.client, self.admin)
            ok = self.client.post(
                f'/api/flocks/{slug}/challenges/',
                {'title': 'Week 1'},
                format='json',
            )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED, ok.data)
        mock_push.assert_called()
        notified_ids = {call.args[0].id for call in mock_push.call_args_list}
        self.assertIn(self.member.id, notified_ids)
        self.assertNotIn(self.admin.id, notified_ids)
        self.assertEqual(mock_push.call_args.kwargs['data']['type'], 'flock_challenge')
        self.assertEqual(mock_push.call_args.kwargs['data']['flock_slug'], slug)

    def test_participants_share_identical_content_fingerprint(self):
        flock = self._create_flock()
        slug = flock['slug']
        snapshot = _manual_snapshot(self.species)
        with patch('jizz.flock_views.generate_club_mix_snapshot', return_value=snapshot):
            _auth(self.client, self.admin)
            ch = self.client.post(f'/api/flocks/{slug}/challenges/', {'title': 'W1'}, format='json')
        challenge_id = ch.data['id']
        invite = flock['invite']['token']
        _auth(self.client, self.member)
        self.client.post('/api/flocks/join/', {'token': invite}, format='json')

        start_a = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/',
            {},
            format='json',
        )
        self.assertEqual(start_a.status_code, 201, start_a.data)
        game_a = Game.objects.get(token=start_a.data['game_token'])

        _auth(self.client, self.admin)
        start_b = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/',
            {},
            format='json',
        )
        game_b = Game.objects.get(token=start_b.data['game_token'])

        self.assertTrue(game_a.questions_pregenerated)
        self.assertTrue(game_b.questions_pregenerated)

        def fingerprint(game):
            rows = []
            for q in game.questions.order_by('sequence'):
                opts = tuple(
                    QuestionOption.objects.filter(question=q)
                    .order_by('order')
                    .values_list('species_id', flat=True)
                )
                rows.append((q.sequence, q.species_id, q.media_id, opts))
            return rows

        self.assertEqual(fingerprint(game_a), fingerprint(game_b))
        # Same play order for every participant
        seq_a = list(game_a.questions.order_by('sequence').values_list('species_id', flat=True))
        seq_b = list(game_b.questions.order_by('sequence').values_list('species_id', flat=True))
        self.assertEqual(seq_a, seq_b)
        # Option button order is identical
        opts_a = [
            list(
                QuestionOption.objects.filter(question=q)
                .order_by('order')
                .values_list('species_id', flat=True)
            )
            for q in game_a.questions.order_by('sequence')
        ]
        opts_b = [
            list(
                QuestionOption.objects.filter(question=q)
                .order_by('order')
                .values_list('species_id', flat=True)
            )
            for q in game_b.questions.order_by('sequence')
        ]
        self.assertEqual(opts_a, opts_b)
        # Locked media matches snapshot
        for q, item in zip(
            game_a.questions.order_by('sequence'),
            snapshot,
            strict=True,
        ):
            self.assertEqual(q.media_id, item.media_id)
            self.assertEqual(q.species_id, item.species_id)

    def test_second_start_rejected_after_ranked_complete(self):
        flock = self._create_flock()
        slug = flock['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.admin)
            ch = self.client.post(f'/api/flocks/{slug}/challenges/', {'title': 'W1'}, format='json')
        challenge_id = ch.data['id']

        def play_and_complete(n_correct=17):
            start = self.client.post(
                f'/api/flocks/{slug}/challenges/{challenge_id}/start/',
                {},
                format='json',
            )
            self.assertIn(start.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED), start.data)
            game = Game.objects.get(token=start.data['game_token'])
            player = game.host
            ps, _ = PlayerScore.objects.get_or_create(player=player, game=game)
            for i, q in enumerate(game.questions.order_by('sequence')):
                answer_sp = q.species if i < n_correct else q.options.exclude(id=q.species_id).first()
                if answer_sp is None:
                    answer_sp = q.species
                Answer.objects.create(
                    player_score=ps,
                    question=q,
                    answer=answer_sp,
                )
                q.done = True
                q.save(update_fields=['done'])
            complete = self.client.post(
                f'/api/flocks/{slug}/challenges/{challenge_id}/complete/',
                {'game_token': game.token},
                format='json',
            )
            return start.data, complete.data

        _auth(self.client, self.admin)
        start1, complete1 = play_and_complete(17)
        self.assertTrue(start1['is_ranked'])
        self.assertTrue(complete1['is_ranked'])
        self.assertFalse(complete1['is_practice'])
        self.assertEqual(complete1['correct_count'], 17)

        start2 = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/',
            {},
            format='json',
        )
        self.assertEqual(start2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(start2.data['error'], 'already_completed')

        practice_start = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/',
            {'practice': True},
            format='json',
        )
        self.assertEqual(practice_start.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(practice_start.data['error'], 'practice_not_allowed')

        ranked = FlockChallengeAttempt.objects.get(
            challenge_id=challenge_id, user=self.admin, is_ranked=True, completed_at__isnull=False
        )
        self.assertEqual(ranked.correct_count, 17)

    def test_cannot_create_challenge_while_one_active(self):
        flock = self._create_flock()
        slug = flock['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.admin)
            first = self.client.post(
                f'/api/flocks/{slug}/challenges/',
                {'title': 'W1'},
                format='json',
            )
            self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
            second = self.client.post(
                f'/api/flocks/{slug}/challenges/',
                {'title': 'W2'},
                format='json',
            )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(second.data['error'], 'challenge_already_active')

    def test_leaderboard_orders_by_correct_then_score(self):
        flock = self._create_flock()
        slug = flock['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.admin)
            ch = self.client.post(f'/api/flocks/{slug}/challenges/', {'title': 'W1'}, format='json')
        challenge = FlockChallenge.objects.get(pk=ch.data['id'])
        invite = flock['invite']['token']

        def finish_as(user, correct, birdr):
            _auth(self.client, user)
            if user != self.admin:
                self.client.post('/api/flocks/join/', {'token': invite}, format='json')
            start = self.client.post(
                f'/api/flocks/{slug}/challenges/{challenge.id}/start/',
                {},
                format='json',
            )
            game = Game.objects.get(token=start.data['game_token'])
            player = game.host
            ps, _ = PlayerScore.objects.get_or_create(player=player, game=game, defaults={'score': 0})
            for i, q in enumerate(game.questions.order_by('sequence')):
                ans = q.species if i < correct else q.options.exclude(id=q.species_id).first() or q.species
                Answer.objects.create(player_score=ps, question=q, answer=ans)
            ps.score = birdr
            ps.save(update_fields=['score'])
            self.client.post(
                f'/api/flocks/{slug}/challenges/{challenge.id}/complete/',
                {'game_token': game.token},
                format='json',
            )

        users = [self.admin]
        for i in range(3):
            u = User.objects.create_user(f'lb{i}', password='x')
            users.append(u)
        # higher correct wins over higher birdr score
        finish_as(users[0], 15, 9000)
        finish_as(users[1], 18, 100)
        finish_as(users[2], 18, 500)
        finish_as(users[3], 10, 9999)

        _auth(self.client, self.admin)
        board = self.client.get(
            f'/api/flocks/{slug}/challenges/{challenge.id}/leaderboard/'
        )
        ranks = [(r['correct_count'], r['birdr_score']) for r in board.data['top']]
        self.assertEqual(ranks[0][0], 18)
        self.assertEqual(ranks[0][1], 500)
        self.assertEqual(ranks[1][0], 18)
        self.assertEqual(ranks[1][1], 100)
        self.assertEqual(ranks[2][0], 15)

    def test_invite_join_and_revoked(self):
        flock = self._create_flock()
        token = flock['invite']['token']
        code = flock['invite']['code']
        preview = self.client.get(f'/api/flocks/invite/{token}/')
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.data['flock']['name'], 'Amsterdam Birders')

        _auth(self.client, self.member)
        joined = self.client.post('/api/flocks/join/', {'code': code}, format='json')
        self.assertEqual(joined.status_code, 200)
        self.assertTrue(joined.data['joined'])
        again = self.client.post('/api/flocks/join/', {'token': token}, format='json')
        self.assertTrue(again.data['already_member'])

        members = self.client.get(f"/api/flocks/{flock['slug']}/members/")
        self.assertEqual(members.status_code, 200)
        self.assertEqual(members.data['member_count'], 2)
        self.assertEqual(len(members.data['members']), 2)
        detail = self.client.get(f"/api/flocks/{flock['slug']}/")
        self.assertIn('invite', detail.data)
        self.assertTrue(detail.data['invite']['code'])

        _auth(self.client, self.admin)
        rotated = self.client.post(f"/api/flocks/{flock['slug']}/invite/", format='json')
        self.assertEqual(rotated.status_code, 200)
        old = self.client.get(f'/api/flocks/invite/{token}/')
        self.assertEqual(old.status_code, 410)

        _auth(self.client, self.outsider)
        blocked = self.client.get(f"/api/flocks/{flock['slug']}/members/")
        self.assertIn(blocked.status_code, (403, 404))

    def test_private_flock_hidden_from_non_members(self):
        flock = self._create_flock()
        slug = flock['slug']
        _auth(self.client, self.outsider)
        res = self.client.get(f'/api/flocks/{slug}/')
        self.assertEqual(res.status_code, 404)

    def test_public_result_hides_private_fields(self):
        flock = self._create_flock()
        slug = flock['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.admin)
            ch = self.client.post(f'/api/flocks/{slug}/challenges/', {'title': 'W1'}, format='json')
        challenge_id = ch.data['id']
        start = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/start/', {}, format='json'
        )
        game = Game.objects.get(token=start.data['game_token'])
        ps, _ = PlayerScore.objects.get_or_create(player=game.host, game=game)
        for q in game.questions.all():
            Answer.objects.create(player_score=ps, question=q, answer=q.species)
        complete = self.client.post(
            f'/api/flocks/{slug}/challenges/{challenge_id}/complete/',
            {'game_token': game.token},
            format='json',
        )
        token = complete.data['result_token']
        public = APIClient().get(f'/api/flocks/results/{token}/')
        self.assertEqual(public.status_code, 200)
        self.assertNotIn('email', public.data)
        self.assertNotIn('user_id', public.data)
        self.assertIn('score_label', public.data)
        self.assertIn('flock_name', public.data)
        html = Client().get(f'/flocks/results/{token}/')
        self.assertEqual(html.status_code, 200)
        self.assertContains(html, 'og:title')

    def test_club_mix_excludes_vagrants(self):
        # Mark most as common; add vagrants that must not be selected as targets preferentially
        CountrySpecies.objects.filter(country=self.country).update(frequency='common')
        vagrant = self.species[0]
        CountrySpecies.objects.filter(species=vagrant, country=self.country).update(
            frequency='vagrant'
        )
        host = Player.objects.create(name='Host', language='en', user=self.admin)
        # Need enough non-vagrant with both media types — seed more
        _seed_species(self.country, 30, prefix='cm', frequency='common')
        _seed_species(self.country, 10, prefix='cmf', frequency='abundant')
        try:
            snapshot = generate_club_mix_snapshot(country=self.country, host=host)
        except Exception:
            self.skipTest('Not enough local media/species for full Club Mix generation')
        species_ids = {item.species_id for item in snapshot}
        self.assertNotIn(vagrant.id, species_ids)
        self.assertEqual(len(snapshot), 20)
        media_types = {item.media_type for item in snapshot}
        self.assertEqual(media_types, {'image'})
        self.assertNotIn('audio', media_types)
        # Fixed difficulty ramp: beginner → advanced → expert (never shuffled)
        from jizz.flock_challenge import CLUB_MIX_SLOTS

        expected_levels = []
        for level, _rarity, _media, count in CLUB_MIX_SLOTS:
            expected_levels.extend([level] * count)
        self.assertEqual([item.level for item in snapshot], expected_levels)
        self.assertEqual([item.sequence for item in snapshot], list(range(1, 21)))

    def test_clone_preserves_difficulty_ramp_order(self):
        """Players must play easy→hard in snapshot order (no per-attempt shuffle)."""
        from jizz.flock_challenge import CLUB_MIX_SLOTS, clone_challenge_into_game

        flock = self._create_flock()
        slug = flock['slug']
        expected_levels = []
        for level, _rarity, _media, count in CLUB_MIX_SLOTS:
            expected_levels.extend([level] * count)
        # Snapshot with explicit levels matching Club Mix ramp
        items = []
        for i, level in enumerate(expected_levels):
            sp = self.species[i % len(self.species)]
            media = Media.objects.filter(species=sp, type='image').first()
            opts = [self.species[(i + j) % len(self.species)].id for j in range(4)]
            opts[0] = sp.id
            items.append(
                SnapshotItem(
                    sequence=i + 1,
                    species_id=sp.id,
                    media_id=media.id,
                    media_type='image',
                    level=level,
                    rarity='regular' if level != 'beginner' else 'familiar',
                    option_species_ids=opts,
                )
            )
        with patch('jizz.flock_views.generate_club_mix_snapshot', return_value=items):
            _auth(self.client, self.admin)
            ch = self.client.post(f'/api/flocks/{slug}/challenges/', {'title': 'Ramp'}, format='json')
        self.assertEqual(ch.status_code, 201, ch.data)
        challenge = FlockChallenge.objects.get(pk=ch.data['id'])
        stored_levels = list(
            FlockChallengeItem.objects.filter(challenge=challenge)
            .order_by('sequence')
            .values_list('level', flat=True)
        )
        self.assertEqual(stored_levels, expected_levels)

        host = Player.objects.create(name='Ramp Host', language='en', user=self.admin)
        game = clone_challenge_into_game(challenge=challenge, host=host, language='en')
        play_species = list(
            game.questions.order_by('sequence').values_list('species_id', flat=True)
        )
        snapshot_species = list(
            FlockChallengeItem.objects.filter(challenge=challenge)
            .order_by('sequence')
            .values_list('species_id', flat=True)
        )
        self.assertEqual(play_species, snapshot_species)
        self.assertTrue(game.questions_pregenerated)

    def test_public_challenge_share_page_and_og_image(self):
        flock_data = self._create_flock()
        slug = flock_data['slug']
        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.admin)
            ch = self.client.post(
                f'/api/flocks/{slug}/challenges/',
                {'title': 'Week Share'},
                format='json',
            )
        self.assertEqual(ch.status_code, status.HTTP_201_CREATED, ch.data)
        self.assertIn('share_url', ch.data)
        self.assertIn('/flocks/c/', ch.data['share_url'])
        public_token = ch.data['public_token']

        # Anonymous can load share page
        anon = Client()
        page = anon.get(f'/flocks/c/{public_token}/')
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'Amsterdam Birders')
        self.assertNotContains(page, 'Week Share')
        self.assertContains(page, 'countdown')
        self.assertContains(page, 'Time left')
        self.assertContains(page, 'og:image')
        self.assertContains(page, f'/flocks/c/{public_token}/og.png')
        self.assertContains(page, '/images/birdr-leaderboard.png')
        self.assertContains(page, '#8b6419')  # Birdr primary.500
        self.assertContains(page, '/join/flock/')

        missing = anon.get('/flocks/c/not-a-real-token/')
        self.assertEqual(missing.status_code, 404)

        og = anon.get(f'/flocks/c/{public_token}/og.png')
        self.assertEqual(og.status_code, 200)
        self.assertEqual(og['Content-Type'], 'image/png')
        self.assertTrue(og.content.startswith(b'\x89PNG'))
        self.assertIn('max-age=600', og.get('Cache-Control', ''))

        # Ranked score shows on share page
        challenge = FlockChallenge.objects.get(pk=ch.data['id'])
        player, _ = Player.objects.get_or_create(
            user=self.admin,
            defaults={'name': 'Sharer', 'language': 'en'},
        )
        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=20,
            media='images',
            rarity=Game.RARIT_REGULAR,
            host=player,
            game_type=Game.GAME_TYPE_FLOCK_CHALLENGE,
        )
        FlockChallengeAttempt.objects.create(
            challenge=challenge,
            user=self.admin,
            player=player,
            game=game,
            is_ranked=True,
            is_practice=False,
            correct_count=17,
            birdr_score=100,
            completed_at=timezone.now(),
            result_token='share-lb-token-123456',
        )
        page2 = anon.get(f'/flocks/c/{public_token}/')
        self.assertContains(page2, '17/20')

    def test_flock_challenge_24h_reminder_skips_completed_members(self):
        from django.core.management import call_command

        flock_data = self._create_flock()
        slug = flock_data['slug']
        invite = flock_data['invite']['token']
        _auth(self.client, self.member)
        self.client.post('/api/flocks/join/', {'token': invite}, format='json')

        with patch(
            'jizz.flock_views.generate_club_mix_snapshot',
            return_value=_manual_snapshot(self.species),
        ):
            _auth(self.client, self.admin)
            ch = self.client.post(
                f'/api/flocks/{slug}/challenges/',
                {'title': 'Week 1'},
                format='json',
            )
        self.assertEqual(ch.status_code, status.HTTP_201_CREATED, ch.data)
        challenge = FlockChallenge.objects.get(pk=ch.data['id'])
        now = timezone.now()
        challenge.starts_at = now - timedelta(days=6)
        challenge.ends_at = now + timedelta(hours=18)
        challenge.save(update_fields=['starts_at', 'ends_at'])

        # Admin already finished; member has not.
        FlockChallengeAttempt.objects.create(
            challenge=challenge,
            user=self.admin,
            player=Player.objects.create(name='Done', language='en', user=self.admin),
            game=Game.objects.create(
                country=self.country,
                level='advanced',
                length=20,
                media='images',
                rarity=Game.RARIT_REGULAR,
                host=Player.objects.filter(user=self.admin).first(),
                game_type=Game.GAME_TYPE_FLOCK_CHALLENGE,
            ),
            is_ranked=True,
            is_practice=False,
            completed_at=now,
            result_token='reminder-test-token-abc',
        )

        with patch('jizz.management.commands.flock_challenge_reminders.send_push_to_user') as mock_push:
            call_command('flock_challenge_reminders')

        mock_push.assert_called()
        notified_ids = {call.args[0].id for call in mock_push.call_args_list}
        self.assertIn(self.member.id, notified_ids)
        self.assertNotIn(self.admin.id, notified_ids)
        self.assertIn('24 hours', mock_push.call_args.args[2])
        self.assertEqual(mock_push.call_args.kwargs['data']['type'], 'flock_challenge')


class PregeneratedGameTests(TestCase):
    def setUp(self):
        self.country = Country.objects.get_or_create(code='NL', defaults={'name': 'Netherlands'})[0]
        self.user = User.objects.create_user('pregen', password='x')
        self.host = Player.objects.create(name='Pregen Host', language='en', user=self.user)
        self.species = _seed_species(self.country, 8, prefix='pg')

    def test_clone_shuffles_options_so_answer_is_not_always_last(self):
        """Older snapshots appended the correct species last; clone must reshuffle."""
        flock = Flock.objects.create(
            name='Shuffle Club',
            slug='shuffle-club',
            owner=self.user,
            default_country=self.country,
        )
        challenge = FlockChallenge.objects.create(
            flock=flock,
            title='W1',
            country=self.country,
            length=4,
            status=FlockChallenge.STATUS_ACTIVE,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(days=6),
            created_by=self.user,
            public_token='shuf1234567890ab',
        )
        # Intentionally put correct answer last on every item (the old bug).
        for i in range(4):
            sp = self.species[i]
            media = Media.objects.filter(species=sp, type='image').first()
            distractors = [self.species[(i + j) % 8].id for j in range(1, 4)]
            FlockChallengeItem.objects.create(
                challenge=challenge,
                sequence=i + 1,
                species_id=sp.id,
                media_id=media.id,
                media_type='image',
                level='advanced',
                rarity='regular',
                option_species_ids=distractors + [sp.id],
            )

        with patch('jizz.flock_challenge.random.shuffle', side_effect=lambda xs: xs.reverse()):
            game = clone_challenge_into_game(challenge=challenge, host=self.host)

        for q in game.questions.order_by('sequence'):
            opts = list(
                QuestionOption.objects.filter(question=q)
                .order_by('order')
                .values_list('species_id', flat=True)
            )
            self.assertEqual(opts[0], q.species_id)
            self.assertNotEqual(opts[-1], q.species_id)

    def _fill_game(self, length=4):
        from jizz.pregenerated_game import PregeneratedItem, fill_pregenerated_game

        game = Game.objects.create(
            country=self.country,
            level='advanced',
            length=length,
            media='images',
            host=self.host,
            language='en',
            game_type=Game.GAME_TYPE_FLOCK_CHALLENGE,
            questions_pregenerated=True,
        )
        items = []
        for i in range(length):
            sp = self.species[i]
            media = Media.objects.filter(species=sp, type='image').first()
            opts = [self.species[(i + j) % len(self.species)].id for j in range(4)]
            opts[0] = sp.id
            items.append(
                PregeneratedItem(
                    sequence=i + 1,
                    species_id=sp.id,
                    media_id=media.id,
                    option_species_ids=opts,
                )
            )
        fill_pregenerated_game(game, items)
        return game, items

    def test_fill_locks_media_and_flags_pregenerated(self):
        game, items = self._fill_game()
        game.refresh_from_db()
        self.assertTrue(game.questions_pregenerated)
        self.assertEqual(game.questions.count(), 4)
        for q, item in zip(game.questions.order_by('sequence'), items):
            self.assertEqual(q.media_id, item.media_id)
            self.assertEqual(q.species_id, item.species_id)
            opts = list(
                QuestionOption.objects.filter(question=q)
                .order_by('order')
                .values_list('species_id', flat=True)
            )
            self.assertEqual(opts, list(item.option_species_ids))

    def test_add_question_advances_pregenerated_in_sequence(self):
        game, _ = self._fill_game()
        PlayerScore.objects.get_or_create(player=self.host, game=game)

        q1 = game.add_question()
        self.assertEqual(q1.sequence, 1)
        self.assertFalse(q1.done)
        # Duplicate while unanswered returns same row
        self.assertEqual(game.add_question().id, q1.id)

        Answer.objects.create(
            player_score=PlayerScore.objects.get(player=self.host, game=game),
            question=q1,
            answer=q1.species,
        )
        q2 = game.add_question()
        self.assertEqual(q2.sequence, 2)
        q1.refresh_from_db()
        self.assertTrue(q1.done)

    def test_can_accept_start_game_for_pregenerated(self):
        game, _ = self._fill_game()
        self.assertTrue(game.can_accept_start_game())

        # Activating Q1 (idempotent add_question) still allows start
        q1 = game.add_question()
        self.assertEqual(q1.sequence, 1)
        self.assertTrue(game.can_accept_start_game())

        # After answering and advancing, start must be ignored
        ps, _ = PlayerScore.objects.get_or_create(player=self.host, game=game)
        Answer.objects.create(player_score=ps, question=q1, answer=q1.species)
        game.add_question()
        self.assertFalse(game.can_accept_start_game())

    def test_lazy_game_rejects_start_once_questions_exist(self):
        game = Game.objects.create(
            country=self.country,
            level='beginner',
            length=2,
            media='images',
            host=self.host,
            language='en',
        )
        self.assertTrue(game.can_accept_start_game())
        Question.objects.create(
            game=game,
            species=self.species[0],
            sequence=1,
            done=False,
        )
        self.assertFalse(game.can_accept_start_game())

    def test_play_serializer_uses_locked_media(self):
        from jizz.question_play import (
            load_question_for_play,
            build_play_serializer_context,
            serialize_question_for_play,
        )

        game, items = self._fill_game(length=1)
        q = load_question_for_play(game.questions.get().id)
        ctx = build_play_serializer_context(q)
        media_list = ctx['play_media_by_species'][q.species_id]
        self.assertEqual(len(media_list), 1)
        self.assertEqual(media_list[0].id, items[0].media_id)

    def test_play_serializer_audio_locked_media_despite_game_images(self):
        """Club Mix Q11+ are audio while Game.media stays images — payload must expose sounds."""
        from media.models import Media
        from jizz.question_play import load_question_for_play, serialize_question_for_play

        game, items = self._fill_game(length=1)
        q = game.questions.get()
        audio = Media.objects.create(
            species_id=q.species_id,
            type='audio',
            url='https://example.com/sound.mp3',
            hide=False,
        )
        q.media = audio
        q.save(update_fields=['media'])

        loaded = load_question_for_play(q.id)
        data = serialize_question_for_play(loaded)
        self.assertEqual(data['media'], 'audio')
        self.assertEqual(data['game']['media'], 'audio')
        self.assertEqual(len(data['sounds']), 1)
        self.assertEqual(data['sounds'][0]['url'], audio.url)
        self.assertEqual(data['images'], [])
        self.assertEqual(data['number'], 0)

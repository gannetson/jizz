"""POST /api/review-media/first-assertion/ and Media effective review helpers."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from jizz.models import Country, CountrySpecies, Player, Species
from media.models import Media, MediaReview


User = get_user_model()


def _player_auth(client, player):
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {player.token}')


class FirstAssertionReviewApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.image = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/a.jpg',
            source='test',
        )
        self.video = Media.objects.create(
            species=self.species,
            type='video',
            url='https://example.com/v.mp4',
            source='test',
        )
        self.player = Player.objects.create(name='P', language='en')
        self.user = User.objects.create_user('reviewer', 'r@example.com', 'secret123')

    def test_first_assertion_approve_creates_review(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/review-media/first-assertion/',
            {
                'player_token': self.player.token,
                'media_id': self.image.id,
                'review_type': 'approved',
                'description': '',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['review_type'], 'approved')
        rev = MediaReview.objects.get(media=self.image, player=self.player)
        self.assertEqual(rev.review_type, MediaReview.APPROVED)

    def test_first_assertion_second_post_updates_review(self):
        _player_auth(self.client, self.player)
        self.client.post(
            '/api/review-media/first-assertion/',
            {
                'player_token': self.player.token,
                'media_id': self.image.id,
                'review_type': 'approved',
                'description': '',
            },
            format='json',
        )
        response = self.client.post(
            '/api/review-media/first-assertion/',
            {
                'player_token': self.player.token,
                'media_id': self.image.id,
                'review_type': 'rejected',
                'description': '',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['review_type'], 'rejected')
        self.assertEqual(MediaReview.objects.filter(media=self.image, player=self.player).count(), 1)
        rev = MediaReview.objects.get(media=self.image, player=self.player)
        self.assertEqual(rev.review_type, MediaReview.REJECTED)

    def test_first_assertion_rejects_non_image_media(self):
        _player_auth(self.client, self.player)
        response = self.client.post(
            '/api/review-media/first-assertion/',
            {
                'player_token': self.player.token,
                'media_id': self.video.id,
                'review_type': 'approved',
                'description': '',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(MediaReview.objects.filter(media=self.video).exists())

    def test_first_assertion_authenticated_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            '/api/review-media/first-assertion/',
            {'media_id': self.image.id, 'review_type': 'approved', 'description': ''},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            MediaReview.objects.filter(media=self.image, user=self.user, review_type='approved').exists()
        )


class MediaEffectiveReviewStatusTestCase(TestCase):
    def setUp(self):
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.player = Player.objects.create(name='P', language='en')
        self.media = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/x.jpg',
            source='test',
        )

    def test_not_sure_review_is_effectively_rejected(self):
        r = MediaReview.objects.create(
            media=self.media,
            player=self.player,
            review_type=MediaReview.NOT_SURE,
            description='',
        )
        self.assertTrue(r.is_effectively_rejected)

    def test_effective_review_status_maps_not_sure_to_rejected(self):
        MediaReview.objects.create(
            media=self.media,
            player=self.player,
            review_type=MediaReview.NOT_SURE,
            description='',
        )
        m = Media.objects.get(pk=self.media.pk)
        self.assertEqual(m.effective_review_status, 'rejected')

    def test_effective_review_status_approved(self):
        MediaReview.objects.create(
            media=self.media,
            player=self.player,
            review_type=MediaReview.APPROVED,
            description='',
        )
        m = Media.objects.get(pk=self.media.pk)
        self.assertEqual(m.effective_review_status, 'approved')

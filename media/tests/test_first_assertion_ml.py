"""Machine first assertion: labels, queryset, MediaPrediction, serializers, API."""

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from jizz.models import Player, Species
from jizz.serializers import MediaForReviewSerializer
from media.first_assertion.labels import binary_training_label, queryset_labeled_image_media
from media.models import Media, MediaPrediction, MediaReview


class LabelMappingTestCase(TestCase):
    def setUp(self):
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.player = Player.objects.create(name='P', language='en')
        self.image = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/a.jpg',
            source='test',
        )

    def test_not_sure_maps_to_negative_training_label(self):
        MediaReview.objects.create(
            media=self.image,
            player=self.player,
            review_type=MediaReview.NOT_SURE,
            description='',
        )
        m = Media.objects.prefetch_related('reviews').get(pk=self.image.pk)
        self.assertEqual(binary_training_label(m), 0)

    def test_approved_maps_to_positive(self):
        MediaReview.objects.create(
            media=self.image,
            player=self.player,
            review_type=MediaReview.APPROVED,
            description='',
        )
        m = Media.objects.prefetch_related('reviews').get(pk=self.image.pk)
        self.assertEqual(binary_training_label(m), 1)


class LabeledImageQuerysetTestCase(TestCase):
    def setUp(self):
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.player = Player.objects.create(name='P', language='en')
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
        MediaReview.objects.create(
            media=self.image,
            player=self.player,
            review_type=MediaReview.APPROVED,
            description='',
        )
        MediaReview.objects.create(
            media=self.video,
            player=self.player,
            review_type=MediaReview.APPROVED,
            description='',
        )

    def test_training_queryset_excludes_video(self):
        ids = set(queryset_labeled_image_media().values_list('id', flat=True))
        self.assertIn(self.image.id, ids)
        self.assertNotIn(self.video.id, ids)


class MediaPredictionUpsertTestCase(TestCase):
    def setUp(self):
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.image = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/a.jpg',
            source='test',
        )

    def test_update_or_create_updates_row(self):
        MediaPrediction.objects.update_or_create(
            media=self.image,
            defaults={
                'predicted_review_type': MediaPrediction.APPROVED,
                'confidence': 0.7,
                'model_version': 'v1',
                'features_version': 'handcrafted_v1',
            },
        )
        MediaPrediction.objects.update_or_create(
            media=self.image,
            defaults={
                'predicted_review_type': MediaPrediction.REJECTED,
                'confidence': 0.9,
                'model_version': 'v1',
                'features_version': 'handcrafted_v1',
            },
        )
        self.assertEqual(MediaPrediction.objects.count(), 1)
        p = MediaPrediction.objects.get(media=self.image)
        self.assertEqual(p.predicted_review_type, MediaPrediction.REJECTED)
        self.assertAlmostEqual(p.confidence, 0.9, places=5)


class MediaForReviewSerializerPredictionTestCase(TestCase):
    def setUp(self):
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.player = Player.objects.create(name='P', language='en')
        self.image = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/a.jpg',
            source='test',
        )

    def test_machine_prediction_null_without_row(self):
        data = MediaForReviewSerializer(self.image).data
        self.assertIsNone(data['machine_prediction'])
        self.assertIsNone(data['machine_human_agreement'])

    def test_machine_prediction_and_agreement(self):
        MediaPrediction.objects.create(
            media=self.image,
            predicted_review_type=MediaPrediction.APPROVED,
            confidence=0.88,
            model_version='first_assertion_v1',
            features_version='handcrafted_v1',
        )
        MediaReview.objects.create(
            media=self.image,
            player=self.player,
            review_type=MediaReview.APPROVED,
            description='',
        )
        m = Media.objects.prefetch_related('reviews').select_related('first_assertion_prediction').get(
            pk=self.image.pk
        )
        data = MediaForReviewSerializer(m).data
        self.assertIsNotNone(data['machine_prediction'])
        self.assertEqual(data['machine_prediction']['predicted_review_type'], 'approved')
        self.assertAlmostEqual(data['machine_prediction']['confidence'], 0.88, places=5)
        self.assertEqual(data['machine_prediction']['model_version'], 'first_assertion_v1')
        # Machine approved vs latest human approved => agree (same effective label)
        self.assertEqual(data['machine_human_agreement'], 'agree')

        # Disagree: human approved, machine rejected (no hide on approved)
        p = m.first_assertion_prediction
        p.predicted_review_type = MediaPrediction.REJECTED
        p.save()
        m2 = Media.objects.prefetch_related('reviews').select_related('first_assertion_prediction').get(
            pk=self.image.pk
        )
        data2 = MediaForReviewSerializer(m2).data
        self.assertEqual(data2['machine_human_agreement'], 'disagree')


class MediaReviewSpeciesApiPredictionTestCase(TestCase):
    """GET /api/media-review-species/ embeds machine_prediction for modal."""

    def setUp(self):
        self.client = APIClient()
        self.species = Species.objects.create(name='S', name_latin='S', code='S01')
        self.player = Player.objects.create(name='P', language='en')
        self.img_reviewed = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/r.jpg',
            source='test',
        )
        self.img_unreviewed = Media.objects.create(
            species=self.species,
            type='image',
            url='https://example.com/u.jpg',
            source='test',
        )
        MediaReview.objects.create(
            media=self.img_reviewed,
            player=self.player,
            review_type=MediaReview.APPROVED,
            description='',
        )
        MediaPrediction.objects.create(
            media=self.img_reviewed,
            predicted_review_type=MediaPrediction.REJECTED,
            confidence=0.5,
            model_version='t',
            features_version='handcrafted_v1',
        )

    def test_api_includes_machine_prediction_on_media(self):
        response = self.client.get('/api/media-review-species/', {'type': 'image', 'level': 'full'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(len(results) >= 1)
        group = next(g for g in results if g['id'] == self.species.id)
        media_by_id = {m['id']: m for m in group['media']}
        self.assertIn('machine_prediction', media_by_id[self.img_reviewed.id])
        self.assertEqual(media_by_id[self.img_reviewed.id]['machine_prediction']['model_version'], 't')
        self.assertIsNone(media_by_id[self.img_unreviewed.id]['machine_prediction'])

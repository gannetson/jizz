"""Training labels from human MediaReview, aligned with Media.effective_review_status."""

from django.db.models import Exists, OuterRef

from media.models import Media, MediaReview


def queryset_labeled_image_media():
    """Image media with at least one review and a fetchable URL."""
    has_review = Exists(MediaReview.objects.filter(media_id=OuterRef('pk')))
    return (
        Media.objects.filter(type='image', hide=False)
        .filter(has_review)
        .exclude(url__isnull=True)
        .exclude(url='')
        .prefetch_related('reviews')
    )


def binary_training_label(media):
    """
    1 = approved, 0 = rejected (includes not_sure), None if no reviews.
    Matches Media.effective_review_status semantics.
    """
    status = media.effective_review_status
    if status is None:
        return None
    if status == MediaReview.APPROVED:
        return 1
    return 0

from django.db import models
from django.core.validators import FileExtensionValidator


# Source choices for media
IMAGE_SOURCES = [
    ('inaturalist', 'iNaturalist'),
    ('wikimedia', 'Wikimedia'),
    ('gbif', 'GBIF'),
    ('flickr', 'Flickr CC'),
    ('observation', 'Observation.org'),
    ('xeno_canto', 'Xeno-Canto'),
]

MEDIA_TYPES = [
    ('image', 'Image'),
    ('video', 'Video'),
    ('audio', 'Audio'),
]


class Media(models.Model):
    """Model for storing image files related to species."""
    species = models.ForeignKey(
        'jizz.Species',
        related_name='images',
        on_delete=models.CASCADE
    )
    source = models.CharField(max_length=200, choices=IMAGE_SOURCES, blank=True, default='')
    contributor = models.CharField(max_length=500, blank=True, default='')
    copyright_text = models.CharField(max_length=500, blank=True, default='', help_text='Copyright text as received from scraper')
    copyright_standardized = models.CharField(max_length=100, blank=True, default='', help_text='Standardized copyright notation (e.g., CC BY, CC BY-NC, etc.)')
    non_commercial_only = models.BooleanField(default=False, help_text='If checked, media is for non-commercial use only. If unchecked, media is free to use with attribution.')
    url = models.URLField(blank=True, null=True, max_length=2000)
    link = models.URLField(blank=True, null=True, max_length=2000)  
    hide = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    type = models.CharField(max_length=200, choices=MEDIA_TYPES, blank=True, default='image')

    class Meta:
        verbose_name = 'Media'
        verbose_name_plural = 'Media'
        ordering = ['-created']

    def __str__(self):
        return f"{self.species.name} - {self.type} ({self.id})"


class MediaReview(models.Model):
    """Model for reviewing media items (positive, negative, or neutral)."""
    APPROVED = 'approved'
    REJECTED = 'rejected'
    NOT_SURE = 'not_sure'
    REVIEW_CHOICES = [
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (NOT_SURE, 'Not Sure'),
    ]
    
    media = models.ForeignKey(
        Media,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    player = models.ForeignKey(
        'jizz.Player',
        on_delete=models.CASCADE,
        related_name='media_reviews'
    )
    review_type = models.CharField(max_length=20, choices=REVIEW_CHOICES)
    description = models.CharField(max_length=500, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Media Review'
        verbose_name_plural = 'Media Reviews'
        ordering = ['-created']
        unique_together = ('media', 'player')  # One review per player per media

    def save(self, *args, **kwargs):
        # Set media to hidden when rejected
        if self.review_type == self.REJECTED:
            self.media.hide = True
        self.media.save()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_review_type_display()} for {self.media} by {self.player}"
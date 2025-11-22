from django.db import models
from django.core.validators import FileExtensionValidator


# Source choices for media
IMAGE_SOURCES = [
    ('inaturalist', 'iNaturalist'),
    ('wikimedia', 'Wikimedia'),
    ('gbif', 'GBIF'),
    ('flickr', 'Flickr CC'),
    ('eol', 'EOL'),
    ('observation', 'Observation.org'),
]

VIDEO_SOURCES = [
    ('wikimedia', 'Wikimedia'),
    ('inaturalist', 'iNaturalist'),
    ('youtube', 'YouTube CC'),
    ('eol', 'EOL'),
]

AUDIO_SOURCES = [
    ('xeno_canto', 'Xeno-Canto'),
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
    copyright = models.CharField(max_length=500, blank=True, default='')
    url = models.URLField(blank=True, null=True, max_length=2000)
    link = models.URLField(blank=True, null=True, max_length=2000)  
    media = models.ImageField(
        upload_to='media/images/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'webp'])]
    )
    hide = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Media'
        verbose_name_plural = 'Media'
        ordering = ['-created']

    def __str__(self):
        return f"{self.species.name} - Media ({self.id})"


class Image(models.Model):
    """Model for storing image files related to species."""
    species = models.ForeignKey(
        'jizz.Species',
        related_name='images',
        on_delete=models.CASCADE
    )
    source = models.CharField(max_length=200, choices=IMAGE_SOURCES, blank=True, default='')
    contributor = models.CharField(max_length=500, blank=True, default='')
    copyright = models.CharField(max_length=500, blank=True, default='')
    url = models.URLField(blank=True, null=True, max_length=2000)
    link = models.URLField(blank=True, null=True, max_length=2000)  
    media = models.ImageField(
        upload_to='media/images/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'webp'])]
    )
    hide = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Image'
        verbose_name_plural = 'Images'
        ordering = ['-created']

    def __str__(self):
        return f"{self.species.name} - Image ({self.id})"


class Video(models.Model):
    """Model for storing video files related to species."""
    species = models.ForeignKey(
        'jizz.Species',
        related_name='media_videos',
        on_delete=models.CASCADE
    )
    source = models.CharField(max_length=50, choices=VIDEO_SOURCES, blank=True, default='')
    contributor = models.CharField(max_length=500, blank=True, default='')
    copyright = models.CharField(max_length=500, blank=True, default='')
    url = models.URLField(blank=True, null=True, max_length=2000)
    link = models.URLField(blank=True, null=True, max_length=2000)
    media = models.FileField(
        upload_to='media/videos/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi', 'webm', 'mkv'])]
    )
    hide = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Video'
        verbose_name_plural = 'Videos'
        ordering = ['-created']

    def __str__(self):
        return f"{self.species.name} - Video ({self.id})"


class Audio(models.Model):
    """Model for storing audio files related to species."""
    species = models.ForeignKey(
        'jizz.Species',
        related_name='media_audio',
        on_delete=models.CASCADE
    )
    source = models.CharField(max_length=50, choices=AUDIO_SOURCES, blank=True, default='')
    contributor = models.CharField(max_length=500, blank=True, default='')
    copyright = models.CharField(max_length=500, blank=True, default='')
    url = models.URLField(blank=True, null=True, max_length=2000)
    link = models.URLField(blank=True, null=True, max_length=2000)
    media = models.FileField(
        upload_to='media/audio/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'ogg', 'm4a', 'flac'])]
    )
    hide = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Audio'
        verbose_name_plural = 'Audio'
        ordering = ['-created']

    def __str__(self):
        return f"{self.species.name} - Audio ({self.id})"


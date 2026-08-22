# Signal handlers for jizz models.

from django.db.models.signals import pre_save
from django.dispatch import receiver

from jizz.marketing.slugs import unique_species_slug
from jizz.models import Species


@receiver(pre_save, sender=Species)
def assign_species_slug(sender, instance, **kwargs):
    if not instance.slug:
        instance.slug = unique_species_slug(instance, model=sender)

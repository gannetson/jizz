from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CountryChallenge, Game, CountryGame, ChallengeLevel


@receiver(post_save, sender=CountryChallenge)
def create_initial_country_game(sender, instance, created, **kwargs):
    if created:
        # Get the first challenge level (sequence 0)
        initial_level = ChallengeLevel.objects.get(sequence=0)
        
        # Create a new game with settings from challenge level
        game = Game.objects.create(
            country=instance.country,
            level=initial_level.level,  # use the level from ChallengeLevel
            length=initial_level.length,
            media=initial_level.media,
            include_rare=initial_level.include_rare,
            include_escapes=initial_level.include_escapes,
            tax_order=initial_level.tax_order,
            host=instance.player
        )
        
        # Create the country game linking everything together
        CountryGame.objects.create(
            country_challenge=instance,
            game=game,
            challenge_level=initial_level,
        )

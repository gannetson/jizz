from urllib.parse import urlparse

from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from jizz.models import Country, CountrySpecies, Species, Game, Question, Answer, Player, QuestionOption, PlayerScore, QuestionMediaReady, FlagQuestion, \
    Feedback, Update, Reaction, Language, Page, SpeciesName, UserProfile, BirdrJourney, BirdrJourneyGame, \
    JourneyLevel, JourneyStep, \
    Friendship, DailyChallenge, DailyChallengeParticipant, DailyChallengeInvite, DailyChallengeRound, DeviceToken
from media.models import Media, MediaReview, FlagMedia


class CountrySerializer(serializers.ModelSerializer):

    def to_internal_value(self, data):
        return Country.objects.get(code=data)

    class Meta:
        model = Country
        fields = ('code', 'name', 'count')



class QuestionMediaSerializer(serializers.ModelSerializer):
    link = serializers.SerializerMethodField()

    def get_link(self, obj):
        if not obj.link:
            return None
        try:
            parsed = urlparse(obj.link)
            return f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else obj.link
        except Exception:
            return obj.link

    class Meta:
        model = Media
        fields = ('id', 'url', 'link', 'contributor', 'source')


class MediaSerializer(serializers.ModelSerializer):
    """Serializer for Media model (images, videos, audio). Optional review_status when level=thorough."""
    species_name = serializers.SerializerMethodField()
    species_code = serializers.CharField(source='species.code', read_only=True)
    species_id = serializers.IntegerField(source='species.id', read_only=True)
    review_status = serializers.SerializerMethodField()

    def get_species_name(self, obj):
        """Return species name in the requested language if available."""
        language = None
        request = self.context.get('request')
        if request:
            language = request.query_params.get('language')
        if language:
            try:
                species_name = SpeciesName.objects.get(
                    species=obj.species,
                    language_id=language
                )
                return species_name.name
            except SpeciesName.DoesNotExist:
                pass
        return obj.species.name

    def get_review_status(self, obj):
        """When level=thorough, return { approved, rejected, dont_know } counts for this media."""
        if self.context.get('level') != 'thorough':
            return None
        return {
            'approved': getattr(obj, '_approved_count', 0),
            'rejected': getattr(obj, '_rejected_count', 0),
            'dont_know': getattr(obj, '_not_sure_count', 0),
        }

    class Meta:
        model = Media
        fields = (
            'id', 'type', 'source', 'url', 'link', 'contributor', 'copyright_text',
            'copyright_standardized', 'non_commercial_only',
            'species_name', 'species_code', 'species_id', 'hide', 'created',
            'review_status',
        )


class SpeciesListSerializer(serializers.ModelSerializer):

    name_translated = serializers.SerializerMethodField()

    def get_name_translated(self, obj):
        try:
            species_name = SpeciesName.objects.get(
                species=obj,
                language=self.context['request'].query_params.get('language')
            )
            return species_name.name
        except SpeciesName.DoesNotExist:
            return obj.name

    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'name_nl', 'name_translated', 'id', 'tax_family', 'tax_family_en', 'tax_order')


class SpeciesReviewStatsSerializer(serializers.Serializer):
    """Serializer for species with media review stats (annotated queryset)."""
    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    total_media = serializers.IntegerField()
    unreviewed = serializers.SerializerMethodField()
    approved = serializers.IntegerField(source='approved_media')
    rejected = serializers.IntegerField(source='rejected_media')
    not_sure = serializers.IntegerField(source='not_sure_media')

    def get_name(self, obj):
        request = self.context.get('request')
        language = request and request.query_params.get('language')
        if language:
            try:
                sn = SpeciesName.objects.get(species=obj, language_id=language)
                return sn.name
            except SpeciesName.DoesNotExist:
                pass
        return obj.name

    def get_unreviewed(self, obj):
        return obj.total_media - obj.media_with_review


class MediaForReviewSerializer(MediaSerializer):
    """Media serializer with review_type for embedding in species (approved/rejected/not_sure or null)."""
    review_type = serializers.SerializerMethodField()
    machine_prediction = serializers.SerializerMethodField()
    machine_human_agreement = serializers.SerializerMethodField()

    def get_review_type(self, obj):
        reviews = list(obj.reviews.all())
        review = max(reviews, key=lambda r: r.id) if reviews else None
        return review.review_type if review else None

    def get_machine_prediction(self, obj):
        try:
            p = obj.first_assertion_prediction
        except ObjectDoesNotExist:
            return None
        return {
            'predicted_review_type': p.predicted_review_type,
            'confidence': p.confidence,
            'model_version': p.model_version,
            'features_version': p.features_version or None,
        }

    def get_machine_human_agreement(self, obj):
        eff = obj.effective_review_status
        try:
            p = obj.first_assertion_prediction
        except ObjectDoesNotExist:
            return None
        if eff is None:
            return None
        if p.predicted_review_type == eff:
            return 'agree'
        return 'disagree'

    class Meta(MediaSerializer.Meta):
        fields = MediaSerializer.Meta.fields + (
            'review_type',
            'machine_prediction',
            'machine_human_agreement',
        )


class SpeciesWithMediaReviewSerializer(serializers.Serializer):
    """Species with review stats and all media embedded for media-review page."""
    id = serializers.IntegerField(source='species.id')
    name = serializers.SerializerMethodField()
    total_media = serializers.IntegerField()
    unreviewed = serializers.IntegerField()
    approved = serializers.IntegerField()
    rejected = serializers.IntegerField()
    not_sure = serializers.IntegerField()
    media = serializers.SerializerMethodField()

    def get_name(self, obj):
        request = self.context.get('request')
        language = request and request.query_params.get('language')
        species = obj['species']
        if language:
            try:
                sn = SpeciesName.objects.get(species=species, language_id=language)
                return sn.name
            except SpeciesName.DoesNotExist:
                pass
        return species.name

    def get_media(self, obj):
        return MediaForReviewSerializer(
            obj['media'], many=True, context=self.context
        ).data


class FamilyListSerializer(serializers.ModelSerializer):
    count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Species
        fields = ('tax_family', 'tax_family_en', 'count')


class OrderListSerializer(serializers.ModelSerializer):
    count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Species
        fields = ('tax_order', 'count')


class SpeciesCoverSerializer(serializers.ModelSerializer):
    """Cover image for species UI (may trigger illustration generation)."""

    illustration_url = serializers.SerializerMethodField()
    illustration_status = serializers.SerializerMethodField()

    def get_illustration_url(self, obj):
        from jizz.services.species_cover import species_cover_url

        request = self.context.get('request')
        return species_cover_url(obj, request)

    def get_illustration_status(self, obj):
        from jizz.services.species_illustration import get_illustration_status

        return get_illustration_status(obj)

    class Meta:
        model = Species
        fields = ('id', 'illustration_url', 'illustration_status')


class SpeciesDetailSerializer(serializers.ModelSerializer):
    images = QuestionMediaSerializer(many=True)
    videos = QuestionMediaSerializer(many=True)
    sounds = QuestionMediaSerializer(many=True)
    name_translated = serializers.SerializerMethodField()

    def get_name_translated(self, obj):
        """Get translated name based on game language or request language"""
        # Try to get language from game context first
        game = self.context.get('game') if isinstance(self.context, dict) else None
        language = None
        
        if game:
            language = game.language
        elif isinstance(self.context, dict) and 'request' in self.context:
            language = self.context['request'].query_params.get('language')
        
        if language:
            try:
                species_name = SpeciesName.objects.get(
                    species=obj,
                    language=language
                )
                return species_name.name
            except SpeciesName.DoesNotExist:
                pass

        return obj.name

    class Meta:
        model = Species
        fields = (
            'name', 'code', 'name_latin', 'name_nl', 'name_translated', 'id',
            'images', 'videos', 'sounds',
        )

class QuestionOptionPlaySerializer(serializers.ModelSerializer):
    """Multiple-choice option without loading all species media."""

    name_translated = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    sounds = serializers.SerializerMethodField()

    def get_images(self, obj):
        return []

    def get_videos(self, obj):
        return []

    def get_sounds(self, obj):
        return []

    def get_name_translated(self, obj):
        names = self.context.get('play_species_names') or {}
        lang = self.context.get('play_language')
        if lang and (obj.id, lang) in names:
            return names[(obj.id, lang)]
        return obj.name

    class Meta:
        model = Species
        fields = (
            'id', 'code', 'name', 'name_latin', 'name_nl', 'name_translated',
            'images', 'videos', 'sounds',
        )


class QuestionPlaySerializer(serializers.ModelSerializer):
    """
    Live play payload: all eligible media for the active type, rotated so index 0 is
    the current item (``question.number`` in DB). Serialized ``number`` is always 0.
    Option species omit embedded media lists.
    """

    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    sounds = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    game = serializers.SerializerMethodField()
    number = serializers.SerializerMethodField()

    def _media_list_for_play(self, obj):
        from jizz.question_play import rotate_media_list_for_play

        by_species = self.context.get('play_media_by_species') or {}
        items = by_species.get(obj.species_id, [])
        if not items:
            return []
        rotated = rotate_media_list_for_play(items, obj.number or 0)
        return QuestionMediaSerializer(rotated, many=True).data

    def get_number(self, obj):
        # Active media is always at array index 0 after rotation.
        return 0

    def get_images(self, obj):
        if self.context.get('play_media_type') != 'image':
            return []
        return self._media_list_for_play(obj)

    def get_videos(self, obj):
        if self.context.get('play_media_type') != 'video':
            return []
        return self._media_list_for_play(obj)

    def get_sounds(self, obj):
        if self.context.get('play_media_type') != 'audio':
            return []
        return self._media_list_for_play(obj)

    def get_options(self, obj):
        opts = list(obj.options.all())
        return QuestionOptionPlaySerializer(
            [op.species for op in opts],
            many=True,
            context=self.context,
        ).data

    def get_game(self, obj):
        return {'token': obj.game.token}

    class Meta:
        model = Question
        fields = ('id', 'done', 'options', 'images', 'videos', 'sounds', 'number', 'sequence', 'game')


class QuestionSerializer(serializers.ModelSerializer):
    images = QuestionMediaSerializer(source='species.images', many=True)
    videos = QuestionMediaSerializer(source='species.videos', many=True)
    sounds = QuestionMediaSerializer(source='species.sounds', many=True)
    options = serializers.SerializerMethodField()
    game = serializers.SerializerMethodField()

    def get_options(self, obj):
        option_orders = QuestionOption.objects.filter(question=obj).order_by('order')
        return SpeciesDetailSerializer(
            [op.species for op in option_orders],
            many=True,
            context={'game': obj.game, **self.context},
        ).data

    def get_game(self, obj):
        # Include game token so frontend can verify question belongs to current game
        return {'token': obj.game.token}

    class Meta:
        model = Question
        fields = ('id', 'done', 'options', 'images', 'videos', 'sounds', 'number', 'sequence', 'game')


class AnswerSerializer(serializers.ModelSerializer):
    player_token = serializers.CharField(write_only=True)
    correct = serializers.BooleanField(read_only=True)
    species = SpeciesDetailSerializer(source='question.species', read_only=True)
    species_frequency = serializers.SerializerMethodField()
    checklist_added = serializers.SerializerMethodField()
    checklist_missed = serializers.SerializerMethodField()
    answer = SpeciesDetailSerializer(read_only=True)
    answer_id = serializers.IntegerField(write_only=True)
    question_id = serializers.IntegerField(write_only=True)
    number = serializers.IntegerField(read_only=True, source='question.number')
    sequence = serializers.IntegerField(source='question.sequence', read_only=True)

    def get_species_frequency(self, obj):
        if not hasattr(obj, 'question'):
            return None
        game = self.context.get('game') or obj.question.game
        if not game or not game.country_id:
            return None
        from jizz.species_frequency import species_frequency_for_game

        return species_frequency_for_game(game, obj.question.species_id)

    def get_checklist_added(self, obj):
        return bool(getattr(obj, 'checklist_added', False))

    def get_checklist_missed(self, obj):
        return bool(getattr(obj, 'checklist_missed', False))

    def create(self, validated_data):
        player = Player.objects.select_related('user').get(
            token=validated_data.pop('player_token')
        )
        question = Question.objects.select_related('game__country').get(
            id=validated_data.pop('question_id')
        )
        answer = Species.objects.get(id=validated_data.pop('answer_id'))
        correct = answer == question.species
        player_score, _created = PlayerScore.objects.get_or_create(player=player, game=question.game)
        if Answer.objects.filter(player_score=player_score, question=question).exists():
            existing = Answer.objects.filter(player_score=player_score, question=question).first()
            existing.checklist_added = False
            existing.checklist_missed = False
            return existing
        from jizz.services.checklist import compute_checklist_added, compute_checklist_missed

        request = self.context.get('request')
        checklist_added = compute_checklist_added(
            player, question, correct, request=request
        )
        checklist_missed = compute_checklist_missed(
            player, question, correct, request=request
        )
        row = Answer.objects.create(
            player_score=player_score, question=question, answer=answer, correct=correct
        )
        row.checklist_added = checklist_added
        row.checklist_missed = checklist_missed
        return row

    class Meta:
        model = Answer
        fields = (
            'id', 'question_id', 'player_token',
            'answer', 'correct', 'species', 'species_frequency', 'checklist_added', 'checklist_missed',
            'answer_id', 'number', 'score',
            'sequence',
        )
        unique_together = ('question', 'player')


class FlagQuestionSerializer(serializers.ModelSerializer):

    player_token = serializers.CharField(write_only=True)
    question_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    media_url = serializers.URLField(write_only=True, required=False, allow_null=True)
    media_type = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = FlagQuestion
        fields = ('player_token', 'description', 'question_id', 'media_url', 'media_type')

    def create(self, validated_data):
        player = Player.objects.get(token=validated_data.pop('player_token'))
        question_id = validated_data.pop('question_id', None)
        media_url = validated_data.pop('media_url', None)
        description = validated_data.pop('description', '')
        media_type = validated_data.pop('media_type', None)
        
        # If question_id is provided, use it; otherwise create with null question
        if question_id:
            question = Question.objects.get(id=question_id)
            return FlagQuestion.objects.create(
                description=description, 
                player=player, 
                question=question,
                media_url=media_url
            )
        else:
            # For media-only flags, create with null question
            if not media_url:
                raise serializers.ValidationError("Either question_id or media_url must be provided")
            return FlagQuestion.objects.create(
                description=description,
                player=player,
                question=None,
                media_url=media_url
            )


def upsert_media_review(media, review_type, description, user, player):
    """Create or update the single MediaReview for this media and reviewer (exactly one of user or player)."""
    if player:
        review, created = MediaReview.objects.get_or_create(
            media=media,
            player=player,
            defaults={'review_type': review_type, 'description': description},
        )
    else:
        review, created = MediaReview.objects.get_or_create(
            media=media,
            user=user,
            defaults={'review_type': review_type, 'description': description},
        )
    if not created:
        review.review_type = review_type
        review.description = description
        review.save()
    return review


def _validate_reviewer_player_token(data, request):
    if request and request.user and request.user.is_authenticated:
        if data.get('player_token'):
            raise serializers.ValidationError(
                {'player_token': 'Do not send player_token when authenticated as a user.'}
            )
        return
    if not data.get('player_token'):
        raise serializers.ValidationError(
            {'player_token': 'Either authenticate as a user or provide player_token.'}
        )


class ReviewMediaSerializer(serializers.ModelSerializer):
    """Serializer for reviewing media items (positive or negative). Accepts player_token or uses request.user if authenticated."""
    player_token = serializers.CharField(write_only=True, required=False)
    media_id = serializers.IntegerField(write_only=True)
    review_type = serializers.ChoiceField(choices=MediaReview.REVIEW_CHOICES, write_only=True)

    class Meta:
        model = MediaReview
        fields = ('player_token', 'description', 'media_id', 'review_type')

    def validate(self, data):
        request = self.context.get('request')
        _validate_reviewer_player_token(data, request)
        return data

    def create(self, validated_data):
        media = Media.objects.get(id=validated_data.pop('media_id'))
        review_type = validated_data.pop('review_type')
        description = validated_data.pop('description', '')
        request = self.context.get('request')
        player = None
        user = None

        if request and request.user and request.user.is_authenticated:
            user = request.user
        else:
            player = Player.objects.get(token=validated_data.pop('player_token'))

        return upsert_media_review(media, review_type, description, user, player)


FIRST_ASSERTION_REVIEW_CHOICES = (
    (MediaReview.APPROVED, 'Approved'),
    (MediaReview.REJECTED, 'Rejected'),
)


class FirstAssertionReviewSerializer(serializers.Serializer):
    """Image-only first assertion: approved or rejected only (no not_sure)."""
    player_token = serializers.CharField(required=False, allow_blank=True)
    media_id = serializers.IntegerField()
    review_type = serializers.ChoiceField(choices=FIRST_ASSERTION_REVIEW_CHOICES)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        request = self.context.get('request')
        _validate_reviewer_player_token(data, request)
        return data

    def validate_media_id(self, value):
        try:
            media = Media.objects.get(pk=value)
        except Media.DoesNotExist as exc:
            raise serializers.ValidationError('Invalid media id.') from exc
        if media.type != 'image':
            raise serializers.ValidationError(
                'First assertion reviews are only allowed for image media.'
            )
        return value

    def create(self, validated_data):
        media = Media.objects.get(pk=validated_data.pop('media_id'))
        review_type = validated_data.pop('review_type')
        description = validated_data.pop('description', '') or ''
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data.pop('player_token', None)
            user = request.user
            player = None
        else:
            player = Player.objects.get(token=validated_data.pop('player_token'))
            user = None
        return upsert_media_review(media, review_type, description, user, player)


class MediaReviewBriefSerializer(serializers.ModelSerializer):
    """201 response body for review create endpoints."""

    class Meta:
        model = MediaReview
        fields = ('id', 'review_type', 'description', 'created', 'media')
        read_only_fields = fields


class FlagMediaSerializer(serializers.ModelSerializer):
    """Serializer for flagging media items."""
    player_token = serializers.CharField(write_only=True)
    media_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = FlagMedia
        fields = ('player_token', 'description', 'media_id')

    def create(self, validated_data):
        player = Player.objects.get(token=validated_data.pop('player_token'))
        media = Media.objects.get(id=validated_data.pop('media_id'))
        description = validated_data.pop('description', '')
        # Use get_or_create to handle unique_together constraint
        flag, created = FlagMedia.objects.get_or_create(
            media=media,
            player=player,
            defaults={'description': description}
        )
        if not created:
            # Update existing flag
            flag.description = description
            flag.save()
        return flag


class ReactionSerializer(serializers.ModelSerializer):

    player_token = serializers.CharField(write_only=True)
    update_id = serializers.IntegerField(write_only=True)
    name = serializers.CharField(read_only=True)

    class Meta:
        model = Reaction
        fields = ('player_token', 'message', 'update_id', 'created', 'name')

    def create(self, validated_data):
        player = Player.objects.get(token=validated_data.pop('player_token'))
        update = Update.objects.get(id=validated_data.pop('update_id'))
        message = validated_data.pop('message')
        return Reaction.objects.create(message=message, player=player, update=update)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email')


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_staff = serializers.BooleanField(source='user.is_staff', read_only=True)
    is_superuser = serializers.BooleanField(source='user.is_superuser', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    country_code = serializers.CharField(source='country.code', read_only=True, allow_null=True)
    country_name = serializers.CharField(source='country.name', read_only=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ('username', 'email', 'first_name', 'last_name', 'avatar', 'avatar_url', 'receive_updates', 'language', 'timezone', 'country_code', 'country_name', 'is_staff', 'is_superuser')
        read_only_fields = ('avatar_url', 'country_code', 'country_name', 'is_staff', 'is_superuser')

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.avatar.url)
                # In production (behind proxy), ensure HTTPS so avatars load over HTTPS
                from django.conf import settings
                if not getattr(settings, 'DEBUG', True) and url.startswith('http://'):
                    url = 'https://' + url[7:]
                return url
            return obj.avatar.url
        return None

    def update(self, instance, validated_data):
        # Update avatar if provided
        if 'avatar' in validated_data:
            instance.avatar = validated_data['avatar']
        instance.save()
        return instance


class UserProfileUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, max_length=150, allow_blank=False)
    first_name = serializers.CharField(required=False, max_length=150, allow_blank=True)
    last_name = serializers.CharField(required=False, max_length=150, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    receive_updates = serializers.BooleanField(required=False)
    language = serializers.CharField(required=False, max_length=10, allow_blank=True)
    timezone = serializers.CharField(required=False, max_length=63, allow_blank=True)
    country_code = serializers.CharField(required=False, max_length=10, allow_blank=True, allow_null=True)

    def validate_username(self, value):
        if value:
            user = self.context['request'].user
            if User.objects.filter(username=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_country_code(self, value):
        if value:
            try:
                Country.objects.get(code=value)
            except Country.DoesNotExist:
                raise serializers.ValidationError("Invalid country code.")
        return value

    def update(self, instance, validated_data):
        # Update username if provided
        if 'username' in validated_data and validated_data['username']:
            instance.user.username = validated_data['username']
        
        # Update first_name if provided
        if 'first_name' in validated_data:
            instance.user.first_name = validated_data['first_name']
        
        # Update last_name if provided
        if 'last_name' in validated_data:
            instance.user.last_name = validated_data['last_name']
        
        # Save user if any user fields were updated
        if 'username' in validated_data or 'first_name' in validated_data or 'last_name' in validated_data:
            instance.user.save()
        
        # Update avatar if provided
        if 'avatar' in validated_data:
            if validated_data['avatar'] is None:
                # Remove avatar
                if instance.avatar:
                    instance.avatar.delete()
                instance.avatar = None
            else:
                # Update avatar
                if instance.avatar:
                    instance.avatar.delete()
                instance.avatar = validated_data['avatar']
        
        # Update receive_updates if provided
        if 'receive_updates' in validated_data:
            instance.receive_updates = validated_data['receive_updates']
        
        # Update language if provided
        if 'language' in validated_data:
            instance.language = validated_data['language']
        
        # Update timezone if provided
        if 'timezone' in validated_data:
            instance.timezone = (validated_data['timezone'] or 'Europe/Amsterdam').strip() or 'Europe/Amsterdam'
        
        # Update country if provided
        if 'country_code' in validated_data:
            country_code = validated_data['country_code']
            if country_code:
                try:
                    instance.country = Country.objects.get(code=country_code)
                except Country.DoesNotExist:
                    pass
            else:
                instance.country = None
        
        instance.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class UpdateSerializer(serializers.ModelSerializer):

    reactions = ReactionSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Update
        fields = ('id', 'created', 'user', 'title', 'message', 'reactions', 'user')


class PlayerSerializer(serializers.ModelSerializer):
    last_answer = AnswerSerializer(read_only=True)

    class Meta:
        model = Player
        fields = ('id', 'name', 'token', 'language', 'score', 'last_answer')


class MultiPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ('id', 'name', 'language', 'score')


class PlayerScoreSerializer(serializers.ModelSerializer):
    last_answer = AnswerSerializer(read_only=True)
    name = serializers.CharField(source='player.name')
    language = serializers.CharField(source='player.language')
    media = serializers.CharField(source='game.media')
    level = serializers.CharField(source='game.level')
    length = serializers.CharField(source='game.length')
    country = CountrySerializer(source='game.country')
    created = serializers.DateTimeField(source='game.created')
    ranking = serializers.IntegerField(read_only=True)
    answers = AnswerSerializer(read_only=True, many=True)
    is_host = serializers.SerializerMethodField()

    def get_is_host(self, obj):
        """Check if this player is the host of the game"""
        return obj.game.host_id == obj.player_id

    def get_last_answer(self, obj):
        answer = obj.last_answer
        if answer is None:
            return None
        return AnswerSerializer(answer, context={'game': obj.game, **self.context}).data

    class Meta:
        model = PlayerScore
        fields = (
            'id', 'name', 'status', 'language', 'created',
            'score', 'last_answer', 'answers',
            'media', 'level', 'length',
            'country', 'ranking', 'is_host'
        )


class PlayerScoreListSerializer(serializers.ModelSerializer):
    """Minimal serializer for hiscores list: player name, country code, media, length, score (+ ranking, level for table)."""
    name = serializers.CharField(source='player.name', read_only=True)
    country = serializers.SerializerMethodField()
    media = serializers.CharField(source='game.media', read_only=True)
    level = serializers.CharField(source='game.level', read_only=True)
    length = serializers.IntegerField(source='game.length', read_only=True)
    rarity = serializers.CharField(source='game.rarity', read_only=True)
    ranking = serializers.IntegerField(source='score_rank', read_only=True)

    def get_country(self, obj):
        if obj.game and obj.game.country_id:
            return {'code': obj.game.country.code, 'name': obj.game.country.name}
        return {'code': '', 'name': ''}

    class Meta:
        model = PlayerScore
        fields = ('id', 'name', 'country', 'media', 'level', 'length', 'rarity', 'score', 'ranking')


class GameSerializer(serializers.ModelSerializer):
    country = serializers.CharField(write_only=True, required=False)
    country_data = CountrySerializer(source='country', read_only=True)
    host = MultiPlayerSerializer(read_only=True)
    current_highscore = PlayerScoreSerializer(read_only=True)
    scores = PlayerScoreSerializer(
        many=True, 
        read_only=True
    )

    def to_internal_value(self, data):
        if isinstance(data, dict) and 'rarity' not in data and 'include_rare' in data:
            data = data.copy()
            from jizz.models import Game
            data['rarity'] = (
                Game.RARIT_REGULAR if data.get('include_rare') else Game.RARIT_FAMILIAR
            )
        return super().to_internal_value(data)

    def create(self, validated_data):
        # Handle country field - convert code to Country object
        country_code = validated_data.pop('country', None)
        if country_code:
            validated_data['country'] = Country.objects.get(code=country_code)
        return super().create(validated_data)
    
    def to_representation(self, instance):
        # Use country_data for read operations
        representation = super().to_representation(instance)
        if 'country_data' in representation:
            representation['country'] = representation.pop('country_data')
        return representation

    class Meta:
        model = Game
        fields = (
            'token', 'country', 'country_data', 'level', 'language',
            'created', 'multiplayer',
            'length', 'progress',
            'media', 'repeat',
            'host', 'ended',
            'current_highscore',
            'tax_order',
            'tax_family',
            'rarity',
            'include_escapes',
            'scores'
        )


class UserGameSerializer(serializers.ModelSerializer):
    """Serializer for games in user's games list, includes user's score and correct count"""
    country = CountrySerializer()
    user_score = serializers.SerializerMethodField()
    correct_count = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    
    def get_user_score(self, obj):
        """Get the user's total score for this game"""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0
        
        user_players = Player.objects.filter(user=request.user)
        player_score = PlayerScore.objects.filter(
            player__in=user_players,
            game=obj
        ).first()
        
        if player_score:
            return player_score.score
        return 0
    
    def get_correct_count(self, obj):
        """Get the number of correct answers for this user"""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0
        
        user_players = Player.objects.filter(user=request.user)
        user_player_scores = PlayerScore.objects.filter(player__in=user_players, game=obj)
        
        # Count correct answers for this user's player scores in this game
        correct_count = Answer.objects.filter(
            player_score__in=user_player_scores,
            correct=True
        ).count()
        
        return correct_count
    
    def get_total_questions(self, obj):
        """Get the total number of questions in this game"""
        return obj.questions.count()
    
    class Meta:
        model = Game
        fields = (
            'token', 'country', 'level', 'language',
            'created', 'multiplayer',
            'length', 'progress',
            'media', 'repeat',
            'host', 'ended',
            'tax_order',
            'tax_family',
            'rarity',
            'include_escapes',
            'user_score',
            'correct_count',
            'total_questions'
        )


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Serializer for question with user's answer, timing, and score"""
    species = serializers.SerializerMethodField()
    user_answer = serializers.SerializerMethodField()
    time_taken_seconds = serializers.SerializerMethodField()
    points = serializers.SerializerMethodField()
    correct = serializers.SerializerMethodField()
    media_item = serializers.SerializerMethodField()
    
    def get_species(self, obj):
        """Get species with game language context"""
        serializer = SpeciesDetailSerializer(
            obj.species,
            context={'game': obj.game, **self.context}
        )
        return serializer.data
    
    def _get_user_answer_obj(self, obj):
        """Helper method to get the user's answer object (uses prefetched data)"""
        detail_player = self.context.get('detail_player')
        if detail_player is not None:
            if hasattr(obj, 'answers'):
                for answer in obj.answers.all():
                    if (
                        answer.player_score
                        and answer.player_score.player_id == detail_player.id
                    ):
                        return answer
            return (
                Answer.objects.filter(
                    player_score__player=detail_player,
                    player_score__game=obj.game,
                    question=obj,
                )
                .select_related('answer')
                .first()
            )

        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None

        # Try to use prefetched answers first
        if hasattr(obj, 'answers'):
            # Answers are prefetched, find the one for this user
            for answer in obj.answers.all():
                if answer.player_score and answer.player_score.player.user == request.user:
                    return answer

        # Fallback: query if not prefetched
        game = obj.game
        user_players = Player.objects.filter(user=request.user)
        player_score = PlayerScore.objects.filter(
            player__in=user_players,
            game=game
        ).first()

        if not player_score:
            return None

        # Get the answer for this question
        answer = Answer.objects.filter(
            player_score=player_score,
            question=obj
        ).select_related('answer').first()

        return answer
    
    def get_user_answer(self, obj):
        """Get the user's answer for this question"""
        answer = self._get_user_answer_obj(obj)
        
        if answer:
            # Return full species data including images, videos, sounds, and code
            species = answer.answer
            return {
                'id': species.id,
                'name': species.name,
                'name_latin': species.name_latin,
                'name_nl': species.name_nl if hasattr(species, 'name_nl') else '',
                'code': species.code,
                'images': QuestionMediaSerializer(species.images.all(), many=True).data,
                'videos': QuestionMediaSerializer(species.videos.all(), many=True).data,
                'sounds': QuestionMediaSerializer(species.sounds.all(), many=True).data,
            }
        return None
    
    def get_time_taken_seconds(self, obj):
        """Seconds from question (or media-ready) to submit — same basis as score calculation."""
        answer = self._get_user_answer_obj(obj)

        if answer:
            start = obj.created
            player_id = answer.player_score.player_id
            ready = None
            for mr in obj.media_ready.all():
                if mr.player_id == player_id:
                    ready = mr
                    break
            if ready is None:
                ready = QuestionMediaReady.objects.filter(
                    question=obj,
                    player_id=player_id,
                ).first()
            if ready and ready.ready_at:
                start = max(start, ready.ready_at)
            time_taken = (answer.created - start).total_seconds()
            return round(max(0.0, time_taken), 2)
        return None
    
    def get_points(self, obj):
        """Get points earned for this question"""
        answer = self._get_user_answer_obj(obj)
        
        if answer:
            return answer.score
        return None
    
    def get_correct(self, obj):
        """Check if the answer was correct"""
        answer = self._get_user_answer_obj(obj)
        
        if answer:
            return answer.correct
        return None
    
    def get_media_item(self, obj):
        """Get the specific media item (image, video, or sound) that was used for this question"""
        game = obj.game
        media_type = game.media
        media_index = obj.number
        
        if media_type == 'images':
            images = obj.species.images.all()
            if media_index < images.count():
                image = images[media_index]
                return {
                    'type': 'image',
                    'url': image.url,
                    'link': image.link,
                    'contributor': image.contributor,
                }
        elif media_type == 'video':
            videos = obj.species.videos.all()
            if media_index < videos.count():
                video = videos[media_index]
                return {
                    'type': 'video',
                    'url': video.url,
                    'link': video.link,
                    'contributor': video.contributor,
                }
        elif media_type == 'audio':
            sounds = obj.species.sounds.all()
            if media_index < sounds.count():
                sound = sounds[media_index]
                return {
                    'type': 'audio',
                    'url': sound.url,
                    'link': sound.link,
                    'contributor': sound.contributor,
                }
        
        return None
    
    class Meta:
        model = Question
        fields = (
            'id', 'sequence', 'number', 'species',
            'user_answer', 'time_taken_seconds', 'points', 'correct',
            'created', 'media_item'
        )


class GameDetailWithAnswersSerializer(serializers.ModelSerializer):
    """Serializer for game with all questions and user's answers"""
    country = CountrySerializer()
    questions = serializers.SerializerMethodField()
    total_score = serializers.SerializerMethodField()
    
    def get_questions(self, obj):
        """Get questions ordered by sequence"""
        questions = obj.questions.all().order_by('sequence')
        # Pass game context to serializer for language-based translations
        context = {**self.context, 'game': obj}
        return QuestionWithAnswerSerializer(questions, many=True, context=context).data
    
    def get_total_score(self, obj):
        """Get total score for the user"""
        detail_player = self.context.get('detail_player')
        if detail_player is not None:
            ps = PlayerScore.objects.filter(player=detail_player, game=obj).first()
            return ps.score if ps else 0

        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0

        user_players = Player.objects.filter(user=request.user)
        player_score = PlayerScore.objects.filter(
            player__in=user_players,
            game=obj
        ).first()

        if player_score:
            return player_score.score
        return 0
    
    class Meta:
        model = Game
        fields = (
            'token', 'country', 'level', 'language',
            'created', 'multiplayer',
            'length', 'progress',
            'media', 'repeat',
            'ended',
            'tax_order',
            'tax_family',
            'rarity',
            'include_escapes',
            'questions',
            'total_score'
        )


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ('code', 'name')


class PageSerializer(serializers.ModelSerializer):
    content = serializers.SerializerMethodField()

    def get_content(self, obj):
        """Return Quill content as JSON string (delta + html) for frontend."""
        val = obj.content
        if hasattr(val, 'json_string'):
            return val.json_string
        if isinstance(val, str):
            return val
        return val if val is not None else '{"delta":"","html":""}'

    class Meta:
        model = Page
        fields = ('id', 'title', 'slug', 'content', 'show')


class PageListSerializer(serializers.ModelSerializer):
    """Minimal serializer for help overview (no content)."""
    class Meta:
        model = Page
        fields = ('id', 'title', 'slug')


class FeedbackSerializer(serializers.ModelSerializer):
    comment = serializers.CharField(allow_blank=True)
    player_token = serializers.CharField(required=False)
    rating = serializers.IntegerField()

    def create(self, validated_data):
        player = Player.objects.filter(token=validated_data.pop('player_token')).first()
        return Feedback.objects.create(player=player, **validated_data)

    class Meta:
        model = Feedback
        fields = ('comment', 'player_token', 'rating', 'created')


# --- Birdr Journey ---


class JourneyStepSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = JourneyStep
        fields = [
            'id',
            'sequence',
            'step_type',
            'level',
            'length',
            'jokers',
            'rarity',
            'include_escapes',
            'media',
            'tax_order',
            'status',
        ]

    def get_status(self, obj):
        step_statuses = self.context.get('step_statuses') or {}
        return step_statuses.get(obj.id, 'locked')


class JourneyLevelSerializer(serializers.ModelSerializer):
    icon_url = serializers.SerializerMethodField()
    is_champion = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()

    class Meta:
        model = JourneyLevel
        fields = [
            'sequence',
            'title',
            'description',
            'title_nl',
            'description_nl',
            'icon_url',
            'is_champion',
            'steps',
        ]

    def get_icon_url(self, obj):
        if not obj.icon:
            return None
        from jizz.services.species_cover import absolute_media_url

        request = self.context.get('request')
        return absolute_media_url(obj.icon.url, request)

    def get_is_champion(self, obj):
        return obj.is_champion

    def get_steps(self, obj):
        if not self.context.get('include_steps', True):
            return []
        steps = obj.steps.all()
        return JourneyStepSerializer(steps, many=True, context=self.context).data


class BirdrJourneyGameSerializer(serializers.ModelSerializer):
    journey_step = JourneyStepSerializer(read_only=True)
    remaining_jokers = serializers.IntegerField(read_only=True)
    game = GameSerializer(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = BirdrJourneyGame
        fields = ['id', 'journey_step', 'game', 'created', 'status', 'remaining_jokers']


class BirdrJourneySerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    player_token = serializers.SerializerMethodField()
    current_level = serializers.SerializerMethodField()
    next_level = serializers.SerializerMethodField()
    active_step = serializers.SerializerMethodField()
    is_champion = serializers.SerializerMethodField()
    pending_level_celebration = serializers.SerializerMethodField()
    can_play_today = serializers.SerializerMethodField()
    current_game = serializers.SerializerMethodField()

    class Meta:
        model = BirdrJourney
        fields = [
            'id',
            'country',
            'player_token',
            'current_sequence',
            'current_step_sequence',
            'streak_days',
            'last_played_date',
            'can_play_today',
            'is_champion',
            'pending_level_celebration',
            'current_level',
            'next_level',
            'active_step',
            'current_game',
            'created',
            'updated',
        ]

    def get_player_token(self, obj):
        from jizz.birdr_journey_views import get_journey_host

        host = get_journey_host(obj)
        return host.token if host else None

    def _serializer_context(self):
        journey = self.instance
        from jizz.birdr_journey_views import compute_step_statuses

        ctx = dict(self.context)
        ctx['step_statuses'] = compute_step_statuses(journey)
        ctx['include_steps'] = True
        return ctx

    def _level_for_sequence(self, sequence):
        from jizz.birdr_journey_views import get_journey_level

        return get_journey_level(sequence)

    def get_current_level(self, obj):
        level = self._level_for_sequence(obj.current_sequence)
        if not level:
            return None
        return JourneyLevelSerializer(level, context=self._serializer_context()).data

    def get_next_level(self, obj):
        level = self._level_for_sequence(obj.current_sequence + 1)
        if not level:
            return None
        ctx = dict(self._serializer_context())
        ctx['include_steps'] = False
        return JourneyLevelSerializer(level, context=ctx).data

    def get_active_step(self, obj):
        from jizz.birdr_journey_views import get_active_journey_step

        step = get_active_journey_step(obj)
        if not step:
            return None
        ctx = self._serializer_context()
        return JourneyStepSerializer(step, context=ctx).data

    def get_is_champion(self, obj):
        level = self._level_for_sequence(obj.current_sequence)
        return bool(level and level.is_champion)

    def get_pending_level_celebration(self, obj):
        from jizz.birdr_journey_views import is_pending_level_celebration

        return is_pending_level_celebration(obj)

    def get_can_play_today(self, obj):
        from jizz.birdr_journey_views import get_active_journey_step, is_pending_level_celebration

        if is_pending_level_celebration(obj):
            return False
        level = self._level_for_sequence(obj.current_sequence)
        if not level or level.is_champion:
            return False
        return get_active_journey_step(obj) is not None

    def get_current_game(self, obj):
        from jizz.birdr_journey_views import get_current_journey_game

        journey_game = get_current_journey_game(obj)
        if not journey_game:
            return None
        return BirdrJourneyGameSerializer(journey_game, context=self.context).data


# --- Friends & Daily Challenge ---


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user for friend lists and challenge participants."""
    username = serializers.CharField(read_only=True)
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'profile')

    def get_profile(self, obj):
        try:
            p = obj.profile
            return {
                'username': obj.username,
                'language': getattr(p, 'language', None),
                'country_code': p.country_id if p and p.country_id else None,
            }
        except UserProfile.DoesNotExist:
            return {'username': obj.username}


class FriendshipSerializer(serializers.ModelSerializer):
    from_user = UserMinimalSerializer(read_only=True)
    to_user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ('id', 'from_user', 'to_user', 'status', 'created')
        read_only_fields = ('id', 'created')


class FriendshipRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    username = serializers.CharField(required=False)

    def validate(self, attrs):
        if not attrs.get('user_id') and not attrs.get('username'):
            raise serializers.ValidationError('Provide user_id or username')
        return attrs


class DailyChallengeParticipantSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = DailyChallengeParticipant
        fields = ('id', 'user', 'invited_by', 'status', 'accepted_at', 'created')


class DailyChallengeRoundSerializer(serializers.ModelSerializer):
    game_token = serializers.SerializerMethodField()
    my_player_token = serializers.SerializerMethodField()
    game_ended = serializers.SerializerMethodField()
    user_score = serializers.SerializerMethodField()
    points_multiplier = serializers.SerializerMethodField()
    display_score = serializers.SerializerMethodField()
    opens_at_local = serializers.SerializerMethodField()
    closes_at_local = serializers.SerializerMethodField()

    class Meta:
        model = DailyChallengeRound
        fields = (
            'id', 'day_number', 'game', 'game_token', 'my_player_token',
            'game_ended', 'user_score', 'points_multiplier', 'display_score',
            'opens_at', 'closes_at', 'opens_at_local', 'closes_at_local',
            'status', 'created'
        )

    @staticmethod
    def _points_multiplier_for_day(day_number):
        if day_number == 3:
            return 2
        if day_number == 7:
            return 3
        return 1

    def get_points_multiplier(self, obj):
        return self._points_multiplier_for_day(obj.day_number)

    def get_display_score(self, obj):
        raw = self.get_user_score(obj)
        if raw is None:
            return None
        return raw * self._points_multiplier_for_day(obj.day_number)

    def get_game_token(self, obj):
        return obj.game.token if obj.game_id else None

    def get_my_player_token(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not obj.game_id:
            return None
        from jizz.models import Player
        player = Player.objects.filter(user=request.user).filter(scores__game=obj.game).first()
        return player.token if player else None

    def get_game_ended(self, obj):
        if not obj.game_id or not obj.game:
            return False
        if obj.status == 'completed':
            return True
        return getattr(obj.game, 'ended', False) if hasattr(obj.game, 'ended') else False

    def get_user_score(self, obj):
        if not obj.game_id:
            return None
        request = self.context.get('request')
        if not request or not request.user:
            return None
        from jizz.models import Player
        player = Player.objects.filter(user=request.user).filter(scores__game=obj.game).first()
        if not player:
            return None
        ps = PlayerScore.objects.filter(player=player, game=obj.game).first()
        return ps.score if ps is not None else None

    def get_opens_at_local(self, obj):
        if not obj.opens_at:
            return None
        request = self.context.get('request')
        if not request or not request.user:
            return None
        try:
            profile = UserProfile.objects.filter(user=request.user).first()
            tz_name = (profile.timezone if profile else 'Europe/Amsterdam') or 'Europe/Amsterdam'
            tz_name = (tz_name or '').strip() or 'Europe/Amsterdam'
            from zoneinfo import ZoneInfo
            tz = ZoneInfo(tz_name)
            return obj.opens_at.astimezone(tz).isoformat()
        except Exception:
            return None

    def get_closes_at_local(self, obj):
        if not obj.closes_at:
            return None
        request = self.context.get('request')
        if not request or not request.user:
            return None
        try:
            profile = UserProfile.objects.filter(user=request.user).first()
            tz_name = (profile.timezone if profile else 'Europe/Amsterdam') or 'Europe/Amsterdam'
            tz_name = (tz_name or '').strip() or 'Europe/Amsterdam'
            from zoneinfo import ZoneInfo
            tz = ZoneInfo(tz_name)
            return obj.closes_at.astimezone(tz).isoformat()
        except Exception:
            return None


class DailyChallengeSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    country_code = serializers.SlugRelatedField(
        slug_field='code',
        queryset=Country.objects.all(),
        write_only=True,
        required=False
    )
    participants = DailyChallengeParticipantSerializer(many=True, read_only=True)
    rounds = DailyChallengeRoundSerializer(many=True, read_only=True)
    creator_username = serializers.CharField(source='creator.username', read_only=True)

    class Meta:
        model = DailyChallenge
        fields = (
            'id', 'token', 'creator', 'creator_username', 'country', 'country_code',
            'media', 'length', 'duration_days', 'level', 'started_at', 'status',
            'participants', 'rounds', 'created'
        )
        read_only_fields = ('token', 'creator', 'started_at', 'participants', 'rounds')


class DailyChallengeCreateSerializer(serializers.Serializer):
    country = serializers.CharField()
    media = serializers.ChoiceField(choices=Game.MEDIA_CHOICES, default='images')
    length = serializers.IntegerField(default=10)
    duration_days = serializers.IntegerField(default=7, required=False)
    level = serializers.CharField(default='advanced', required=False)


class DailyChallengeInviteSerializer(serializers.Serializer):
    friend_user_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    emails = serializers.ListField(child=serializers.EmailField(), required=False, default=list)


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ('id', 'token', 'platform', 'created', 'last_used')
        read_only_fields = ('id', 'created', 'last_used')

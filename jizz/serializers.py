from urllib.parse import urlparse

from django.contrib.auth.models import User
from rest_framework import serializers

from jizz.models import Country, Species, Game, Question, Answer, Player, QuestionOption, PlayerScore, FlagQuestion, \
    Feedback, Update, Reaction, CountryChallenge, CountryGame, \
    ChallengeLevel, Language, Page, SpeciesName, UserProfile
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
        fields = ('name', 'code', 'name_latin', 'name_nl', 'name_translated', 'id', 'images', 'videos', 'sounds')

class QuestionSerializer(serializers.ModelSerializer):
    images = QuestionMediaSerializer(source='species.images', many=True)
    videos = QuestionMediaSerializer(source='species.videos', many=True)
    sounds = QuestionMediaSerializer(source='species.sounds', many=True)
    options = serializers.SerializerMethodField()
    game = serializers.SerializerMethodField()

    def get_options(self, obj):
        option_orders = QuestionOption.objects.filter(question=obj).order_by('order')
        return SpeciesDetailSerializer([op.species for op in option_orders], many=True).data

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
    answer = SpeciesDetailSerializer(read_only=True)
    answer_id = serializers.IntegerField(write_only=True)
    question_id = serializers.IntegerField(write_only=True)
    number = serializers.IntegerField(read_only=True, source='question.number')
    sequence = serializers.IntegerField(source='question.sequence', read_only=True)

    def create(self, validated_data):
        player = Player.objects.get(token=validated_data.pop('player_token'))
        question = Question.objects.get(id=validated_data.pop('question_id'))
        answer = Species.objects.get(id=validated_data.pop('answer_id'))
        correct = answer == question.species
        player_score, _created = PlayerScore.objects.get_or_create(player=player, game=question.game)
        if Answer.objects.filter(player_score=player_score, question=question).exists():
            return Answer.objects.filter(player_score=player_score, question=question).first()
        return Answer.objects.create(player_score=player_score, question=question, answer=answer, correct=correct)

    class Meta:
        model = Answer
        fields = (
            'id', 'question_id', 'player_token', 
            'answer', 'correct', 'species', 
            'answer_id', 'number', 'score',
            'sequence'
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
        if request and request.user and request.user.is_authenticated:
            if data.get('player_token'):
                raise serializers.ValidationError(
                    {'player_token': 'Do not send player_token when authenticated as a user.'}
                )
            return data
        if not data.get('player_token'):
            raise serializers.ValidationError(
                {'player_token': 'Either authenticate as a user or provide player_token.'}
            )
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
        fields = ('username', 'email', 'first_name', 'last_name', 'avatar', 'avatar_url', 'receive_updates', 'language', 'country_code', 'country_name', 'is_staff', 'is_superuser')
        read_only_fields = ('avatar_url', 'country_code', 'country_name', 'is_staff', 'is_superuser')

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
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
    ranking = serializers.IntegerField(source='score_rank', read_only=True)

    def get_country(self, obj):
        if obj.game and obj.game.country_id:
            return {'code': obj.game.country.code, 'name': obj.game.country.name}
        return {'code': '', 'name': ''}

    class Meta:
        model = PlayerScore
        fields = ('id', 'name', 'country', 'media', 'level', 'length', 'score', 'ranking')


class GameSerializer(serializers.ModelSerializer):
    country = serializers.CharField(write_only=True, required=False)
    country_data = CountrySerializer(source='country', read_only=True)
    host = MultiPlayerSerializer(read_only=True)
    current_highscore = PlayerScoreSerializer(read_only=True)
    scores = PlayerScoreSerializer(
        many=True, 
        read_only=True
    )

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
            'include_rare',
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
            'include_rare',
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
        """Calculate time taken to answer in seconds"""
        answer = self._get_user_answer_obj(obj)
        
        if answer:
            time_taken = (answer.created - obj.created).total_seconds()
            return round(time_taken, 2)
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
            'include_rare',
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


class ChallengeLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChallengeLevel
        fields = [
            'sequence', 'level', 
            'title', 'description', 
            'title_nl', 'description_nl',
            'length', 'media', 'jokers'
        ]


class CountryGameSerializer(serializers.ModelSerializer):
    challenge_level = ChallengeLevelSerializer(read_only=True)
    remaining_jokers = serializers.IntegerField(read_only=True)
    game = GameSerializer(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = CountryGame
        fields = ['id', 'game', 'challenge_level', 'created', 'status', 'remaining_jokers']


class CountryChallengeSerializer(serializers.ModelSerializer):
    levels = CountryGameSerializer(source='games', many=True, read_only=True)
    player = PlayerSerializer(read_only=True)
    country = CountrySerializer(read_only=True)
    country_code = serializers.CharField(source='country_id', write_only=True)
    
    class Meta:
        model = CountryChallenge
        fields = ['id', 'country', 'player', 'created', 'levels', 'country_code']

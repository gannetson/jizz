from django.contrib.auth.models import User
from rest_framework import serializers
from jizz.models import Country, Species, SpeciesImage, Game, Question, Answer, Player, SpeciesVideo, SpeciesSound, \
    QuestionOption, PlayerScore, FlagQuestion, Feedback, Update, Reaction, CountryChallenge, CountryGame, \
    ChallengeLevel, Language, SpeciesName, UserProfile


class CountrySerializer(serializers.ModelSerializer):

    def to_internal_value(self, data):
        return Country.objects.get(code=data)

    class Meta:
        model = Country
        fields = ('code', 'name', 'count')


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpeciesImage
        fields = ('url', 'link', 'contributor')


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpeciesVideo
        fields = ('url', 'link', 'contributor')


class SoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpeciesSound
        fields = ('url', 'link', 'contributor')


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
    images = ImageSerializer(many=True)

    class Meta:
        model = Species
        fields = ('name', 'code', 'name_latin', 'name_nl', 'id', 'images')

class QuestionSerializer(serializers.ModelSerializer):
    images = ImageSerializer(source='species.images', many=True)
    videos = VideoSerializer(source='species.videos', many=True)
    sounds = SoundSerializer(source='species.sounds', many=True)
    options = serializers.SerializerMethodField()

    def get_options(self, obj):
        option_orders = QuestionOption.objects.filter(question=obj).order_by('order')
        return SpeciesDetailSerializer([op.species for op in option_orders], many=True).data

    class Meta:
        model = Question
        fields = ('id', 'done', 'options', 'images', 'videos', 'sounds', 'number', 'sequence')


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
    question_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = FlagQuestion
        fields = ('player_token', 'description', 'question_id')

    def create(self, validated_data):
        player = Player.objects.get(token=validated_data.pop('player_token'))
        question = Question.objects.get(id=validated_data.pop('question_id'))
        description = validated_data.pop('description')
        return FlagQuestion.objects.create(description=description, player=player, question=question)


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
    is_staff = serializers.BooleanField(source='user.is_staff', read_only=True)
    is_superuser = serializers.BooleanField(source='user.is_superuser', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    country_code = serializers.CharField(source='country.code', read_only=True, allow_null=True)
    country_name = serializers.CharField(source='country.name', read_only=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ('username', 'email', 'avatar', 'avatar_url', 'receive_updates', 'language', 'country_code', 'country_name', 'is_staff', 'is_superuser')
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

    class Meta:
        model = PlayerScore
        fields = (
            'id', 'name', 'status', 'language', 'created',
            'score', 'last_answer', 'answers',
            'media', 'level', 'length',
            'country', 'ranking'
        )


class GameSerializer(serializers.ModelSerializer):
    country = CountrySerializer()
    host = MultiPlayerSerializer(read_only=True)
    current_highscore = PlayerScoreSerializer(read_only=True)
    scores = PlayerScoreSerializer(
        many=True, 
        read_only=True
    )


    class Meta:
        model = Game
        fields = (
            'token', 'country', 'level', 'language',
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


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ('code', 'name')


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

from django.contrib.auth.models import User
from rest_framework import serializers
from jizz.models import Country, Species, SpeciesImage, Game, Question, Answer, Player, SpeciesVideo, SpeciesSound, \
    QuestionOption, PlayerScore, FlagQuestion, Feedback, Update, Reaction


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
    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'name_nl', 'id')


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

    def create(self, validated_data):
        player = Player.objects.get(token=validated_data.pop('player_token'))
        question = Question.objects.get(id=validated_data.pop('question_id'))
        answer = Species.objects.get(id=validated_data.pop('answer_id'))
        correct = answer == question.species
        return Answer.objects.create(player=player, question=question, answer=answer, correct=correct)

    class Meta:
        model = Answer
        fields = ('id', 'question_id', 'player_token', 'answer', 'correct', 'species', 'answer_id', 'number', 'score')
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
        fields = ('username', 'first_name', 'last_name')


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

    class Meta:
        model = PlayerScore
        fields = (
            'id', 'name', 'status', 'language', 'created',
            'score', 'last_answer',
            'media', 'level', 'length',
            'country', 'ranking'
        )


class GameSerializer(serializers.ModelSerializer):
    country = CountrySerializer()
    host = MultiPlayerSerializer(read_only=True)
    current_highscore = PlayerScoreSerializer(read_only=True)

    class Meta:
        model = Game
        fields = (
            'token', 'country', 'level', 'language',
            'created', 'multiplayer',
            'length', 'progress',
            'media', 'repeat',
            'host', 'ended',
            'current_highscore', 'tax_order',
            'include_rare',
            'include_escapes'
        )


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

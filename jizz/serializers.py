from rest_framework import serializers

from jizz.models import Country, Species, SpeciesImage, Game, Question, Answer, Player, SpeciesVideo, SpeciesSound


class CountrySerializer(serializers.ModelSerializer):

    def to_internal_value(self, data):
        return Country.objects.get(code=data)

    class Meta:
        model = Country
        fields = ('code', 'name', 'count')



class ImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = SpeciesImage
        fields = ('url',)


class VideoSerializer(serializers.ModelSerializer):

    class Meta:
        model = SpeciesVideo
        fields = ('url',)


class SoundSerializer(serializers.ModelSerializer):

    class Meta:
        model = SpeciesSound
        fields = ('url',)


class SpeciesListSerializer(serializers.ModelSerializer):

    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'name_nl', 'id')


class SpeciesDetailSerializer(serializers.ModelSerializer):

    images = ImageSerializer(many=True)

    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'name_nl', 'id', 'images')


class QuestionSerializer(serializers.ModelSerializer):
    options = SpeciesDetailSerializer(many=True, read_only=True)
    images = ImageSerializer(source='species.images', many=True)
    videos = VideoSerializer(source='species.videos', many=True)
    sounds = SoundSerializer(source='species.sounds', many=True)

    class Meta:
        model = Question
        fields = ('id', 'done', 'options', 'images', 'videos', 'sounds', 'number')


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
        fields = ('id', 'question_id', 'player_token', 'answer', 'correct', 'species', 'answer_id', 'number')
        unique_together = ('question', 'player')


class PlayerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Player
        fields = ('name', 'is_host', 'token', 'language')


class MultiPlayerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Player
        fields = ('name', 'is_host', 'language')


class GameSerializer(serializers.ModelSerializer):

    country = CountrySerializer()
    question = QuestionSerializer(read_only=True)

    class Meta:
        model = Game
        fields = ('token', 'country', 'level', 'language', 'question', 'created', 'multiplayer', 'length', 'progress', 'media', 'repeat')

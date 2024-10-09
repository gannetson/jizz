from rest_framework import serializers

from jizz.models import Country, Species, SpeciesImage, Game, Question, Answer, Player


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


class SpeciesListSerializer(serializers.ModelSerializer):

    images = ImageSerializer(many=True)

    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'name_nl', 'id', 'images')


class SpeciesDetailSerializer(serializers.ModelSerializer):

    images = ImageSerializer(many=True)

    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'name_nl', 'id', 'images')


class QuestionSerializer(serializers.ModelSerializer):
    species = SpeciesListSerializer(read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'species', 'errors', 'correct',)


class AnswerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Answer
        fields = ('id', 'question', 'player', 'answer')


class PlayerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Player
        fields = ('name', 'token')


class GameSerializer(serializers.ModelSerializer):

    country = CountrySerializer()
    question = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ('token', 'country', 'level', 'language', 'question', 'created', 'multiplayer', 'length', 'progress')

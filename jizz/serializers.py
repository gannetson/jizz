from rest_framework import serializers

from jizz.models import Country, Species, SpeciesImage, Game, Question


class CountrySerializer(serializers.ModelSerializer):

    def to_internal_value(self, data):
        return Country.objects.get(code=data)

    class Meta:
        model = Country
        fields = ('code', 'name')



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


class GameSerializer(serializers.ModelSerializer):

    questions = QuestionSerializer(many=True, read_only=True)
    country = CountrySerializer()

    class Meta:
        model = Game
        fields = ('token', 'country', 'level', 'language', 'questions', 'created')

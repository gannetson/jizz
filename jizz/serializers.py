from rest_framework import serializers

from jizz.models import Country, Species, SpeciesImage


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ('code', 'name')



class ImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = SpeciesImage
        fields = ('url',)


class SpeciesSerializer(serializers.ModelSerializer):

    images = ImageSerializer(many=True)

    class Meta:
        model = Species
        fields = ('name', 'name_latin', 'images')
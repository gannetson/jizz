"""Staff-writable API for marketing CMS pages."""

from __future__ import annotations

from django.utils.text import slugify
from rest_framework import serializers, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from jizz.marketing.html import sanitize_html
from jizz.models import MarketingPage


class IsStaffForWrites(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)


def _is_staff(request) -> bool:
    user = request.user
    return bool(user and user.is_authenticated and user.is_staff)


class MarketingPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingPage
        fields = (
            'id', 'title', 'slug', 'meta_description', 'body',
            'published', 'show_in_nav', 'nav_label', 'nav_order', 'updated_at',
        )
        read_only_fields = ('id', 'updated_at')
        extra_kwargs = {'slug': {'required': False}}

    def validate_body(self, value):
        return sanitize_html(value or '')

    def validate_slug(self, value):
        slug = slugify(value or '')
        if not slug:
            raise serializers.ValidationError('Enter a valid slug.')
        return slug

    def validate(self, attrs):
        if self.instance is None and not attrs.get('slug'):
            if not attrs.get('title'):
                raise serializers.ValidationError({'title': 'Enter a title.'})
            attrs['slug'] = _unique_slug(attrs['title'])
        return attrs


def _unique_slug(title: str) -> str:
    base = slugify(title) or 'page'
    slug = base
    n = 2
    while MarketingPage.objects.filter(slug=slug).exists():
        slug = f'{base}-{n}'
        n += 1
    return slug


class MarketingPageListCreateView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsStaffForWrites]

    def get(self, request):
        qs = MarketingPage.objects.all()
        if not _is_staff(request):
            qs = qs.filter(published=True)
        return Response(MarketingPageSerializer(qs, many=True).data)

    def post(self, request):
        serializer = MarketingPageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MarketingPageDetailView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsStaffForWrites]

    def _get(self, request, slug):
        qs = MarketingPage.objects.all()
        if not _is_staff(request):
            qs = qs.filter(published=True)
        return qs.filter(slug=slug).first()

    def get(self, request, slug):
        page = self._get(request, slug)
        if page is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(MarketingPageSerializer(page).data)

    def patch(self, request, slug):
        page = MarketingPage.objects.filter(slug=slug).first()
        if page is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = MarketingPageSerializer(page, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, slug):
        page = MarketingPage.objects.filter(slug=slug).first()
        if page is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

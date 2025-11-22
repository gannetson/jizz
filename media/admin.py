from django.contrib import admin
from django.utils.html import format_html
from .models import Image, Video, Audio


class VisibilityFilter(admin.SimpleListFilter):
    title = 'Visibility'
    parameter_name = 'visibility'

    def lookups(self, request, model_admin):
        return (
            ('visible', 'Visible'),
            ('hidden', 'Hidden'),
            ('all', 'All'),
        )

    def queryset(self, request, queryset):
        value = self.value()
        if value == 'hidden':
            return queryset.filter(hide=True)
        if value == 'all':
            return queryset
        # Default to visible
        return queryset.filter(hide=False)


class HideableAdminMixin:
    actions = ['mark_hidden', 'mark_visible']

    def mark_hidden(self, request, queryset):
        updated = queryset.update(hide=True)
        self.message_user(request, f"{updated} item(s) marked as hidden.")

    mark_hidden.short_description = 'Hide selected items'

    def mark_visible(self, request, queryset):
        updated = queryset.update(hide=False)
        self.message_user(request, f"{updated} item(s) marked as visible.")

    mark_visible.short_description = 'Show selected items'


@admin.register(Image)
class ImageAdmin(HideableAdminMixin, admin.ModelAdmin):
    list_display = ['id', 'species', 'source', 'hide', 'image_thumbnail', 'created']
    list_filter = [VisibilityFilter, 'created', 'source', 'species']
    search_fields = ['species__name', 'contributor', 'copyright']
    raw_id_fields = ['species']
    readonly_fields = ['created', 'updated', 'image_preview']
    date_hierarchy = 'created'
    list_per_page = 25
    
    fieldsets = (
        ('Species', {
            'fields': ('species',)
        }),
        ('Media Information', {
            'fields': ('media', 'source', 'contributor', 'copyright', 'url', 'link', 'hide', 'image_preview')
        }),
        ('Timestamps', {
            'fields': ('created', 'updated'),
            'classes': ('collapse',)
        }),
    )
    
    def has_media(self, obj):
        return bool(obj.media)
    has_media.boolean = True
    has_media.short_description = 'Has Media'
    
    def _get_image_url(self, obj):
        if obj.media:
            return obj.media.url
        if obj.link:
            return obj.url
        return None
    
    def image_thumbnail(self, obj):
        url = self._get_image_url(obj)
        if not url:
            return "-"
        return format_html('<img src="{}" style="max-height:60px; max-width:60px;" />', url)
    image_thumbnail.short_description = 'Preview'
    
    def image_preview(self, obj):
        url = self._get_image_url(obj)
        if not url:
            return "No preview available"
        return format_html('<img src="{}" style="max-height:300px; max-width:100%;" />', url)
    image_preview.short_description = 'Image'


@admin.register(Video)
class VideoAdmin(HideableAdminMixin, admin.ModelAdmin):
    list_display = ['id', 'species', 'source', 'contributor', 'hide', 'has_media', 'link', 'created']
    list_filter = [VisibilityFilter, 'created', 'source', 'species']
    search_fields = ['species__name', 'contributor', 'copyright']
    raw_id_fields = ['species']
    readonly_fields = ['created', 'updated']
    date_hierarchy = 'created'
    list_per_page = 25
    
    fieldsets = (
        ('Species', {
            'fields': ('species',)
        }),
        ('Media Information', {
            'fields': ('media', 'source', 'contributor', 'copyright', 'link', 'hide')
        }),
        ('Timestamps', {
            'fields': ('created', 'updated'),
            'classes': ('collapse',)
        }),
    )
    
    def has_media(self, obj):
        return bool(obj.media)
    has_media.boolean = True
    has_media.short_description = 'Has Media'


@admin.register(Audio)
class AudioAdmin(HideableAdminMixin, admin.ModelAdmin):
    list_display = ['id', 'species', 'source', 'contributor', 'hide', 'has_media', 'link', 'created']
    list_filter = [VisibilityFilter, 'created', 'source', 'species']
    search_fields = ['species__name', 'contributor', 'copyright']
    raw_id_fields = ['species']
    readonly_fields = ['created', 'updated']
    date_hierarchy = 'created'
    list_per_page = 25
    
    fieldsets = (
        ('Species', {
            'fields': ('species',)
        }),
        ('Media Information', {
            'fields': ('media', 'source', 'contributor', 'copyright', 'link', 'hide')
        }),
        ('Timestamps', {
            'fields': ('created', 'updated'),
            'classes': ('collapse',)
        }),
    )
    
    def has_media(self, obj):
        return bool(obj.media)
    has_media.boolean = True
    has_media.short_description = 'Has Media'


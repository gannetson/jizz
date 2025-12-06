from django.contrib import admin
from django.utils.html import format_html
from .models import Media


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



@admin.register(Media)
class MediaAdmin(HideableAdminMixin, admin.ModelAdmin):
    list_display = ['id', 'species', 'type', 'source', 'hide', 'image_thumbnail', 'created']
    list_filter = [VisibilityFilter, 'type', 'created', 'source', 'species', 'copyright_standardized', 'non_commercial_only']
    search_fields = ['species__name', 'contributor', 'copyright_text', 'copyright_standardized']
    raw_id_fields = ['species']
    readonly_fields = ['created', 'updated', 'image_preview']
    date_hierarchy = 'created'
    list_per_page = 25
    
    fieldsets = (
        ('Species', {
            'fields': ('species',)
        }),
        ('Media Information', {
            'fields': ('source', 'type', 'contributor', 'url', 'link', 'hide', 'image_preview')
        }),
        ('Copyright', {
            'fields': ('copyright_text', 'copyright_standardized', 'non_commercial_only')
        }),
        ('Timestamps', {
            'fields': ('created', 'updated'),
            'classes': ('collapse',)
        }),
    )
    
    def _get_image_url(self, obj):
        """Get the media URL for preview."""
        if obj and obj.url:
            return obj.url
        return None
    
    def image_thumbnail(self, obj):
        """Show thumbnail/preview in list view based on media type."""
        url = self._get_image_url(obj)
        if not url:
            return "-"
        
        if obj.type == 'image':
            return format_html('<img src="{}" style="max-height:60px; max-width:60px;" />', url)
        elif obj.type == 'video':
            return format_html(
                '<video controls style="max-height:60px; max-width:60px;">'
                '<source src="{}" type="video/mp4" />'
                '</video>',
                url
            )
        elif obj.type == 'audio':
            return format_html(
                '<audio controls style="max-width:200px;">'
                '<source src="{}" type="audio/mpeg" />'
                '</audio>',
                url
            )
        return "-"
    image_thumbnail.short_description = 'Preview'
    
    def image_preview(self, obj):
        url = self._get_image_url(obj)
        if not url:
            return "No preview available"
        
        # Show different preview based on media type
        if obj.type == 'image':
            return format_html('<img src="{}" style="max-height:300px; max-width:100%;" />', url)
        elif obj.type == 'video':
            return format_html(
                '<video controls style="max-width:100%; max-height:600px;">'
                '<source src="{}" type="video/mp4" />'
                'Your browser does not support the video tag.'
                '</video>',
                url
            )
        elif obj.type == 'audio':
            return format_html(
                '<audio controls style="width:100%; max-width:800px;">'
                '<source src="{}" type="audio/mpeg" />'
                'Your browser does not support the audio tag.'
                '</audio>',
                url
            )
        return "No preview available"
    image_preview.short_description = 'Preview'

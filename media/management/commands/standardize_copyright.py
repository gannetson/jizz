from django.core.management.base import BaseCommand
from media.models import Media
from media.utils import parse_copyright


class Command(BaseCommand):
    help = 'Standardize copyright fields for existing media based on copyright_text'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of media items to process',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options.get('limit')
        
        # Get all media that has copyright_text but no copyright_standardized
        queryset = Media.objects.filter(
            copyright_text__isnull=False
        ).exclude(copyright_text='')
        
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f'Found {total} media items to process')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))
        
        updated_count = 0
        skipped_count = 0
        
        for media in queryset:
            standardized, non_commercial = parse_copyright(media.copyright_text)
            
            # Skip if already set and matches
            if media.copyright_standardized == standardized and media.non_commercial_only == non_commercial:
                skipped_count += 1
                continue
            
            if dry_run:
                self.stdout.write(
                    f'Would update Media {media.id}: '
                    f'"{media.copyright_text[:50]}..." -> '
                    f'standardized="{standardized}", non_commercial={non_commercial}'
                )
            else:
                media.copyright_standardized = standardized
                media.non_commercial_only = non_commercial
                media.save(update_fields=['copyright_standardized', 'non_commercial_only'])
                updated_count += 1
                
                if updated_count % 100 == 0:
                    self.stdout.write(f'Processed {updated_count} items...')
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nWould update {total - skipped_count} items '
                    f'(skipped {skipped_count} already correct)'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nUpdated {updated_count} items '
                    f'(skipped {skipped_count} already correct)'
                )
            )


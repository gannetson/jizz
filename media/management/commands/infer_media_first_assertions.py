"""
Run inference and upsert MediaPrediction rows.

Examples:
  python manage.py infer_media_first_assertions --model-version first_assertion_v1 --only-missing
  python manage.py infer_media_first_assertions --model-version first_assertion_v1 --only-unreviewed --limit 500
  python manage.py infer_media_first_assertions --artifact-path /path/to/model.joblib --media-id 123
"""
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Exists, OuterRef

from media.first_assertion.features import ensure_feature_extractor_dependencies
from media.first_assertion.run_inference import infer_media_queryset, resolve_artifact_path
from media.models import Media, MediaPrediction, MediaReview


class Command(BaseCommand):
    help = 'Infer first-assertion predictions for image media and upsert MediaPrediction.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-version',
            type=str,
            default=None,
            help='Version string; used to find model-{version}.joblib under artifacts dir',
        )
        parser.add_argument(
            '--artifact-path',
            type=str,
            default=None,
            help='Explicit path to joblib bundle (overrides --model-version path)',
        )
        parser.add_argument(
            '--only-missing',
            action='store_true',
            help='Only images without a MediaPrediction row (default if no other mode)',
        )
        parser.add_argument(
            '--only-unreviewed',
            action='store_true',
            help='Only images with no MediaReview',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            dest='all_images',
            help='All images with URL (overwrite predictions)',
        )
        parser.add_argument(
            '--media-id',
            type=int,
            default=None,
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
        )
        parser.add_argument(
            '--features-version',
            type=str,
            default=None,
            choices=['handcrafted_v1', 'handcrafted_v2', 'handcrafted_v2_yolo'],
            help='Override features version for extraction (default: whatever the model bundle says).',
        )
        parser.add_argument(
            '--force-features-version',
            action='store_true',
            help='Allow overriding model bundle features_version (dangerous; mainly for debugging).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Compute predictions but do not write MediaPrediction rows.',
        )
        parser.add_argument(
            '--confidence-threshold',
            type=float,
            default=None,
            help='For summary stats: count predictions below this confidence.',
        )
        parser.add_argument(
            '--progress-every',
            type=int,
            default=50,
            help='Log progress every N processed images (0 disables).',
        )

    def handle(self, *args, **options):
        artifact_path = options['artifact_path']
        model_version = options['model_version']
        if not artifact_path and not model_version:
            raise CommandError('Provide --artifact-path or --model-version')

        if options['features_version']:
            try:
                ensure_feature_extractor_dependencies(options['features_version'])
            except ModuleNotFoundError as exc:
                raise CommandError(str(exc)) from exc

        path = resolve_artifact_path(artifact_path=artifact_path, model_version=model_version)
        if not path.is_file():
            raise CommandError(f'Artifact not found: {path}')

        only_missing = options['only_missing']
        only_unreviewed = options['only_unreviewed']
        all_images = options['all_images']
        media_id = options['media_id']
        limit = options['limit']

        mode_count = sum([bool(only_missing), bool(only_unreviewed), bool(all_images), bool(media_id)])
        if mode_count > 1:
            raise CommandError('Use only one of --only-missing, --only-unreviewed, --all, or --media-id')
        if mode_count == 0:
            only_missing = True

        base = (
            Media.objects.filter(type='image')
            .exclude(url__isnull=True)
            .exclude(url='')
        )

        if media_id:
            qs = base.filter(pk=media_id)
        elif all_images:
            qs = base
        elif only_unreviewed:
            has_rev = Exists(MediaReview.objects.filter(media_id=OuterRef('pk')))
            qs = base.filter(~has_rev)
        elif only_missing:
            predicted_ids = MediaPrediction.objects.values_list('media_id', flat=True)
            qs = base.exclude(pk__in=predicted_ids)
        else:
            qs = base.none()

        if limit:
            qs = qs.order_by('id')[:limit]

        stats = {}
        n_ok, n_skip, _ver = infer_media_queryset(
            qs,
            artifact_path=artifact_path,
            model_version=model_version,
            features_version=options['features_version'],
            force_features_version=options['force_features_version'],
            dry_run=options['dry_run'],
            confidence_threshold=options['confidence_threshold'],
            progress_every=max(0, int(options['progress_every'] or 0)),
            stats=stats,
        )

        below = int(stats.get('below_threshold', 0))
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(f'Dry run: computed predictions for {n_ok} media (skipped {n_skip}).'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Upserted predictions for {n_ok} media (skipped {n_skip}).'))
        if options['confidence_threshold'] is not None:
            self.stdout.write(
                self.style.NOTICE(
                    f'Below confidence threshold ({options["confidence_threshold"]:.3f}): {below}'
                )
            )

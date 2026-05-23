"""
Train a lightweight logistic model on handcrafted image features from reviewed images.

Example:
  python manage.py train_media_first_assertion_model --model-version first_assertion_v1
"""
import logging
from pathlib import Path

import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from media.first_assertion import DEFAULT_FEATURES_VERSION
from media.first_assertion.features import (
    extract_feature_vector_from_url,
    ensure_feature_extractor_dependencies,
    feature_dim,
    feature_names,
)
from media.first_assertion.labels import binary_training_label, queryset_labeled_image_media
from media.first_assertion.train import save_artifact, train_pipeline

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Train media first-assertion classifier from reviewed image URLs (offline).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-version',
            type=str,
            default='first_assertion_v1',
            help='Version string stored on MediaPrediction rows',
        )
        parser.add_argument(
            '--min-samples',
            type=int,
            default=50,
            help='Minimum labeled images required to train',
        )
        parser.add_argument(
            '--test-size',
            type=float,
            default=0.2,
            help='Holdout fraction for metrics',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Max training images (for dev)',
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default=None,
            help='Override MEDIA_FIRST_ASSERTION_ARTIFACTS_DIR',
        )
        parser.add_argument(
            '--features-version',
            type=str,
            default=DEFAULT_FEATURES_VERSION,
            choices=['handcrafted_v1', 'handcrafted_v2', 'handcrafted_v2_yolo'],
            help='Feature extraction version (must match inference).',
        )
        parser.add_argument(
            '--min-per-class',
            type=int,
            default=10,
            help='Minimum positives and negatives required after filtering.',
        )

    def handle(self, *args, **options):
        out_dir = Path(options['output_dir'] or settings.MEDIA_FIRST_ASSERTION_ARTIFACTS_DIR)
        model_version = options['model_version']
        min_samples = options['min_samples']
        test_size = options['test_size']
        limit = options['limit']
        features_version = options['features_version']
        min_per_class = options['min_per_class']

        try:
            ensure_feature_extractor_dependencies(features_version)
        except ModuleNotFoundError as exc:
            raise CommandError(str(exc)) from exc

        qs = queryset_labeled_image_media().order_by('id')
        if limit:
            qs = qs[:limit]

        total = qs.count()
        verbosity = options.get('verbosity', 1)
        tty = getattr(self.stdout, 'isatty', lambda: False)()
        use_tty_progress = bool(total and tty and verbosity >= 1)
        milestone = max(1, total // 10) if total else 1
        if verbosity >= 1 and total:
            self.stdout.write(
                self.style.NOTICE(
                    f'Extracting {features_version} features from {total} media (this may take a while)...'
                )
            )

        X_list = []
        y_list = []
        skipped = 0
        for i, media in enumerate(qs.iterator(chunk_size=50), start=1):
            y = binary_training_label(media)
            if y is None:
                skipped += 1
            else:
                try:
                    vec = extract_feature_vector_from_url(media.url, features_version=features_version)
                except Exception as exc:
                    logger.warning('Skip media %s: %s', media.id, exc)
                    skipped += 1
                else:
                    if vec.shape[0] != feature_dim(features_version):
                        skipped += 1
                    else:
                        X_list.append(vec)
                        y_list.append(y)
            self._feature_progress(
                i, total, len(y_list), skipped, use_tty_progress, verbosity, milestone
            )

        if use_tty_progress:
            self.stdout.write('')
        elif verbosity >= 1 and total:
            self.stdout.write(
                self.style.NOTICE(
                    f'Features done: {total}/{total} scanned, {len(y_list)} kept, {skipped} skipped.'
                )
            )

        if len(y_list) < min_samples:
            raise CommandError(
                f'Need at least {min_samples} usable labeled images; got {len(y_list)} (skipped {skipped}).'
            )

        X = np.vstack(X_list)
        y = np.array(y_list, dtype=np.int64)
        pos = int(np.sum(y == 1))
        neg = int(np.sum(y == 0))
        if verbosity >= 1:
            self.stdout.write(self.style.NOTICE(f'Class balance: positives={pos}, negatives={neg}'))
        if pos < min_per_class or neg < min_per_class:
            raise CommandError(
                f'Not enough samples per class after filtering: positives={pos}, negatives={neg} '
                f'(min-per-class={min_per_class}).'
            )

        pipe, metrics = train_pipeline(X, y, test_size=test_size)
        model_path, meta_path = save_artifact(
            pipe,
            metrics,
            out_dir,
            model_version,
            len(y_list),
            features_version=features_version,
            feature_names=feature_names(features_version),
            class_counts={'positive': pos, 'negative': neg},
        )

        self.stdout.write(self.style.SUCCESS(f'Saved model to {model_path}'))
        self.stdout.write(self.style.SUCCESS(f'Meta written to {meta_path}'))
        self.stdout.write(f'Accuracy: {metrics["accuracy"]:.4f}')
        self.stdout.write(f'Precision (macro): {metrics["precision_macro"]:.4f}')
        self.stdout.write(f'Recall (macro): {metrics["recall_macro"]:.4f}')
        self.stdout.write(f'F1 (macro): {metrics["f1_macro"]:.4f}')
        self.stdout.write(f'Confusion matrix: {metrics["confusion_matrix"]}')
        self.stdout.write(f'Usable samples: {len(y_list)}, skipped: {skipped}')

    def _feature_progress(
        self,
        current: int,
        total: int,
        kept: int,
        skipped: int,
        use_tty_progress: bool,
        verbosity: int,
        milestone: int,
    ) -> None:
        if verbosity < 1 or not total:
            return
        msg = f'Features {current}/{total} (kept {kept}, skipped {skipped})'
        if use_tty_progress:
            # Clear to end of line so shrinking counts do not leave junk on screen.
            self.stdout.write(f'\r\x1b[K{msg}', ending='')
            self.stdout.flush()
        elif current == total or current % milestone == 0:
            self.stdout.write(self.style.NOTICE(msg))

"""Fit sklearn pipeline on feature matrix."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

def train_pipeline(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.2,
    random_state: int = 42,
) -> Tuple[Pipeline, Dict[str, Any]]:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )
    pipe = Pipeline(
        [
            ('scaler', StandardScaler()),
            (
                'clf',
                LogisticRegression(
                    max_iter=500,
                    class_weight='balanced',
                    random_state=random_state,
                ),
            ),
        ]
    )
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='macro', zero_division=0)
    metrics: Dict[str, Any] = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'precision_macro': float(p),
        'recall_macro': float(r),
        'f1_macro': float(f1),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
        'test_size': len(y_test),
        'train_size': len(y_train),
    }
    return pipe, metrics


def save_artifact(
    pipeline: Pipeline,
    metrics: Dict[str, Any],
    output_dir: Path,
    model_version: str,
    n_train_samples: int,
    *,
    features_version: str,
    feature_names: list[str],
    class_counts: Dict[str, int],
) -> Tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    safe_version = model_version.replace('/', '_')
    model_path = output_dir / f'model-{safe_version}.joblib'
    meta_path = output_dir / f'model-{safe_version}.meta.json'
    metrics_path = output_dir / f'model-{safe_version}.metrics.json'
    bundle = {
        'pipeline': pipeline,
        'model_version': model_version,
        'features_version': features_version,
        'feature_names': feature_names,
        'positive_label': 1,
        'negative_label': 0,
    }
    joblib.dump(bundle, model_path)
    meta = {
        'model_version': model_version,
        'features_version': features_version,
        'feature_names': feature_names,
        'class_counts': class_counts,
        'metrics': metrics,
        'n_train_samples': n_train_samples,
        'sklearn': sklearn.__version__,
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding='utf-8')
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding='utf-8')
    return model_path, meta_path

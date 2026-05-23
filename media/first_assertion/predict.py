"""Load artifact and produce approve/reject + confidence."""

from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np

from media.models import MediaPrediction


def load_bundle(artifact_path: Path) -> Dict[str, Any]:
    return joblib.load(artifact_path)


def predict_for_features(bundle: Dict[str, Any], feature_vector: np.ndarray) -> Tuple[str, float]:
    """
    Returns (predicted_review_type for MediaPrediction, confidence in [0,1]).
    """
    pipe = bundle['pipeline']
    x = feature_vector.reshape(1, -1)
    proba = pipe.predict_proba(x)[0]
    pred = int(pipe.predict(x)[0])
    confidence = float(np.max(proba))
    pred_type = MediaPrediction.APPROVED if pred == 1 else MediaPrediction.REJECTED
    return pred_type, confidence

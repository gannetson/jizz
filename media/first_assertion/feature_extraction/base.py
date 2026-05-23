from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Protocol

import numpy as np


@dataclass(frozen=True)
class ExtractorInput:
    image_bytes: bytes
    url: Optional[str] = None
    file_size_bytes: Optional[int] = None


class FeatureExtractor(Protocol):
    features_version: str

    def feature_names(self) -> list[str]:
        ...

    def extract(self, inp: ExtractorInput) -> np.ndarray:
        ...


class UnreadableImageError(ValueError):
    """Raised when image bytes cannot be decoded into a supported image."""


def ensure_1d_float64(vec: np.ndarray) -> np.ndarray:
    vec = np.asarray(vec, dtype=np.float64)
    if vec.ndim != 1:
        raise ValueError('feature vector must be 1D')
    if not np.all(np.isfinite(vec)):
        raise ValueError('feature vector contains non-finite values')
    return vec


def names_to_dim(names: Iterable[str]) -> int:
    n = list(names)
    if len(n) != len(set(n)):
        raise ValueError('feature names must be unique')
    return len(n)


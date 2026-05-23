from __future__ import annotations

from typing import Iterable, Protocol

from jizz.services.ebird_frequency.types import MonthlyFrequencyRow


class MonthlyFrequencySource(Protocol):
    def fetch(
        self,
        country_code: str,
        year: int,
        months: list[int],
    ) -> Iterable[MonthlyFrequencyRow]:
        ...

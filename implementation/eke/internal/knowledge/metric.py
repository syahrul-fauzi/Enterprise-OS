#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Metric
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Union
from enum import Enum
from .base import KnowledgeElement


class MetricCategory(Enum):
    OWNERSHIP = "ownership"
    COVERAGE = "coverage"
    ARCHITECTURE = "architecture"
    COMPLIANCE = "compliance"
    GOVERNANCE = "governance"
    RISK = "risk"
    LIFECYCLE = "lifecycle"
    PLANNING = "planning"


@dataclass(kw_only=True)
class Metric(KnowledgeElement):
    value: Union[int, float, bool, str]
    unit: Optional[str] = None
    category: Optional[MetricCategory] = None
    computed_by: Optional[str] = None

    @property
    def name(self):
        """Alias for title for backward compatibility."""
        return self.title

    @name.setter
    def name(self, value):
        self.title = value

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "name": self.title,  # Backward compatibility
            "value": self.value,
            "unit": self.unit,
            "category": self.category.value if self.category else None,
            "computed_by": self.computed_by
        })
        return base_dict

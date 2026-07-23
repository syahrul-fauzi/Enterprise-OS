#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Recommendation
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum
from .base import KnowledgeElement


class RecommendationPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(kw_only=True)
class Recommendation(KnowledgeElement):
    priority: RecommendationPriority
    applies_to: List[str] = field(default_factory=list)
    generated_by: Optional[str] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "priority": self.priority.value,
            "applies_to": self.applies_to,
            "generated_by": self.generated_by
        })
        return base_dict

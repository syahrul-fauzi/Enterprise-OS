#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Evidence
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Evidence:
    relationship_ids: List[str] = field(default_factory=list)
    object_ids: List[str] = field(default_factory=list)
    metrics: List[str] = field(default_factory=list)  # or list of Metric objects later
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "relationship_ids": self.relationship_ids,
            "object_ids": self.object_ids,
            "metrics": self.metrics,
            "notes": self.notes
        }

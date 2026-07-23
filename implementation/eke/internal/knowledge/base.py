#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Base Elements
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Any
from enum import Enum


@dataclass(kw_only=True)
class KnowledgeElement:
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    provenance: Optional[Any] = None
    tags: List[str] = field(default_factory=list)
    created_by: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "title": self.title,
            "timestamp": self.timestamp.isoformat()
        }
        if self.description is not None:
            result["description"] = self.description
        if self.category is not None:
            result["category"] = self.category.value if hasattr(self.category, "value") else self.category
        if self.severity is not None:
            result["severity"] = self.severity.value if hasattr(self.severity, "value") else self.severity
        if self.provenance is not None:
            result["provenance"] = self.provenance.to_dict() if hasattr(self.provenance, "to_dict") else self.provenance
        if self.tags:
            result["tags"] = self.tags
        if self.created_by is not None:
            result["created_by"] = self.created_by
        if self.confidence is not None:
            result["confidence"] = self.confidence
        return result

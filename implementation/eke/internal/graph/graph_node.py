#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Graph Node
Canonical graph node representing an enterprise object.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, Optional


@dataclass
class GraphNode:
    id: str
    type: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "attributes": self.attributes,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GraphNode":
        return cls(
            id=data["id"],
            type=data["type"],
            attributes=data.get("attributes", {}),
            metadata=data.get("metadata", {})
        )

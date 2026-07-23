#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Graph Edge
Canonical graph edge representing a semantic relationship.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, Optional


@dataclass
class GraphEdge:
    id: str
    source_id: str
    target_id: str
    relationship_type: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relationship_type": self.relationship_type,
            "attributes": self.attributes,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GraphEdge":
        return cls(
            id=data["id"],
            source_id=data["source_id"],
            target_id=data["target_id"],
            relationship_type=data["relationship_type"],
            attributes=data.get("attributes", {}),
            metadata=data.get("metadata", {})
        )

#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Graph Metadata
Metadata container for Canonical Graph.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime


@dataclass
class GraphMetadata:
    model_name: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    graph_version: str = "1.0"
    additional_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "created_at": self.created_at,
            "graph_version": self.graph_version,
            "additional_metadata": self.additional_metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GraphMetadata":
        return cls(
            model_name=data["model_name"],
            created_at=data.get("created_at", datetime.utcnow().isoformat() + "Z"),
            graph_version=data.get("graph_version", "1.0"),
            additional_metadata=data.get("additional_metadata", {})
        )

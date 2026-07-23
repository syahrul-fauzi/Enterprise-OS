#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Artifact Framework
Unified abstraction for compiler outputs.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional, Dict


class ArtifactKind(Enum):
    CANONICAL_GRAPH = "canonical_graph"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    CONSTRAINT_REPORT = "constraint_report"
    REASONING_REPORT = "reasoning_report"
    ENTERPRISE_IR = "enterprise_ir"
    BOUND_MODEL = "bound_model"


@dataclass
class ArtifactMetadata:
    name: str
    kind: ArtifactKind
    version: str
    generated_by: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    depends_on: List[str] = field(default_factory=list)
    generated_from: List[str] = field(default_factory=list)


@dataclass
class Artifact:
    metadata: ArtifactMetadata
    payload: Any

    def to_dict(self) -> dict:
        payload_dict = None
        if hasattr(self.payload, "to_dict"):
            payload_dict = self.payload.to_dict()
        elif isinstance(self.payload, (dict, list, str, int, float, bool, type(None))):
            payload_dict = self.payload
        else:
            payload_dict = repr(self.payload)
        return {
            "metadata": {
                "name": self.metadata.name,
                "kind": self.metadata.kind.value,
                "version": self.metadata.version,
                "generated_by": self.metadata.generated_by,
                "created_at": self.metadata.created_at.isoformat(),
                "depends_on": self.metadata.depends_on,
                "generated_from": self.metadata.generated_from
            },
            "payload": payload_dict
        }


class ArtifactRegistry:
    def __init__(self):
        self._artifacts: Dict[str, Artifact] = {}
        self._kind_to_artifacts: Dict[ArtifactKind, List[Artifact]] = {}

    def add(self, artifact: Artifact):
        self._artifacts[artifact.metadata.name] = artifact
        if artifact.metadata.kind not in self._kind_to_artifacts:
            self._kind_to_artifacts[artifact.metadata.kind] = []
        self._kind_to_artifacts[artifact.metadata.kind].append(artifact)

    def get(self, name: str) -> Optional[Artifact]:
        return self._artifacts.get(name)

    def find_by_kind(self, kind: ArtifactKind) -> List[Artifact]:
        return self._kind_to_artifacts.get(kind, [])

    def all(self) -> List[Artifact]:
        return list(self._artifacts.values())

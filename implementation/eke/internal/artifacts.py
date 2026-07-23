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
from eke.knowledge import Finding, Metric, Recommendation, Evidence, Provenance, FindingCategory, FindingSeverity, MetricCategory
from eke.knowledge_graph import KnowledgeEdge
from eke.rules import RuleMetadata


class ArtifactKind(Enum):
    CANONICAL_GRAPH = "canonical_graph"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    CONSTRAINT_REPORT = "constraint_report"
    REASONING_REPORT = "reasoning_report"
    ENTERPRISE_IR = "enterprise_ir"
    BOUND_MODEL = "bound_model"
    KNOWLEDGE_PACKAGE = "knowledge_package"
    REASONING_CATALOG = "reasoning_catalog"
    ENTERPRISE_INTELLIGENCE_PACKAGE = "enterprise_intelligence_package"
    GOVERNANCE_DASHBOARD = "governance_dashboard"
    RISK_REGISTER = "risk_register"
    PLANNING_ROADMAP = "planning_roadmap"
    LIFECYCLE_DASHBOARD = "lifecycle_dashboard"
    COMPLIANCE_DASHBOARD = "compliance_dashboard"


@dataclass
class CatalogEntry:
    rule_id: str
    name: str
    domain: str
    type: str
    depends_on: List[str]
    produces: List[str]
    description: str = ""
    version: str = ""


@dataclass
class ReasoningCatalog:
    """Catalog of all reasoning rules in the system"""
    rules: List[CatalogEntry] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return [
            {
                "rule_id": entry.rule_id,
                "name": entry.name,
                "domain": entry.domain,
                "type": entry.type,
                "depends_on": entry.depends_on,
                "produces": entry.produces,
                "description": entry.description,
                "version": entry.version
            }
            for entry in self.rules
        ]


@dataclass
class KnowledgePackage:
    """
    Portable artifact containing pieces of the KnowledgeGraph:
    inferred relationships, findings, metrics, etc.
    """
    inferred_relationships: List[KnowledgeEdge] = field(default_factory=list)
    findings: List[Finding] = field(default_factory=list)
    metrics: List[Metric] = field(default_factory=list)
    recommendations: List[Recommendation] = field(default_factory=list)
    provenance: Dict[str, Any] = field(default_factory=dict)
    execution_metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        def edge_to_dict(edge: KnowledgeEdge) -> Dict[str, Any]:
            return {
                "id": edge.id,
                "source_id": edge.source_id,
                "target_id": edge.target_id,
                "relationship_type": edge.relationship_type,
                "attributes": edge.attributes,
                "is_inferred": edge.is_inferred,
                "provenance": edge.provenance.to_dict() if edge.provenance else None
            }
        
        return {
            "inferred_relationships": [edge_to_dict(e) for e in self.inferred_relationships],
            "findings": [f.to_dict() for f in self.findings],
            "metrics": [m.to_dict() for m in self.metrics],
            "recommendations": [r.to_dict() for r in self.recommendations],
            "provenance": self.provenance,
            "execution_metadata": self.execution_metadata
        }


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

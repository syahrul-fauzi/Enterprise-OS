#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Knowledge Graph
Canonical semantic output after reasoning
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from .knowledge import (
    Provenance,
    Finding,
    FindingSeverity,
    Metric,
    Recommendation
)


@dataclass
class KnowledgeNodeMetadata:
    model_name: str
    generated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "generated_at": self.generated_at.isoformat()
        }


@dataclass
class KnowledgeNode:
    id: str
    type: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Optional[KnowledgeNodeMetadata] = None
    is_inferred: bool = False
    provenance: Optional[Provenance] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "attributes": self.attributes,
            "metadata": self.metadata.to_dict() if self.metadata else None,
            "is_inferred": self.is_inferred,
            "provenance": self.provenance.to_dict() if self.provenance else None
        }


@dataclass
class KnowledgeEdge:
    id: str
    source_id: str
    target_id: str
    relationship_type: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Optional[KnowledgeNodeMetadata] = None
    is_inferred: bool = False
    provenance: Optional[Provenance] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relationship_type": self.relationship_type,
            "attributes": self.attributes,
            "metadata": self.metadata.to_dict() if self.metadata else None,
            "is_inferred": self.is_inferred,
            "provenance": self.provenance.to_dict() if self.provenance else None
        }


@dataclass
class KnowledgeGraphMetadata:
    model_name: str
    generated_at: datetime = field(default_factory=datetime.now)
    constraint_report_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "generated_at": self.generated_at.isoformat(),
            "constraint_report_hash": self.constraint_report_hash
        }


@dataclass
class KnowledgeGraph:
    metadata: KnowledgeGraphMetadata
    declared_nodes: Dict[str, KnowledgeNode] = field(default_factory=dict)
    declared_edges: Dict[str, KnowledgeEdge] = field(default_factory=dict)
    inferred_nodes: Dict[str, KnowledgeNode] = field(default_factory=dict)
    inferred_edges: Dict[str, KnowledgeEdge] = field(default_factory=dict)
    findings: List[Finding] = field(default_factory=list)
    metrics: List[Metric] = field(default_factory=list)
    recommendations: List[Recommendation] = field(default_factory=list)

    def add_declared_node(self, node: KnowledgeNode):
        self.declared_nodes[node.id] = node

    def add_declared_edge(self, edge: KnowledgeEdge):
        self.declared_edges[edge.id] = edge

    def add_inferred_node(self, node: KnowledgeNode):
        self.inferred_nodes[node.id] = node

    def add_inferred_edge(self, edge: KnowledgeEdge):
        self.inferred_edges[edge.id] = edge

    def add_finding(self, finding: Finding):
        self.findings.append(finding)

    def add_metric(self, metric: Metric):
        # Remove existing metric with the same name if present
        self.metrics = [m for m in self.metrics if m.name != metric.name]
        self.metrics.append(metric)
        
    def add_recommendation(self, recommendation: Recommendation):
        self.recommendations.append(recommendation)

    @property
    def all_nodes(self) -> Dict[str, KnowledgeNode]:
        nodes = {}
        nodes.update(self.declared_nodes)
        nodes.update(self.inferred_nodes)
        return nodes

    @property
    def all_edges(self) -> Dict[str, KnowledgeEdge]:
        edges = {}
        edges.update(self.declared_edges)
        edges.update(self.inferred_edges)
        return edges
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "metadata": self.metadata.to_dict(),
            "declared_nodes": {k: v.to_dict() for k, v in self.declared_nodes.items()},
            "declared_edges": {k: v.to_dict() for k, v in self.declared_edges.items()},
            "inferred_nodes": {k: v.to_dict() for k, v in self.inferred_nodes.items()},
            "inferred_edges": {k: v.to_dict() for k, v in self.inferred_edges.items()},
            "findings": [f.to_dict() for f in self.findings],
            "metrics": [m.to_dict() for m in self.metrics],
            "recommendations": [r.to_dict() for r in self.recommendations]
        }

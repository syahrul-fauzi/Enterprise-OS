#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Knowledge Graph
Contains both declared and inferred knowledge with provenance.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional
from eke.graph import GraphNode, GraphEdge, GraphMetadata
from eke.ir import Provenance


class FindingSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class Finding:
    id: str
    rule_id: str
    rule_version: str
    severity: FindingSeverity
    message: str
    affected_object_ids: List[str] = field(default_factory=list)
    affected_relationship_ids: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Metric:
    name: str
    value: Any
    unit: Optional[str] = None
    description: Optional[str] = None


@dataclass
class KnowledgeNode(GraphNode):
    is_inferred: bool = False
    provenance: Optional[Provenance] = None


@dataclass
class KnowledgeEdge(GraphEdge):
    is_inferred: bool = False
    provenance: Optional[Provenance] = None


@dataclass
class KnowledgeGraphMetadata(GraphMetadata):
    generated_at: datetime = field(default_factory=datetime.utcnow)
    constraint_report_hash: Optional[str] = None


@dataclass
class KnowledgeGraph:
    declared_nodes: Dict[str, KnowledgeNode] = field(default_factory=dict)
    declared_edges: Dict[str, KnowledgeEdge] = field(default_factory=dict)
    inferred_nodes: Dict[str, KnowledgeNode] = field(default_factory=dict)
    inferred_edges: Dict[str, KnowledgeEdge] = field(default_factory=dict)
    findings: List[Finding] = field(default_factory=list)
    metrics: List[Metric] = field(default_factory=list)
    metadata: KnowledgeGraphMetadata = field(default_factory=KnowledgeGraphMetadata)

    @property
    def all_nodes(self) -> Dict[str, KnowledgeNode]:
        return {**self.declared_nodes, **self.inferred_nodes}

    @property
    def all_edges(self) -> Dict[str, KnowledgeEdge]:
        return {**self.declared_edges, **self.inferred_edges}

    def add_declared_node(self, node: KnowledgeNode):
        self.declared_nodes[node.id] = node

    def add_declared_edge(self, edge: KnowledgeEdge):
        self.declared_edges[edge.id] = edge

    def add_inferred_node(self, node: KnowledgeNode):
        self.inferred_nodes[node.id] = node

    def add_inferred_edge(self, edge: KnowledgeEdge):
        self.inferred_edges[edge.id] = edge

    def get_node(self, node_id: str) -> Optional[KnowledgeNode]:
        return self.all_nodes.get(node_id)

    def get_edge(self, edge_id: str) -> Optional[KnowledgeEdge]:
        return self.all_edges.get(edge_id)

    def add_finding(self, finding: Finding):
        self.findings.append(finding)

    def add_metric(self, metric: Metric):
        # Remove existing metric with the same name if present
        self.metrics = [m for m in self.metrics if m.name != metric.name]
        self.metrics.append(metric)

    def to_dict(self) -> Dict[str, Any]:
        def node_to_dict(node: KnowledgeNode) -> Dict[str, Any]:
            return {
                "id": node.id,
                "type": node.type,
                "attributes": node.attributes,
                "is_inferred": node.is_inferred,
                "provenance": {
                    "rule_id": node.provenance.rule_id,
                    "rule_version": node.provenance.rule_version,
                    "sources": node.provenance.sources,
                    "timestamp": node.provenance.timestamp.isoformat(),
                    "confidence": node.provenance.confidence,
                    "explanation": node.provenance.explanation
                } if node.provenance else None
            }

        def edge_to_dict(edge: KnowledgeEdge) -> Dict[str, Any]:
            return {
                "id": edge.id,
                "source_id": edge.source_id,
                "target_id": edge.target_id,
                "relationship_type": edge.relationship_type,
                "attributes": edge.attributes,
                "is_inferred": edge.is_inferred,
                "provenance": {
                    "rule_id": edge.provenance.rule_id,
                    "rule_version": edge.provenance.rule_version,
                    "sources": edge.provenance.sources,
                    "timestamp": edge.provenance.timestamp.isoformat(),
                    "confidence": edge.provenance.confidence,
                    "explanation": edge.provenance.explanation
                } if edge.provenance else None
            }

        return {
            "declared_nodes": [node_to_dict(n) for n in self.declared_nodes.values()],
            "declared_edges": [edge_to_dict(e) for e in self.declared_edges.values()],
            "inferred_nodes": [node_to_dict(n) for n in self.inferred_nodes.values()],
            "inferred_edges": [edge_to_dict(e) for e in self.inferred_edges.values()],
            "findings": [
                {
                    "id": f.id,
                    "rule_id": f.rule_id,
                    "rule_version": f.rule_version,
                    "severity": f.severity.value,
                    "message": f.message,
                    "affected_object_ids": f.affected_object_ids,
                    "affected_relationship_ids": f.affected_relationship_ids,
                    "timestamp": f.timestamp.isoformat()
                } for f in self.findings
            ],
            "metrics": [
                {
                    "name": m.name,
                    "value": m.value,
                    "unit": m.unit,
                    "description": m.description
                } for m in self.metrics
            ],
            "metadata": {
                "model_name": self.metadata.model_name,
                "created_at": (
                    self.metadata.created_at 
                    if isinstance(self.metadata.created_at, str) 
                    else self.metadata.created_at.isoformat()
                ),
                "graph_version": self.metadata.graph_version,
                "generated_at": (
                    self.metadata.generated_at 
                    if isinstance(self.metadata.generated_at, str) 
                    else self.metadata.generated_at.isoformat()
                ),
                "constraint_report_hash": self.metadata.constraint_report_hash
            }
        }

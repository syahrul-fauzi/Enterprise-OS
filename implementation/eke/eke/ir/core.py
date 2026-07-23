#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Intermediate Representation (IR)
Stable interface between graph construction and projections.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional
from eke.graph import CanonicalGraph, GraphNode, GraphEdge


@dataclass
class Provenance:
    rule_id: str
    rule_version: str
    sources: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    confidence: float = 1.0
    explanation: Optional[str] = None


@dataclass
class IRObject:
    id: str
    type: str
    name: str
    description: Optional[str] = None
    state: Optional[str] = None
    authority: Optional[str] = None
    owner: Optional[str] = None
    evidence: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IRRelationship:
    id: str
    type: str
    source: str
    target: str
    evidence: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    provenance: Optional[Provenance] = None


@dataclass
class EnterpriseIR:
    objects: Dict[str, IRObject] = field(default_factory=dict)
    relationships: Dict[str, IRRelationship] = field(default_factory=dict)

    # Query API methods for EnterpriseIR
    def get_object(self, obj_id: str) -> Optional[IRObject]:
        return self.objects.get(obj_id)

    def find_objects(self, type: Optional[str] = None) -> List[IRObject]:
        if type:
            return [obj for obj in self.objects.values() if obj.type == type]
        return list(self.objects.values())

    def find_relationships(self, type: Optional[str] = None) -> List[IRRelationship]:
        if type:
            return [rel for rel in self.relationships.values() if rel.type == type]
        return list(self.relationships.values())

    def outgoing_relationships(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRRelationship]:
        obj_id = obj.id
        if rel_type:
            return [rel for rel in self.relationships.values() if rel.source == obj_id and rel.type == rel_type]
        return [rel for rel in self.relationships.values() if rel.source == obj_id]

    def incoming_relationships(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRRelationship]:
        obj_id = obj.id
        if rel_type:
            return [rel for rel in self.relationships.values() if rel.target == obj_id and rel.type == rel_type]
        return [rel for rel in self.relationships.values() if rel.target == obj_id]

    def successors(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRObject]:
        outgoing = self.outgoing_relationships(obj, rel_type)
        return [self.get_object(rel.target) for rel in outgoing if self.get_object(rel.target)]

    def predecessors(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRObject]:
        incoming = self.incoming_relationships(obj, rel_type)
        return [self.get_object(rel.source) for rel in incoming if self.get_object(rel.source)]


def build_ir_from_graph(graph: CanonicalGraph) -> EnterpriseIR:
    ir = EnterpriseIR()

    # Convert objects
    for obj_id, node in graph.nodes.items():
        ir_obj = IRObject(
            id=node.id,
            type=node.type,
            name=node.attributes.get("canonical", {}).get("name", ""),
            description=node.attributes.get("canonical", {}).get("description"),
            state=node.attributes.get("canonical", {}).get("state"),
            authority=node.attributes.get("canonical", {}).get("authority"),
            owner=node.attributes.get("canonical", {}).get("owner"),
            evidence=node.attributes.get("canonical", {}).get("evidence", []),
            constraints=node.attributes.get("canonical", {}).get("constraints", []),
            metadata=node.metadata
        )
        ir.objects[obj_id] = ir_obj

    # Convert relationships
    for rel_id, edge in graph.edges.items():
        ir_rel = IRRelationship(
            id=edge.id,
            type=edge.relationship_type,
            source=edge.source_id,
            target=edge.target_id,
            evidence=edge.attributes.get("relationship", {}).get("evidence", []),
            constraints=edge.attributes.get("relationship", {}).get("constraints", []),
            metadata=edge.metadata
        )
        ir.relationships[rel_id] = ir_rel

    return ir

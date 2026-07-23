#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Canonical Graph
The central semantic graph representation for enterprise knowledge.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Iterable
from .graph_node import GraphNode
from .graph_edge import GraphEdge
from .graph_metadata import GraphMetadata
import json


@dataclass
class CanonicalGraph:
    metadata: GraphMetadata
    nodes: Dict[str, GraphNode] = field(default_factory=dict)
    edges: Dict[str, GraphEdge] = field(default_factory=dict)

    def add_node(self, node: GraphNode):
        if node.id:
            self.nodes[node.id] = node

    def add_edge(self, edge: GraphEdge):
        if edge.id:
            self.edges[edge.id] = edge

    # Query API methods
    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.nodes.get(node_id)

    def find_nodes(self, type: Optional[str] = None) -> List[GraphNode]:
        if type:
            return [node for node in self.nodes.values() if node.type == type]
        return list(self.nodes.values())

    def find_edges(self, type: Optional[str] = None) -> List[GraphEdge]:
        if type:
            return [edge for edge in self.edges.values() if edge.relationship_type == type]
        return list(self.edges.values())

    def outgoing(self, node: GraphNode, edge_type: Optional[str] = None) -> List[GraphEdge]:
        node_id = node.id
        if edge_type:
            return [edge for edge in self.edges.values() if edge.source_id == node_id and edge.relationship_type == edge_type]
        return [edge for edge in self.edges.values() if edge.source_id == node_id]

    def incoming(self, node: GraphNode, edge_type: Optional[str] = None) -> List[GraphEdge]:
        node_id = node.id
        if edge_type:
            return [edge for edge in self.edges.values() if edge.target_id == node_id and edge.relationship_type == edge_type]
        return [edge for edge in self.edges.values() if edge.target_id == node_id]

    def successors(self, node: GraphNode, edge_type: Optional[str] = None) -> List[GraphNode]:
        outgoing_edges = self.outgoing(node, edge_type)
        return [self.get_node(edge.target_id) for edge in outgoing_edges if self.get_node(edge.target_id)]

    def predecessors(self, node: GraphNode, edge_type: Optional[str] = None) -> List[GraphNode]:
        incoming_edges = self.incoming(node, edge_type)
        return [self.get_node(edge.source_id) for edge in incoming_edges if self.get_node(edge.source_id)]

    def neighbors(self, node: GraphNode) -> List[GraphNode]:
        preds = self.predecessors(node)
        succs = self.successors(node)
        # Combine and deduplicate
        seen = set()
        combined = []
        for n in preds + succs:
            if n.id not in seen:
                seen.add(n.id)
                combined.append(n)
        return combined

    # Graph invariants check
    def validate_invariants(self) -> List[str]:
        violations = []

        # Invariant 1: All node IDs are unique (by construction, but just verify)
        node_ids = set(self.nodes.keys())
        if len(node_ids) != len(self.nodes):
            violations.append("Duplicate node IDs found")

        # Invariant 2: All edge IDs are unique (by construction, verify)
        edge_ids = set(self.edges.keys())
        if len(edge_ids) != len(self.edges):
            violations.append("Duplicate edge IDs found")

        # Invariant 3: Every edge references existing source and target nodes
        for edge_id, edge in self.edges.items():
            if edge.source_id not in self.nodes:
                violations.append(f"Edge {edge_id} references missing source node: {edge.source_id}")
            if edge.target_id not in self.nodes:
                violations.append(f"Edge {edge_id} references missing target node: {edge.target_id}")

        # Invariant 4: No self-loops (source == target)
        for edge_id, edge in self.edges.items():
            if edge.source_id == edge.target_id:
                violations.append(f"Edge {edge_id} is a self-loop: {edge.source_id} -> {edge.target_id}")

        # Invariant 5: Graph metadata is always present
        if not self.metadata:
            violations.append("Graph metadata is missing")

        return violations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metadata": self.metadata.to_dict(),
            "nodes": {node_id: node.to_dict() for node_id, node in self.nodes.items()},
            "edges": {edge_id: edge.to_dict() for edge_id, edge in self.edges.items()}
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CanonicalGraph":
        metadata = GraphMetadata.from_dict(data["metadata"])
        graph = cls(metadata=metadata)
        for node_id, node_data in data.get("nodes", {}).items():
            graph.add_node(GraphNode.from_dict(node_data))
        for edge_id, edge_data in data.get("edges", {}).items():
            graph.add_edge(GraphEdge.from_dict(edge_data))
        return graph

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_json(cls, json_str: str) -> "CanonicalGraph":
        return cls.from_dict(json.loads(json_str))

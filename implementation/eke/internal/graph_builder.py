#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Graph Builder Pass
Creates CanonicalGraph from BoundModel and serializes it.
"""
from __future__ import annotations
import json
from pathlib import Path
from eke.base import CompilerPass, CompilerContext
from eke.bound_model import BoundModel, BoundObject, BoundRelationship
from eke.graph import CanonicalGraph, GraphNode, GraphEdge, GraphMetadata


class GraphBuilderPass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Building Canonical Object Graph...")
        bound_model: BoundModel = context.bound_model

        model_name = (
            context.manifest.get("metadata", {}).get("name")
            or context.manifest.get("package", {}).get("name")
            or "unknown-model"
        )

        # Create canonical graph
        graph = CanonicalGraph(
            metadata=GraphMetadata(model_name=model_name)
        )

        # Step 1: Add all objects as graph nodes
        for obj_id, bound_obj in bound_model.objects.items():
            node = self._bound_object_to_node(bound_obj)
            graph.add_node(node)
        print(f"  ✅ Added {len(graph.nodes)} nodes to graph")

        # Step 2: Add all relationships as graph edges
        for rel_id, bound_rel in bound_model.relationships.items():
            edge = self._bound_relationship_to_edge(bound_rel)
            graph.add_edge(edge)
        print(f"  ✅ Added {len(graph.edges)} edges to graph")

        # Step 3: Validate graph invariants
        invariant_violations = graph.validate_invariants()
        if invariant_violations:
            for violation in invariant_violations:
                context.diagnostics.error(code="EKL-5001", message=violation)
            return False

        context.canonical_graph = graph

        # Step 4: Serialize graph to JSON
        self._serialize_graph(context, graph)

        return True

    def _bound_object_to_node(self, bound_obj: BoundObject) -> GraphNode:
        return GraphNode(
            id=bound_obj.id,
            type=bound_obj.type,
            attributes=bound_obj.data,
            metadata=bound_obj.data.get("metadata", {})
        )

    def _bound_relationship_to_edge(self, bound_rel: BoundRelationship) -> GraphEdge:
        return GraphEdge(
            id=bound_rel.id,
            source_id=bound_rel.source_id,
            target_id=bound_rel.target_id,
            relationship_type=bound_rel.type,
            attributes=bound_rel.data,
            metadata=bound_rel.data.get("metadata", {})
        )

    def _serialize_graph(self, context: CompilerContext, graph: CanonicalGraph):
        output_dir = Path(__file__).parent.parent / "output"
        output_dir.mkdir(exist_ok=True)
        graph_path = output_dir / "canonical-graph.json"
        with open(graph_path, "w") as f:
            f.write(graph.to_json())

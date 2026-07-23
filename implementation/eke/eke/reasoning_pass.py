#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Reasoning Pass
Infers derived relationships and builds the canonical KnowledgeGraph.
"""
from eke.passes import CompilerPass, CompilerContext
from eke.ir import EnterpriseIR, IRObject, IRRelationship
from eke.reasoning import ReasoningEngine
from eke.knowledge_graph import (
    KnowledgeGraph, KnowledgeNode, KnowledgeEdge, Finding, FindingSeverity, Metric
)
from eke.artifacts import Artifact, ArtifactKind, ArtifactMetadata


def ir_object_to_knowledge_node(obj: IRObject, is_inferred: bool = False, provenance=None) -> KnowledgeNode:
    """Convert an IRObject to a KnowledgeNode."""
    return KnowledgeNode(
        id=obj.id,
        type=obj.type,
        attributes={
            "canonical": {
                "name": obj.name,
                "description": obj.description,
                "state": obj.state,
                "authority": obj.authority,
                "owner": obj.owner,
                "evidence": obj.evidence,
                "constraints": obj.constraints
            }
        },
        metadata=obj.metadata,
        is_inferred=is_inferred,
        provenance=provenance
    )


def ir_relationship_to_knowledge_edge(rel: IRRelationship, is_inferred: bool = False, provenance=None) -> KnowledgeEdge:
    """Convert an IRRelationship to a KnowledgeEdge."""
    return KnowledgeEdge(
        id=rel.id,
        source_id=rel.source,
        target_id=rel.target,
        relationship_type=rel.type,
        attributes={
            "relationship": {
                "evidence": rel.evidence,
                "constraints": rel.constraints
            }
        },
        metadata=rel.metadata,
        is_inferred=is_inferred,
        provenance=provenance
    )


class ReasoningPass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Running semantic reasoning...")
        ir = context.enterprise_ir
        if not ir:
            context.diagnostics.error(
                code="EKL-4001",
                message="No enterprise IR available to reason over"
            )
            return False

        # 1. Initialize KnowledgeGraph with declared nodes and edges from EnterpriseIR
        # Get model_name from canonical graph's metadata
        model_name = (
            context.canonical_graph.metadata.model_name
            if context.canonical_graph and context.canonical_graph.metadata
            else "unknown-model"
        )
        from eke.knowledge_graph import KnowledgeGraphMetadata
        kg_metadata = KnowledgeGraphMetadata(
            model_name=model_name,
            constraint_report_hash=None  # We can set this later if we have a hash
        )
        kg = KnowledgeGraph(metadata=kg_metadata)

        for obj_id, obj in ir.objects.items():
            kg.add_declared_node(ir_object_to_knowledge_node(obj))

        for rel_id, rel in ir.relationships.items():
            kg.add_declared_edge(ir_relationship_to_knowledge_edge(rel))

        # 2. Run reasoning engine to get inferred relationships and analysis
        engine = ReasoningEngine(ir)
        reasoning_results = engine.run_all()

        # 3. Process reasoning results
        added_inferred_edges = 0
        for result in reasoning_results:
            # Process inferred relationships
            for rel in result.inferred_relationships:
                inferred_edge = ir_relationship_to_knowledge_edge(rel, is_inferred=True, provenance=rel.provenance)
                kg.add_inferred_edge(inferred_edge)
                added_inferred_edges += 1

            # Process analysis data
            if result.analysis_data:
                # Handle OrphanDetectionRule (EKL-R-002)
                if result.rule_id == "EKL-R-002":
                    orphan_count = result.analysis_data.get("orphan_count", 0)
                    orphan_ids = result.analysis_data.get("orphan_ids", [])
                    if orphan_count > 0:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-orphans",
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            severity=FindingSeverity.WARNING,
                            message=f"Found {orphan_count} orphaned object(s): {', '.join(orphan_ids)}",
                            affected_object_ids=orphan_ids
                        )
                        kg.add_finding(finding)
                    # Add metric for total objects and orphans
                    total_objects = result.analysis_data.get("total_objects", 0)
                    kg.add_metric(Metric(name="total_objects", value=total_objects))
                    kg.add_metric(Metric(name="orphan_count", value=orphan_count, description="Number of orphaned objects"))
                # Handle OwnershipAnalysisRule (EKL-R-003)
                elif result.rule_id == "EKL-R-003":
                    # Process orphan capabilities
                    orphan_capabilities = result.analysis_data.get("orphan_capabilities", [])
                    if orphan_capabilities:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-orphan-capabilities",
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            severity=FindingSeverity.WARNING,
                            message=f"Found {len(orphan_capabilities)} orphaned capability(ies): {', '.join(orphan_capabilities)}",
                            affected_object_ids=orphan_capabilities
                        )
                        kg.add_finding(finding)

                    # Process multiple owners
                    multiple_owners = result.analysis_data.get("multiple_owners", [])
                    for item in multiple_owners:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-multiple-owners-{item['object_id']}",
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            severity=FindingSeverity.WARNING,
                            message=f"Object {item['object_id']} has {item['owner_count']} owners: {', '.join(item['owner_ids'])}",
                            affected_object_ids=[item["object_id"]] + item["owner_ids"]
                        )
                        kg.add_finding(finding)

                    # Process owner overload
                    owner_overload = result.analysis_data.get("owner_overload", [])
                    for item in owner_overload:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-owner-overload-{item['owner_id']}",
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            severity=FindingSeverity.WARNING,
                            message=f"Owner {item['owner_id']} owns {item['owned_count']} objects (threshold: {item['threshold']})",
                            affected_object_ids=[item["owner_id"]]
                        )
                        kg.add_finding(finding)

                    # Process ownership gaps
                    ownership_gaps = result.analysis_data.get("ownership_gaps", [])
                    if ownership_gaps:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-ownership-gaps",
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            severity=FindingSeverity.INFO,
                            message=f"Found {len(ownership_gaps)} actor(s) with no owned objects: {', '.join(ownership_gaps)}",
                            affected_object_ids=ownership_gaps
                        )
                        kg.add_finding(finding)

                    # Add all ownership metrics
                    metrics = result.analysis_data.get("metrics", {})
                    for metric_name, metric_value in metrics.items():
                        description = None
                        if metric_name == "total_objects":
                            description = "Total number of enterprise objects"
                        elif metric_name == "total_capabilities":
                            description = "Total number of business capabilities"
                        elif metric_name == "orphan_capability_count":
                            description = "Number of orphaned capabilities"
                        elif metric_name == "multiple_owner_count":
                            description = "Number of objects with multiple owners"
                        elif metric_name == "owner_overload_count":
                            description = "Number of overloaded owners"
                        elif metric_name == "ownership_gap_count":
                            description = "Number of actors with no owned objects"
                        elif metric_name == "total_actors":
                            description = "Total number of actors"
                        elif metric_name == "total_owners":
                            description = "Number of actors that own at least one object"
                        kg.add_metric(Metric(name=metric_name, value=metric_value, description=description))

        # 4. Set KnowledgeGraph in context
        context.knowledge_graph = kg

        # 5. Add KnowledgeGraph as an artifact
        kg_artifact = Artifact(
            metadata=ArtifactMetadata(
                name="knowledge_graph",
                kind=ArtifactKind.KNOWLEDGE_GRAPH,
                version="1.0.0",
                generated_by="ReasoningPass",
                depends_on=["enterprise_ir"],
                generated_from=["enterprise_ir"]
            ),
            payload=kg
        )
        context.artifacts.add(kg_artifact)

        print(f"  ✅ Inferred {added_inferred_edges} derived relationships")
        print(f"  ✅ Built KnowledgeGraph with {len(kg.all_nodes)} nodes and {len(kg.all_edges)} edges")
        print(f"  ✅ Added {len(kg.findings)} findings and {len(kg.metrics)} metrics")
        return True

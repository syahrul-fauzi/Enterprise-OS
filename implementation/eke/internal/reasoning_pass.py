#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKL) — Reasoning Pass
Infers derived relationships and builds the canonical KnowledgeGraph.
"""
from eke.passes import CompilerPass, CompilerContext
from eke.ir import EnterpriseIR, IRObject, IRRelationship
from eke.reasoning import ReasoningEngine
from eke.knowledge_graph import KnowledgeGraph, KnowledgeNode, KnowledgeEdge
from eke.knowledge import (
    Finding, FindingSeverity, FindingCategory,
    Metric, MetricCategory, Provenance
)
from eke.artifacts import Artifact, ArtifactKind, ArtifactMetadata, KnowledgePackage, ReasoningCatalog, CatalogEntry
from eke.reasoning import ReasoningEngine, default_reasoning_registry


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
        metadata=None,
        is_inferred=is_inferred,
        provenance=provenance
    )


def convert_ir_provenance(ir_prov) -> Provenance:
    """Convert IR Provenance to Knowledge Provenance."""
    return Provenance(
        rule_id=ir_prov.rule_id,
        rule_version=ir_prov.rule_version,
        sources=ir_prov.sources,
        timestamp=ir_prov.timestamp,
        confidence=ir_prov.confidence,
        explanation=ir_prov.explanation
    )


def ir_relationship_to_knowledge_edge(rel: IRRelationship, is_inferred: bool = False, provenance=None) -> KnowledgeEdge:
    """Convert an IRRelationship to a KnowledgeEdge."""
    if provenance and hasattr(provenance, "__class__") and provenance.__class__.__name__ == "Provenance" and not hasattr(provenance, "to_dict"):
        # Check if it's the IR provenance
        provenance = convert_ir_provenance(provenance)
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
        metadata=None,
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
        from eke.knowledge_graph import KnowledgeGraphMetadata
        model_name = (
            context.canonical_graph.metadata.model_name
            if context.canonical_graph and context.canonical_graph.metadata
            else "unknown-model"
        )
        kg_metadata = KnowledgeGraphMetadata(
            model_name=model_name,
            constraint_report_hash=None
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
                        # Get evidence
                        evidence_list = result.analysis_data.get("evidence", [])
                        evidence = evidence_list[0] if evidence_list else None
                        
                        # Get recommendation IDs
                        recommendation_ids = []
                        for rec in result.analysis_data.get("recommendations", []):
                            kg.add_recommendation(rec)
                            recommendation_ids.append(rec.id)
                        
                        finding = Finding(
                            id=f"finding-{result.rule_id}-orphans",
                            category=FindingCategory.ORPHAN,
                            severity=FindingSeverity.WARNING,
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            title="Orphaned Objects",
                            message=f"Found {orphan_count} orphaned object(s): {', '.join(orphan_ids)}",
                            related_objects=orphan_ids,
                            recommendation_ids=recommendation_ids,
                            evidence=evidence
                        )
                        kg.add_finding(finding)
                    kg.add_metric(Metric(
                        id="ekl-metric-001",
                        title="total_objects",
                        value=result.analysis_data.get("total_objects", 0),
                        category=MetricCategory.ARCHITECTURE,
                        description="Total number of enterprise objects"
                    ))
                    kg.add_metric(Metric(
                        id="ekl-metric-002",
                        title="orphan_count",
                        value=orphan_count,
                        category=MetricCategory.ARCHITECTURE,
                        description="Number of orphaned objects"
                    ))
                # Handle OwnershipAnalysisRule (EKL-R-003)
                elif result.rule_id == "EKL-R-003":
                    # Process orphan capabilities
                    orphan_capabilities = result.analysis_data.get("orphan_capabilities", [])
                    if orphan_capabilities:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-orphan-capabilities",
                            category=FindingCategory.OWNERSHIP,
                            severity=FindingSeverity.WARNING,
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            title="Orphaned Capabilities",
                            message=f"Found {len(orphan_capabilities)} orphaned capability(ies): {', '.join(orphan_capabilities)}",
                            related_objects=orphan_capabilities
                        )
                        kg.add_finding(finding)
                    # Process multiple owners
                    multiple_owners = result.analysis_data.get("multiple_owners", [])
                    for item in multiple_owners:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-multiple-owners-{item['object_id']}",
                            category=FindingCategory.OWNERSHIP,
                            severity=FindingSeverity.WARNING,
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            title="Multiple Owners",
                            message=f"Object {item['object_id']} has {item['owner_count']} owners: {', '.join(item['owner_ids'])}",
                            subject=item['object_id'],
                            related_objects=[item['object_id']] + item['owner_ids']
                        )
                        kg.add_finding(finding)
                    # Process owner overload
                    owner_overload = result.analysis_data.get("owner_overload", [])
                    for item in owner_overload:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-owner-overload-{item['owner_id']}",
                            category=FindingCategory.OWNERSHIP,
                            severity=FindingSeverity.WARNING,
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            title="Owner Overload",
                            message=f"Owner {item['owner_id']} owns {item['owned_count']} objects (threshold: {item['threshold']})",
                            subject=item['owner_id'],
                            related_objects=[item['owner_id']]
                        )
                        kg.add_finding(finding)
                    # Process ownership gaps
                    ownership_gaps = result.analysis_data.get("ownership_gaps", [])
                    if ownership_gaps:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-ownership-gaps",
                            category=FindingCategory.OWNERSHIP,
                            severity=FindingSeverity.INFO,
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            title="Ownership Gaps",
                            message=f"Found {len(ownership_gaps)} actor(s) with no owned objects: {', '.join(ownership_gaps)}",
                            related_objects=ownership_gaps
                        )
                        kg.add_finding(finding)
                    # Add metrics
                    metrics = result.analysis_data.get("metrics", {})
                    metric_map = {
                        "total_objects": ("ekl-metric-001", MetricCategory.ARCHITECTURE),
                        "total_capabilities": ("ekl-metric-004", MetricCategory.OWNERSHIP),
                        "orphan_capability_count": ("ekl-metric-005", MetricCategory.OWNERSHIP),
                        "multiple_owner_count": ("ekl-metric-006", MetricCategory.OWNERSHIP),
                        "owner_overload_count": ("ekl-metric-007", MetricCategory.OWNERSHIP),
                        "ownership_gap_count": ("ekl-metric-008", MetricCategory.OWNERSHIP),
                        "total_actors": ("ekl-metric-009", MetricCategory.OWNERSHIP),
                        "total_owners": ("ekl-metric-010", MetricCategory.OWNERSHIP),
                    }
                    desc_map = {
                        "total_objects": "Total number of enterprise objects",
                        "total_capabilities": "Total number of business capabilities",
                        "orphan_capability_count": "Number of orphaned capabilities",
                        "multiple_owner_count": "Number of objects with multiple owners",
                        "owner_overload_count": "Number of overloaded owners",
                        "ownership_gap_count": "Number of actors with no owned objects",
                        "total_actors": "Total number of actors",
                        "total_owners": "Number of actors that own at least one object",
                    }
                    for metric_name, metric_value in metrics.items():
                        if metric_name in metric_map:
                            metric_id, category = metric_map[metric_name]
                        else:
                            metric_id = f"ekl-metric-{metric_name}"
                            category = MetricCategory.ARCHITECTURE
                        kg.add_metric(Metric(
                            id=metric_id,
                            title=metric_name,
                            value=metric_value,
                            category=category,
                            description=desc_map.get(metric_name)
                        ))
                # Handle CoverageAnalysisRule (EKL-R-004)
                elif result.rule_id == "EKL-R-004":
                    coverage_findings = result.analysis_data.get("findings", [])
                    for item in coverage_findings:
                        finding = Finding(
                            id=f"finding-{result.rule_id}-uncovered-cap-{item['capability_id']}",
                            category=FindingCategory.COVERAGE,
                            severity=FindingSeverity.WARNING,
                            rule_id=result.rule_id,
                            rule_version=result.rule_version,
                            title="Uncovered Capability",
                            message=item["issue"],
                            subject=item["capability_id"],
                            related_objects=[item["capability_id"]]
                        )
                        kg.add_finding(finding)
                    # Add metrics
                    metrics = result.analysis_data.get("metrics", {})
                    metric_map_cov = {
                        "total_capabilities": ("ekl-metric-011", MetricCategory.COVERAGE),
                        "covered_capabilities": ("ekl-metric-012", MetricCategory.COVERAGE),
                        "uncovered_capabilities": ("ekl-metric-013", MetricCategory.COVERAGE),
                        "capability_coverage_percent": ("ekl-metric-014", MetricCategory.COVERAGE),
                        "total_business_services": ("ekl-metric-015", MetricCategory.COVERAGE),
                    }
                    desc_map_cov = {
                        "total_capabilities": "Total number of business capabilities",
                        "covered_capabilities": "Number of capabilities realized by a business service",
                        "uncovered_capabilities": "Number of capabilities not realized by any business service",
                        "capability_coverage_percent": "Percentage of capabilities with business service coverage",
                        "total_business_services": "Total number of business services",
                    }
                    for metric_name, metric_value in metrics.items():
                        if metric_name in metric_map_cov:
                            metric_id, category = metric_map_cov[metric_name]
                        else:
                            metric_id = f"ekl-metric-{metric_name}"
                            category = MetricCategory.COVERAGE
                        kg.add_metric(Metric(
                            id=metric_id,
                            title=metric_name,
                            value=metric_value,
                            category=category,
                            description=desc_map_cov.get(metric_name)
                        ))
                # Handle DependencyAnalysisRule (EKL-R-005)
                elif result.rule_id == "EKL-R-005":
                    # Process findings
                    dep_findings = result.analysis_data.get("findings", [])
                    for item in dep_findings:
                        if item.get("type") == "critical_nodes":
                            # Get evidence and recommendations
                            evidence_list = result.analysis_data.get("evidence", [])
                            evidence = evidence_list[0] if evidence_list else None
                            
                            recommendation_ids = []
                            for rec in result.analysis_data.get("recommendations", []):
                                kg.add_recommendation(rec)
                                recommendation_ids.append(rec.id)
                            
                            finding = Finding(
                                id=f"finding-{result.rule_id}-critical-nodes",
                                category=FindingCategory.ARCHITECTURE,
                                severity=FindingSeverity.WARNING,
                                rule_id=result.rule_id,
                                rule_version=result.rule_version,
                                title="Critical Nodes Identified",
                                message=item.get("message"),
                                related_objects=item.get("nodes", []),
                                recommendation_ids=recommendation_ids,
                                evidence=evidence
                            )
                            kg.add_finding(finding)
                    # Add metrics
                    metrics = result.analysis_data.get("metrics", {})
                    metric_map_dep = {
                        "total_dependency_edges": ("ekl-metric-016", MetricCategory.ARCHITECTURE),
                        "critical_node_count": ("ekl-metric-017", MetricCategory.ARCHITECTURE),
                        "average_dependents_per_node": ("ekl-metric-018", MetricCategory.ARCHITECTURE),
                        "max_dependency_depth": ("ekl-metric-019", MetricCategory.ARCHITECTURE),
                    }
                    desc_map_dep = {
                        "total_dependency_edges": "Total number of dependency edges in the graph",
                        "critical_node_count": "Number of critical nodes identified",
                        "average_dependents_per_node": "Average number of dependents per node",
                        "max_dependency_depth": "Maximum dependency depth in the graph"
                    }
                    for metric_name, metric_value in metrics.items():
                        if metric_name in metric_map_dep:
                            metric_id, category = metric_map_dep[metric_name]
                        else:
                            metric_id = f"ekl-metric-{metric_name}"
                            category = MetricCategory.ARCHITECTURE
                        kg.add_metric(Metric(
                            id=metric_id,
                            title=metric_name,
                            value=metric_value,
                            category=category,
                            description=desc_map_dep.get(metric_name)
                        ))
                # Handle ImpactAnalysisRule (EKL-R-006)
                elif result.rule_id == "EKL-R-006":
                    # Process findings
                    impact_findings = result.analysis_data.get("findings", [])
                    for item in impact_findings:
                        if item.get("type") == "high_impact_nodes":
                            # Get evidence and recommendations
                            evidence_list = result.analysis_data.get("evidence", [])
                            evidence = evidence_list[0] if evidence_list else None
                            
                            recommendation_ids = []
                            for rec in result.analysis_data.get("recommendations", []):
                                kg.add_recommendation(rec)
                                recommendation_ids.append(rec.id)
                            
                            finding = Finding(
                                id=f"finding-{result.rule_id}-high-impact",
                                category=FindingCategory.ARCHITECTURE,
                                severity=FindingSeverity.WARNING,
                                rule_id=result.rule_id,
                                rule_version=result.rule_version,
                                title="High-Impact Nodes Identified",
                                message=item.get("message"),
                                related_objects=item.get("nodes", []),
                                recommendation_ids=recommendation_ids,
                                evidence=evidence
                            )
                            kg.add_finding(finding)
                    # Add metrics
                    metrics = result.analysis_data.get("metrics", {})
                    metric_map_impact = {
                        "high_impact_node_count": ("ekl-metric-020", MetricCategory.ARCHITECTURE),
                        "average_transitive_dependents": ("ekl-metric-021", MetricCategory.ARCHITECTURE),
                    }
                    desc_map_impact = {
                        "high_impact_node_count": "Number of high-impact nodes identified",
                        "average_transitive_dependents": "Average number of transitive dependents per node",
                    }
                    for metric_name, metric_value in metrics.items():
                        if metric_name in metric_map_impact:
                            metric_id, category = metric_map_impact[metric_name]
                        else:
                            metric_id = f"ekl-metric-{metric_name}"
                            category = MetricCategory.ARCHITECTURE
                        kg.add_metric(Metric(
                            id=metric_id,
                            title=metric_name,
                            value=metric_value,
                            category=category,
                            description=desc_map_impact.get(metric_name)
                        ))
                # Handle StewardshipAnalysisRule (EKL-R-007)
                elif result.rule_id == "EKL-R-007":
                    # Add findings, metrics, recommendations directly
                    for finding in result.analysis_data.get("findings", []):
                        kg.add_finding(finding)
                    for metric in result.analysis_data.get("metrics", []):
                        kg.add_metric(metric)
                    for recommendation in result.analysis_data.get("recommendations", []):
                        kg.add_recommendation(recommendation)
                # Handle PolicyAnalysisRule (EKL-R-008)
                elif result.rule_id == "EKL-R-008":
                    for finding in result.analysis_data.get("findings", []):
                        kg.add_finding(finding)
                    for metric in result.analysis_data.get("metrics", []):
                        kg.add_metric(metric)
                    for recommendation in result.analysis_data.get("recommendations", []):
                        kg.add_recommendation(recommendation)
                # Handle LifecycleAnalysisRule (EKL-R-009)
                elif result.rule_id == "EKL-R-009":
                    for finding in result.analysis_data.get("findings", []):
                        kg.add_finding(finding)
                    for metric in result.analysis_data.get("metrics", []):
                        kg.add_metric(metric)
                    for recommendation in result.analysis_data.get("recommendations", []):
                        kg.add_recommendation(recommendation)
                    # For evidence, we'll link it to findings as needed
                    # TODO: Add evidence to knowledge graph in future
                # Handle any other rules generically
                else:
                    for finding in result.analysis_data.get("findings", []):
                        kg.add_finding(finding)
                    for metric in result.analysis_data.get("metrics", []):
                        kg.add_metric(metric)
                    for recommendation in result.analysis_data.get("recommendations", []):
                        kg.add_recommendation(recommendation)
        # Set knowledge graph in context
        context.knowledge_graph = kg
        
        # Add knowledge graph as artifact
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
        # Add knowledge package as artifact
        executed_rule_ids = [result.rule_id for result in reasoning_results]
        knowledge_package = KnowledgePackage(
            inferred_relationships=list(kg.inferred_edges.values()),
            findings=kg.findings,
            metrics=kg.metrics,
            recommendations=kg.recommendations,
            provenance={
                "knowledge_graph_model_name": kg.metadata.model_name,
                "knowledge_graph_generated_at": kg.metadata.generated_at.isoformat()
            },
            execution_metadata={
                "executed_rules": executed_rule_ids,
                "number_of_inferred_relationships": added_inferred_edges,
                "number_of_findings": len(kg.findings),
                "number_of_metrics": len(kg.metrics),
                "number_of_recommendations": len(kg.recommendations)
            }
        )
        kp_artifact = Artifact(
            metadata=ArtifactMetadata(
                name="knowledge_package",
                kind=ArtifactKind.KNOWLEDGE_PACKAGE,
                version="1.0.0",
                generated_by="ReasoningPass",
                depends_on=["knowledge_graph"],
                generated_from=["knowledge_graph"]
            ),
            payload=knowledge_package
        )
        context.artifacts.add(kp_artifact)
        # Generate and add reasoning catalog
        catalog = ReasoningCatalog()
        registry = default_reasoning_registry()
        for rule in registry.all():
            catalog.rules.append(CatalogEntry(
                rule_id=rule.metadata.id,
                name=rule.metadata.name,
                domain=rule.metadata.domain,
                type=rule.metadata.type,
                depends_on=rule.metadata.depends_on,
                produces=rule.metadata.produces,
                description=rule.metadata.description,
                version=rule.metadata.version
            ))
        catalog_artifact = Artifact(
            metadata=ArtifactMetadata(
                name="reasoning_catalog",
                kind=ArtifactKind.REASONING_CATALOG,
                version="1.0.0",
                generated_by="ReasoningPass",
                depends_on=[],
                generated_from=[]
            ),
            payload=catalog
        )
        context.artifacts.add(catalog_artifact)
        print("✅ Created Reasoning Catalog artifact")
        print("✅ Inferred {} derived relationships".format(added_inferred_edges))
        print("✅ Built KnowledgeGraph with {} nodes and {} edges".format(len(kg.all_nodes), len(kg.all_edges)))
        print("✅ Added {} findings, {} metrics, and {} recommendations".format(len(kg.findings), len(kg.metrics), len(kg.recommendations)))
        print("✅ Created KnowledgePackage artifact")
        return True

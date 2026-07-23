#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Impact Analysis
Calculates impact of changes to nodes in the dependency graph
"""
from typing import Dict, Any, List, Set
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata
from eke.knowledge import Recommendation, RecommendationPriority, Evidence


class ImpactAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-006",
        name="Impact Analysis",
        description="Analyzes impact of changes to nodes in the dependency graph, identifying high-impact nodes with many transitive dependents",
        category="impact",
        domain="impact",
        type="assessment",
        depends_on=["EKL-R-005"],
        produces=["findings", "metrics", "recommendations"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        # First, we need the dependency graph from DependencyAnalysisRule,
        # but since we're in a separate rule, let's rebuild it here
        dependents = {}  # target → [sources] (what depends on this node)
        dependencies = {}  # source → [targets] (what this node depends on)
        
        for obj in view.find_objects(type=None):
            dependents[obj.id] = []
            dependencies[obj.id] = []
            
        for rel in view.find_relationships(type=None):
            dependents[rel.target].append(rel.source)
            dependencies[rel.source].append(rel.target)
        
        # Calculate transitive dependents for each node
        def get_transitive_dependents(node_id, visited=None):
            if visited is None:
                visited = set()
            if node_id in visited:
                return set()
            visited.add(node_id)
            result = set()
            for dependent in dependents.get(node_id, []):
                result.add(dependent)
                result.update(get_transitive_dependents(dependent, visited.copy()))
            return result
        
        transitive_dependents = {}
        for obj_id in dependents.keys():
            transitive_dependents[obj_id] = list(get_transitive_dependents(obj_id))
        
        # Find all nodes with high impact (many transitive dependents)
        high_impact_nodes = []
        impact_threshold = 3  # arbitrary threshold
        for obj_id, deps in transitive_dependents.items():
            if len(deps) >= impact_threshold:
                high_impact_nodes.append(obj_id)
        
        # Metrics
        total_nodes = len(dependents.keys())
        avg_transitive_dependents = round(sum(len(deps) for deps in transitive_dependents.values()) / total_nodes, 2) if total_nodes > 0 else 0
        
        metrics = {
            "high_impact_node_count": len(high_impact_nodes),
            "average_transitive_dependents": avg_transitive_dependents
        }
        
        # Findings, Recommendations, Evidence
        findings = []
        recommendations: List[Recommendation] = []
        evidence_list: List[Evidence] = []
        
        if high_impact_nodes:
            # Evidence
            evidence = Evidence(
                object_ids=high_impact_nodes,
                notes=f"These nodes each impact {impact_threshold} or more other nodes"
            )
            evidence_list.append(evidence)
            
            # Recommendations
            rec = Recommendation(
                id="ekl-rec-003",
                title="Monitor High-Impact Nodes",
                description=f"Found {len(high_impact_nodes)} high-impact node(s) - consider monitoring changes to them closely",
                priority=RecommendationPriority.HIGH,
                applies_to=high_impact_nodes,
                generated_by=self.metadata.id
            )
            recommendations.append(rec)
            
            # Finding
            findings.append({
                "type": "high_impact_nodes",
                "nodes": high_impact_nodes,
                "message": f"Found {len(high_impact_nodes)} high-impact node(s) that impact {impact_threshold} or more other nodes: {', '.join(high_impact_nodes)}"
            })
        
        return {
            "dependents": dependents,
            "dependencies": dependencies,
            "transitive_dependents": transitive_dependents,
            "high_impact_nodes": high_impact_nodes,
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list
        }

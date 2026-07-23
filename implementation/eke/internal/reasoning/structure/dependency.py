#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Dependency Reasoning
Calculates dependency graphs and identifies critical nodes
"""
from typing import Dict, Any, List
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata
from eke.knowledge import Recommendation, RecommendationPriority, Evidence


class DependencyAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-005",
        name="Dependency Analysis",
        description="Analyzes dependency graphs and identifies critical nodes and dependency depths",
        category="dependency",
        domain="structure",
        type="assessment",
        depends_on=["EKL-R-001"],
        produces=["findings", "metrics", "recommendations"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        # First, collect all nodes and build adjacency list (dependencies)
        # For our test package, relationships are:
        # - realizes (capability → service)
        # - uses (service → platform capability)
        # Let's reverse that to get dependents (what depends on what)
        dependents = {}  # target → [sources]
        dependencies = {}  # source → [targets] (what does X depend on?)
        total_dependencies = 0
        
        for obj in view.find_objects(type=None):
            dependents[obj.id] = []
            dependencies[obj.id] = []
            
        for rel in view.find_relationships(type=None):
            dependents[rel.target].append(rel.source)
            dependencies[rel.source].append(rel.target)
            total_dependencies += 1
        
        # Calculate:
        # 1. Critical nodes (nodes with many dependents)
        critical_nodes = []
        max_dependents = 5  # arbitrary threshold for our test case
        for obj_id, dep_list in dependents.items():
            if len(dep_list) > max_dependents:
                critical_nodes.append(obj_id)
        
        # Calculate dependency depth for each node
        def calculate_depth(node_id, visited=None):
            if visited is None:
                visited = set()
            if node_id in visited:
                return 0
            visited.add(node_id)
            if not dependencies.get(node_id):
                return 0
            return 1 + max(calculate_depth(dep, visited.copy()) for dep in dependencies[node_id])
        
        depths = {}
        for obj_id in dependents.keys():
            depths[obj_id] = calculate_depth(obj_id)
        
        max_depth = max(depths.values()) if depths else 0
        
        # 2. Metrics
        all_objects = view.find_objects(type=None)
        metrics = {
            "total_dependency_edges": total_dependencies,
            "critical_node_count": len(critical_nodes),
            "average_dependents_per_node": round(total_dependencies / len(all_objects), 2) if len(all_objects) > 0 else 0,
            "max_dependency_depth": max_depth
        }
        
        # 3. Findings
        findings = []
        recommendations: List[Recommendation] = []
        evidence_list: List[Evidence] = []
        
        if critical_nodes:
            # Create a finding for critical nodes
            evidence = Evidence(
                object_ids=critical_nodes,
                notes=f"These nodes have more than {max_dependents} dependents"
            )
            evidence_list.append(evidence)
            
            # Create a recommendation to reduce dependencies on critical nodes
            rec = Recommendation(
                id="ekl-rec-002",
                title="Reduce Dependencies on Critical Nodes",
                description=f"Found {len(critical_nodes)} critical node(s) - consider reducing dependencies or adding redundancy",
                priority=RecommendationPriority.HIGH,
                applies_to=critical_nodes,
                generated_by=self.metadata.id
            )
            recommendations.append(rec)
            
            findings.append({
                "type": "critical_nodes",
                "nodes": critical_nodes,
                "message": f"Found {len(critical_nodes)} critical node(s) with more than {max_dependents} dependents: {', '.join(critical_nodes)}"
            })
        
        return {
            "dependents": dependents,
            "dependencies": dependencies,
            "depths": depths,
            "critical_nodes": critical_nodes,
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list
        }

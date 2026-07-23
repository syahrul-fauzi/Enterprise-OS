#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Orphan Detection Rule
Detects orphaned objects that have no incoming relationships
"""
from __future__ import annotations
from typing import List, Dict, Any
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata
from eke.knowledge import Recommendation, RecommendationPriority, Evidence


class OrphanDetectionRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-002",
        name="Orphan Detection",
        description="Identifies objects with no incoming relationships",
        category="analysis",
        domain="governance",
        type="assessment",
        produces=["findings", "recommendations", "metrics"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        # Find all objects with zero incoming relationships
        referenced_targets = set()
        for obj in view.find_objects():
            for rel in view.incoming_relationships(obj):
                referenced_targets.add(obj.id)

        all_ids = {obj.id for obj in view.find_objects()}
        orphan_ids = list(all_ids - referenced_targets)
        
        # Create recommendations if there are orphan objects
        recommendations = []
        evidence_list = []
        if orphan_ids:
            # Create a recommendation to investigate orphans
            recommendation = Recommendation(
                id="ekl-rec-001",
                title="Investigate Orphan Objects",
                description="There are orphan objects with no incoming relationships. Consider either removing them or adding appropriate relationships.",
                priority=RecommendationPriority.MEDIUM,
                applies_to=orphan_ids,
                generated_by=self.metadata.id
            )
            recommendations.append(recommendation)
            
            # Create evidence
            evidence = Evidence(
                object_ids=orphan_ids,
                notes="These objects have no incoming relationships"
            )
            evidence_list.append(evidence)
            
        return {
            "orphan_count": len(orphan_ids),
            "orphan_ids": orphan_ids,
            "total_objects": len(all_ids),
            "recommendations": recommendations,
            "evidence": evidence_list
        }

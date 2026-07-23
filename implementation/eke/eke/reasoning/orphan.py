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


class OrphanDetectionRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-002",
        name="Orphan Detection",
        description="Identifies objects with no incoming relationships",
        category="analysis"
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        # Find all objects with zero incoming relationships
        referenced_targets = set()
        for obj in view.find_objects():
            for rel in view.incoming_relationships(obj):
                referenced_targets.add(obj.id)

        all_ids = {obj.id for obj in view.find_objects()}
        orphan_ids = all_ids - referenced_targets
        return {
            "orphan_count": len(orphan_ids),
            "orphan_ids": list(orphan_ids),
            "total_objects": len(all_ids)
        }

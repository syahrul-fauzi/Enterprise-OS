#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Ownership Reasoning
Analyzes ownership of enterprise objects, detecting orphan capabilities,
multiple owners, owner overload, and ownership gaps
"""
from __future__ import annotations
from typing import List, Dict, Any
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata


class OwnershipAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-003",
        name="Ownership Analysis",
        description="Analyzes ownership of enterprise objects, detecting orphan capabilities, multiple owners, owner overload, and ownership gaps",
        category="ownership",
        domain="structure",
        type="assessment",
        produces=["findings", "metrics"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        # Collect all objects and their owners
        object_owners: Dict[str, List[str]] = {}
        owner_object_counts: Dict[str, int] = {}

        # Iterate over all objects
        for obj in view.find_objects():
            owners = view.owners(obj)
            owner_ids = [owner.id for owner in owners]
            object_owners[obj.id] = owner_ids
            
            # Track how many objects each owner owns
            for owner_id in owner_ids:
                if owner_id not in owner_object_counts:
                    owner_object_counts[owner_id] = 0
                owner_object_counts[owner_id] += 1

        # Initialize analysis results
        orphan_capabilities: List[str] = []
        multiple_owners: List[Dict[str, Any]] = []
        owner_overload: List[Dict[str, Any]] = []
        ownership_gaps: List[str] = []

        # 1. Orphan capabilities: capabilities with no owners
        for capability in view.capabilities():
            if len(object_owners.get(capability.id, [])) == 0:
                orphan_capabilities.append(capability.id)

        # 2. Objects with multiple owners
        for obj_id, owner_ids in object_owners.items():
            if len(owner_ids) > 1:
                multiple_owners.append({
                    "object_id": obj_id,
                    "owner_ids": owner_ids,
                    "owner_count": len(owner_ids)
                })

        # 3. Owner overload: let's define overload as owning > 3 objects
        overload_threshold = 3
        for owner_id, count in owner_object_counts.items():
            if count > overload_threshold:
                owner_overload.append({
                    "owner_id": owner_id,
                    "owned_count": count,
                    "threshold": overload_threshold
                })

        # 4. Ownership gaps: actors that own nothing
        for actor in view.actors():
            if owner_object_counts.get(actor.id, 0) == 0:
                ownership_gaps.append(actor.id)

        # Collect metrics
        total_objects = len(object_owners)
        total_capabilities = len(view.capabilities())
        total_owners = len(owner_object_counts)

        return {
            "orphan_capabilities": orphan_capabilities,
            "multiple_owners": multiple_owners,
            "owner_overload": owner_overload,
            "ownership_gaps": ownership_gaps,
            "metrics": {
                "total_objects": total_objects,
                "total_capabilities": total_capabilities,
                "orphan_capability_count": len(orphan_capabilities),
                "multiple_owner_count": len(multiple_owners),
                "owner_overload_count": len(owner_overload),
                "ownership_gap_count": len(ownership_gaps),
                "total_actors": len(view.actors()),
                "total_owners": total_owners
            }
        }

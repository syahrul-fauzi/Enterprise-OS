#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Capability Constraints
Constraints related to business capabilities.
"""
from typing import List
from eke.constraints.base import Constraint, ConstraintViolation, ConstraintSeverity
from eke.bound_model import BoundModel, BoundObject
from eke.relationship_types import RelationshipTypes
from eke.rules import RuleMetadata


class EveryCapabilityMustHaveOwnerConstraint(Constraint):
    metadata = RuleMetadata(
        id="EKL-C001",
        name="Capability Ownership",
        description="Every business capability must have an accountable owner",
        category="governance",
        severity="error"
    )
    applies_to = ["BusinessCapability"]

    def evaluate(self, model: BoundModel) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []
        for obj_id, bound_obj in model.objects.items():
            if bound_obj.type == "BusinessCapability":
                has_owner = False
                for rel in model.relationships.values():
                    if rel.type == RelationshipTypes.OWNS and rel.target_id == obj_id:
                        has_owner = True
                        break
                if not has_owner:
                    violations.append(
                        ConstraintViolation(
                            constraint_id=self.metadata.id,
                            message=f"BusinessCapability {obj_id} has no owner",
                            severity=ConstraintSeverity.ERROR,
                            object_id=obj_id
                        )
                    )
        return violations


class EveryCapabilityMustRealizeAtLeastOneServiceConstraint(Constraint):
    metadata = RuleMetadata(
        id="EKL-C002",
        name="Capability Realization",
        description="Every business capability must realize at least one business service",
        category="architecture",
        severity="error"
    )
    applies_to = ["BusinessCapability"]

    def evaluate(self, model: BoundModel) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []
        for obj_id, bound_obj in model.objects.items():
            if bound_obj.type == "BusinessCapability":
                has_realized_service = False
                for rel in model.relationships.values():
                    if rel.type == RelationshipTypes.REALIZES and rel.source_id == obj_id:
                        has_realized_service = True
                        break
                if not has_realized_service:
                    violations.append(
                        ConstraintViolation(
                            constraint_id=self.metadata.id,
                            message=f"BusinessCapability {obj_id} does not realize any business service",
                            severity=ConstraintSeverity.ERROR,
                            object_id=obj_id
                        )
                    )
        return violations

#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Relationship Constraints
Constraints related to relationships and model integrity.
"""
from typing import List, Set
from eke.constraints.base import Constraint, ConstraintViolation, ConstraintSeverity
from eke.bound_model import BoundModel
from eke.semantic_validation_pass import RELATIONSHIP_TYPE_REGISTRY
from eke.rules import RuleMetadata


class RelationshipDirectionValidConstraint(Constraint):
    metadata = RuleMetadata(
        id="EKL-C003",
        name="Valid Relationship Direction",
        description="Relationship direction must be valid",
        category="semantic",
        severity="error"
    )
    applies_to = ["Relationship"]

    def evaluate(self, model: BoundModel) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []
        for rel_id, rel in model.relationships.items():
            if rel.type in RELATIONSHIP_TYPE_REGISTRY:
                valid_sources = RELATIONSHIP_TYPE_REGISTRY[rel.type]["source_types"]
                valid_targets = RELATIONSHIP_TYPE_REGISTRY[rel.type]["target_types"]
                if rel.source and rel.source.type not in valid_sources:
                    violations.append(
                        ConstraintViolation(
                            constraint_id=self.metadata.id,
                            message=f"Relationship {rel.type} has invalid source type: {rel.source.type}",
                            severity=ConstraintSeverity.ERROR,
                            relationship_id=rel_id
                        )
                    )
                if rel.target and rel.target.type not in valid_targets:
                    violations.append(
                        ConstraintViolation(
                            constraint_id=self.metadata.id,
                            message=f"Relationship {rel.type} has invalid target type: {rel.target.type}",
                            severity=ConstraintSeverity.ERROR,
                            relationship_id=rel_id
                        )
                    )
        return violations


class DuplicateObjectIdentityConstraint(Constraint):
    metadata = RuleMetadata(
        id="EKL-C004",
        name="Unique Object ID",
        description="Object IDs must be globally unique",
        category="consistency",
        severity="error"
    )
    applies_to = ["Object"]

    def evaluate(self, model: BoundModel) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []
        # Note: in current BoundModel, objects are keyed by id, so duplicates can't exist,
        # but we keep this constraint here for completeness and future extensions
        return violations


class DeprecatedObjectCannotBeTargetConstraint(Constraint):
    metadata = RuleMetadata(
        id="EKL-C005",
        name="Deprecated Object Target",
        description="Deprecated objects cannot be relationship targets",
        category="lifecycle",
        severity="warning"
    )
    applies_to = ["Relationship"]

    def evaluate(self, model: BoundModel) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []
        # Find all deprecated objects
        deprecated_object_ids: Set[str] = set()
        for obj_id, obj in model.objects.items():
            if obj.data.get("metadata", {}).get("deprecated", False):
                deprecated_object_ids.add(obj_id)
        # Check if any relationship targets a deprecated object
        for rel_id, rel in model.relationships.items():
            if rel.target_id in deprecated_object_ids:
                violations.append(
                    ConstraintViolation(
                        constraint_id=self.metadata.id,
                        message=f"Relationship {rel_id} targets deprecated object {rel.target_id}",
                        severity=ConstraintSeverity.WARNING,
                        relationship_id=rel_id
                    )
                )
        return violations

#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Constraints Package
Contains all constraint definitions and registry.
"""
from .base import (
    Constraint,
    ConstraintViolation,
    ConstraintSeverity,
    ConstraintEvaluationResult,
    ConstraintRegistry,
)
from .capability_constraints import (
    EveryCapabilityMustHaveOwnerConstraint,
    EveryCapabilityMustRealizeAtLeastOneServiceConstraint,
)
from .relationship_constraints import (
    RelationshipDirectionValidConstraint,
    DuplicateObjectIdentityConstraint,
    DeprecatedObjectCannotBeTargetConstraint,
)


def default_constraints() -> ConstraintRegistry:
    registry = ConstraintRegistry()
    registry.register(EveryCapabilityMustHaveOwnerConstraint())
    registry.register(EveryCapabilityMustRealizeAtLeastOneServiceConstraint())
    registry.register(RelationshipDirectionValidConstraint())
    registry.register(DuplicateObjectIdentityConstraint())
    registry.register(DeprecatedObjectCannotBeTargetConstraint())
    return registry


__all__ = [
    "Constraint",
    "ConstraintViolation",
    "ConstraintSeverity",
    "ConstraintEvaluationResult",
    "ConstraintRegistry",
    "EveryCapabilityMustHaveOwnerConstraint",
    "EveryCapabilityMustRealizeAtLeastOneServiceConstraint",
    "RelationshipDirectionValidConstraint",
    "DuplicateObjectIdentityConstraint",
    "DeprecatedObjectCannotBeTargetConstraint",
    "default_constraints",
]

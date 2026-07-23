#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Reasoning Package
Modular enterprise reasoning modules
"""
from .base import ReasoningRule, ReasoningResult, ReasoningRegistry
from .engine import ReasoningEngine
from .structure import (
    CapabilityIndirectSupportRule,
    infer_indirect_support,
    DependencyAnalysisRule,
    CoverageAnalysisRule,
    OwnershipAnalysisRule
)
from .governance import (
    OrphanDetectionRule,
    StewardshipAnalysisRule,
    PolicyAnalysisRule
)
from .impact import (
    ImpactAnalysisRule
)
from .lifecycle import (
    LifecycleAnalysisRule
)
from .risk import (
    RiskAnalysisRule
)
from .planning import (
    PlanningAnalysisRule
)
from .compliance import (
    ComplianceAnalysisRule
)


def default_reasoning_registry() -> ReasoningRegistry:
    registry = ReasoningRegistry()
    registry.register(CapabilityIndirectSupportRule())
    registry.register(OrphanDetectionRule())
    registry.register(OwnershipAnalysisRule())
    registry.register(CoverageAnalysisRule())
    registry.register(DependencyAnalysisRule())
    registry.register(ImpactAnalysisRule())
    registry.register(StewardshipAnalysisRule())
    registry.register(PolicyAnalysisRule())
    registry.register(LifecycleAnalysisRule())
    registry.register(RiskAnalysisRule())
    registry.register(PlanningAnalysisRule())
    registry.register(ComplianceAnalysisRule())
    return registry


__all__ = [
    "ReasoningRule",
    "ReasoningResult",
    "ReasoningRegistry",
    "ReasoningEngine",
    "default_reasoning_registry",
    "CapabilityIndirectSupportRule",
    "infer_indirect_support",
    "OrphanDetectionRule",
    "StewardshipAnalysisRule",
    "PolicyAnalysisRule",
    "LifecycleAnalysisRule",
    "RiskAnalysisRule",
    "OwnershipAnalysisRule",
    "CoverageAnalysisRule",
    "DependencyAnalysisRule",
    "ImpactAnalysisRule",
    "PlanningAnalysisRule",
    "ComplianceAnalysisRule"
]

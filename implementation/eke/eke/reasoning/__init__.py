#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Reasoning Package
Modular enterprise reasoning modules
"""
from .base import ReasoningRule, ReasoningResult, ReasoningRegistry
from .engine import ReasoningEngine
from .capability_realization import (
    CapabilityIndirectSupportRule,
    infer_indirect_support
)
from .orphan import OrphanDetectionRule
from .ownership import OwnershipAnalysisRule


def default_reasoning_registry() -> ReasoningRegistry:
    registry = ReasoningRegistry()
    registry.register(CapabilityIndirectSupportRule())
    registry.register(OrphanDetectionRule())
    registry.register(OwnershipAnalysisRule())
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
    "OwnershipAnalysisRule",
]

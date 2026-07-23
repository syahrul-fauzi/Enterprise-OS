#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKL) — Compiler Profiles
Predefined profiles to select which passes to run
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Type
from eke.passes import CompilerPass
from eke.loader_pass import PackageLoaderPass
from eke.schema_validation_pass import SchemaValidationPass
from eke.semantic_validation_pass import SemanticValidationPass
from eke.symbol_resolution_pass import SymbolResolutionPass
from eke.reference_resolution_pass import ReferenceResolutionPass
from eke.constraint_engine_pass import ConstraintEnginePass
from eke.graph_builder import GraphBuilderPass
from eke.ir_builder_pass import IRBuilderPass
from eke.reasoning_pass import ReasoningPass


@dataclass
class Profile:
    name: str
    description: str
    passes: List[Type[CompilerPass]] = field(default_factory=list)


# Predefined profiles
VALIDATE_PROFILE = Profile(
    name="validate",
    description="Validate package structure and constraints without reasoning",
    passes=[
        PackageLoaderPass,
        SchemaValidationPass,
        SemanticValidationPass,
        SymbolResolutionPass,
        ReferenceResolutionPass,
        ConstraintEnginePass
    ]
)

KNOWLEDGE_PROFILE = Profile(
    name="knowledge",
    description="Full compilation with reasoning to build knowledge graph and package",
    passes=[
        PackageLoaderPass,
        SchemaValidationPass,
        SemanticValidationPass,
        SymbolResolutionPass,
        ReferenceResolutionPass,
        ConstraintEnginePass,
        GraphBuilderPass,
        IRBuilderPass,
        ReasoningPass
    ]
)

PLANNING_PROFILE = Profile(
    name="planning",
    description="Compilation for impact analysis and dependency analysis (TODO: add specific planning passes later)",
    passes=[
        PackageLoaderPass,
        SchemaValidationPass,
        SemanticValidationPass,
        SymbolResolutionPass,
        ReferenceResolutionPass,
        ConstraintEnginePass,
        GraphBuilderPass,
        IRBuilderPass,
        ReasoningPass  # TODO: Add specific planning reasoning passes later
    ]
)

GOVERNANCE_PROFILE = Profile(
    name="governance",
    description="Compilation for policy and ownership audit (TODO: add specific governance passes later)",
    passes=[
        PackageLoaderPass,
        SchemaValidationPass,
        SemanticValidationPass,
        SymbolResolutionPass,
        ReferenceResolutionPass,
        ConstraintEnginePass,
        GraphBuilderPass,
        IRBuilderPass,
        ReasoningPass  # TODO: Add specific governance reasoning passes later
    ]
)

# Default profile if none is specified
DEFAULT_PROFILE = KNOWLEDGE_PROFILE

# Dictionary to look up profiles by name
PROFILES: dict[str, Profile] = {
    VALIDATE_PROFILE.name: VALIDATE_PROFILE,
    KNOWLEDGE_PROFILE.name: KNOWLEDGE_PROFILE,
    PLANNING_PROFILE.name: PLANNING_PROFILE,
    GOVERNANCE_PROFILE.name: GOVERNANCE_PROFILE
}

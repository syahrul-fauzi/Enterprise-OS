#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Compiler Base Classes
Base classes and interfaces for the EKL compilation pipeline.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from eke.diagnostics import DiagnosticEngine
from eke.artifacts import Artifact, ArtifactRegistry

if TYPE_CHECKING:
    from eke.symbol_table import SymbolTable
    from eke.bound_model import BoundModel
    from eke.graph_builder import CanonicalObjectGraph
    from eke.ir import EnterpriseIR
    from eke.constraints.base import ConstraintViolation, ConstraintEvaluationResult
    from eke.knowledge_graph import KnowledgeGraph


class CompilerContext:
    """Single shared context object for the entire EKL compiler pipeline.

    Attributes:
        diagnostics: Diagnostic engine for errors/warnings/info
        package_dir: Directory containing the loaded knowledge package
        manifest: Parsed package manifest
        objects: Dictionary of loaded objects (id -> data dict)
        relationships: Dictionary of loaded relationships (id -> data dict)
        symbol_table: Symbol table from SymbolResolutionPass
        bound_model: Bound model with resolved references from ReferenceResolutionPass
        constraint_results: List of constraint violations from ConstraintEnginePass
        canonical_graph: Canonical Object Graph from GraphBuilderPass
        enterprise_ir: Enterprise Intermediate Representation (IR) from IRBuilderPass
        knowledge_graph: Knowledge Graph (canonical semantic output after reasoning)
        outputs: Generated projections
        artifacts: List of knowledge artifacts produced by the pipeline
    """
    def __init__(self):
        self.diagnostics = DiagnosticEngine()
        self.package_dir: Optional[str] = None
        self.manifest: Optional[Dict[str, Any]] = None
        self.objects: Dict[str, Any] = {}  # id -> data dict
        self.relationships: Dict[str, Any] = {}  # id -> data dict
        self.symbol_table: Optional[SymbolTable] = None
        self.bound_model: Optional[BoundModel] = None
        self.constraint_results: List[Any] = []  # Will be list[ConstraintEvaluationResult]
        self.canonical_graph: Optional[CanonicalObjectGraph] = None
        self.enterprise_ir: Optional[EnterpriseIR] = None
        self.knowledge_graph: Optional[KnowledgeGraph] = None
        self.outputs: Dict[str, Any] = {}  # projection type -> output
        self.artifacts: ArtifactRegistry = ArtifactRegistry()


class CompilerPass(ABC):
    @abstractmethod
    def run(self, context: CompilerContext) -> bool:
        """
        Runs this compiler pass with the given context.

        Returns: True if the pass succeeded (no errors), False otherwise.
        """
        pass


class PassPipeline:
    def __init__(self, context: CompilerContext):
        self.context = context
        self.passes: List[CompilerPass] = []

    def add_pass(self, compiler_pass: CompilerPass):
        self.passes.append(compiler_pass)

    def run(self) -> bool:
        for i, compiler_pass in enumerate(self.passes):
            print(f"=== Pass {i+1:02d}: {compiler_pass.__class__.__name__} ===")
            if not compiler_pass.run(self.context):
                self.context.diagnostics.report()
                return False
        print("\n✅ All passes completed successfully!")
        return True

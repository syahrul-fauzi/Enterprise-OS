# Enterprise Knowledge Compiler (Public Facade)
from pathlib import Path
from typing import Optional

from eke.api.result import (
    CompileResult,
    ValidateResult,
    GraphResult,
    PackageResult,
    Status,
    Diagnostic,
    Metrics
)
from eke.contracts.knowledge_package import KnowledgePackage
from eke.internal.engine.runtime import EnterpriseKnowledgeEngineRuntime

# Import shared engine framework types
from shared.engine.result import EngineStatus


class EnterpriseKnowledgeCompiler:
    """
    Public facade for EKE Compiler Kernel (stateless, deterministic)
    Now uses the shared Engine Framework!
    """
    def __init__(self):
        self.engine_runtime = EnterpriseKnowledgeEngineRuntime()

    def compile(self, source_path: str) -> CompileResult:
        """Compile enterprise knowledge source into KnowledgePackage"""
        result = self.engine_runtime.execute(Path(source_path))

        # Convert engine framework result to existing CompileResult
        old_status = Status.SUCCESS if result.status == EngineStatus.SUCCESS else Status.FAILURE
        old_diagnostics = [
            Diagnostic(
                level=d.severity.value,
                message=d.message,
                source=d.source
            ) for d in result.diagnostics
        ]
        old_metrics = Metrics(
            duration_seconds=result.duration_seconds,
            artifacts_count=1 if result.output_artifact else 0
        )

        return CompileResult(
            status=old_status,
            diagnostics=old_diagnostics,
            metrics=old_metrics,
            duration=result.duration_seconds
        )

    def validate(self, source_path: str) -> ValidateResult:
        """Validate enterprise knowledge source"""
        # TODO: Implement validation using framework
        start = __import__("time").time()
        try:
            diagnostics: list[Diagnostic] = []
            return ValidateResult(
                status=Status.SUCCESS,
                diagnostics=diagnostics,
                duration=__import__("time").time() - start
            )
        except Exception as e:
            return ValidateResult(
                status=Status.FAILURE,
                diagnostics=[Diagnostic(level="error", message=str(e))],
                duration=__import__("time").time() - start
            )

    def build_graph(self, source_path: str) -> GraphResult:
        """Build canonical knowledge graph from source"""
        # TODO: Implement graph build using framework
        start = __import__("time").time()
        try:
            return GraphResult(
                status=Status.SUCCESS,
                duration=__import__("time").time() - start
            )
        except Exception as e:
            return GraphResult(
                status=Status.FAILURE,
                diagnostics=[Diagnostic(level="error", message=str(e))],
                duration=__import__("time").time() - start
            )

    def package(self, source_path: str) -> PackageResult:
        """Package enterprise knowledge into KnowledgePackage"""
        result = self.engine_runtime.execute(Path(source_path))

        old_status = Status.SUCCESS if result.status == EngineStatus.SUCCESS else Status.FAILURE
        old_diagnostics = [
            Diagnostic(
                level=d.severity.value,
                message=d.message,
                source=d.source
            ) for d in result.diagnostics
        ]

        return PackageResult(
            status=old_status,
            knowledge_package=result.output_artifact,
            diagnostics=old_diagnostics,
            duration=result.duration_seconds
        )

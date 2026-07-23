# Projection Runtime (Public Facade)
from typing import List, Dict, Any, Optional
from eke.api.result import ProjectionResult, Status, Diagnostic
from eke.contracts.knowledge_package import KnowledgePackage


class ProjectionRuntime:
    """
    Public facade for EKE Compiler Runtime (pluggable projections)
    """
    def __init__(self):
        self._projections: Dict[str, Any] = {}  # projection_name -> projection_func

    def project(self, knowledge_package: KnowledgePackage, projection_type: str) -> ProjectionResult:
        """Run projection on KnowledgePackage"""
        try:
            if projection_type not in self._projections:
                return ProjectionResult(
                    status=Status.FAILURE,
                    diagnostics=[Diagnostic(
                        level="error",
                        message=f"Unknown projection type: {projection_type}"
                    )]
                )
            # TODO: Implement actual projection execution
            return ProjectionResult(
                status=Status.SUCCESS,
                projection_type=projection_type,
                projection_output=f"Projection {projection_type} output"
            )
        except Exception as e:
            return ProjectionResult(
                status=Status.FAILURE,
                diagnostics=[Diagnostic(level="error", message=str(e))]
            )

    def available_projections(self) -> List[str]:
        """List available projections"""
        return list(self._projections.keys())

    def register_projection(self, name: str, projection: Any) -> None:
        """Register a new projection"""
        self._projections[name] = projection

"""
Enterprise Intelligence Engine — orchestrator connecting compiler output to services.
"""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from eke.artifacts import KnowledgePackage, Artifact, ArtifactKind, ArtifactRegistry
from eke.knowledge_graph import KnowledgeGraph
from eis.services.context import ServiceContext
from eis.services.engine import ServiceEngine, ServiceExecution
from eis.services.registry import service_registry


@dataclass
class EnterpriseIntelligencePackage:
    """Composition-based enterprise intelligence package, aggregating artifacts."""
    knowledge_package: KnowledgePackage
    service_results: Dict[str, Any] = field(default_factory=dict)
    generated_artifacts: List[Artifact] = field(default_factory=list)
    generated_reports: List[Artifact] = field(default_factory=list)
    generated_dashboards: List[Artifact] = field(default_factory=list)
    service_execution: Optional[ServiceExecution] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for serialization."""
        return {
            "knowledge_package": self.knowledge_package.to_dict() if hasattr(self.knowledge_package, "to_dict") else str(self.knowledge_package),
            "service_results": {
                service_id: {
                    "findings": [f.to_dict() for f in result.findings] if hasattr(result, "findings") else [],
                    "metrics": [m.to_dict() for m in result.metrics] if hasattr(result, "metrics") else [],
                    "recommendations": [r.to_dict() for r in result.recommendations] if hasattr(result, "recommendations") else [],
                    "events": getattr(result, "events", []),
                    "execution_metadata": getattr(result, "execution_metadata", {}),
                    "error": getattr(result, "error", None),
                }
                for service_id, result in self.service_results.items()
            },
            "generated_artifacts": [a.to_dict() for a in self.generated_artifacts],
            "generated_reports": [a.to_dict() for a in self.generated_reports],
            "generated_dashboards": [a.to_dict() for a in self.generated_dashboards],
            "service_execution": {
                "duration_ms": getattr(self.service_execution, "duration_ms", 0.0),
                "errors": getattr(self.service_execution, "errors", []),
            } if self.service_execution else None,
        }


class EnterpriseIntelligenceEngine:
    """Orchestrator connecting compiler to services to produce intelligence package."""

    def __init__(
        self,
        service_engine: Optional[ServiceEngine] = None,
        configuration: Optional[Dict[str, Any]] = None,
    ):
        self.service_engine = service_engine or ServiceEngine(service_registry)
        self.configuration = configuration or {}
        self.logger = logging.getLogger(__name__)

    def execute(
        self,
        knowledge_package: KnowledgePackage,
        knowledge_graph: KnowledgeGraph,
        artifacts: ArtifactRegistry,
        service_ids: Optional[List[str]] = None,
        domains: Optional[List[str]] = None,
    ) -> EnterpriseIntelligencePackage:
        """
        Execute intelligence pipeline: compiler output → services → intelligence package.
        """
        # Create service context
        context = ServiceContext(
            knowledge_graph=knowledge_graph,
            knowledge_package=knowledge_package,
            artifacts=artifacts,
            configuration=self.configuration,
            clock=datetime.now(),
            logger=self.logger,
        )

        # Execute services
        service_execution = self.service_engine.execute(
            context=context,
            service_ids=service_ids,
            domains=domains,
        )

        # Create intelligence package by aggregating artifacts
        intelligence_package = EnterpriseIntelligencePackage(
            knowledge_package=knowledge_package,
            service_execution=service_execution,
        )

        # Aggregate artifacts from service results
        for service_id, result in service_execution.results.items():
            intelligence_package.service_results[service_id] = result
            intelligence_package.generated_artifacts.extend(result.artifacts)

            # Categorize artifacts by type (dashboards, reports, etc.)
            for artifact in result.artifacts:
                if hasattr(artifact.metadata, "kind"):
                    kind_value = artifact.metadata.kind.value
                    if kind_value.endswith("dashboard"):
                        intelligence_package.generated_dashboards.append(artifact)
                    elif kind_value.endswith("report"):
                        intelligence_package.generated_reports.append(artifact)

        return intelligence_package

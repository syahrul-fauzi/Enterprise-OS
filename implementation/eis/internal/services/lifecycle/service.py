"""
Lifecycle Intelligence Service — consumes existing lifecycle findings, produces dashboard.
"""
from dataclasses import dataclass
from typing import Dict, Any

from eis.services.base import KnowledgeService
from eis.services.metadata import ServiceMetadata
from eis.services.context import ServiceContext
from eis.services.result import ServiceResult
from eke.artifacts import Artifact, ArtifactKind, ArtifactMetadata
from eke.knowledge import FindingCategory


@dataclass
class LifecycleService(KnowledgeService):
    metadata = ServiceMetadata(
        id="eke.service.lifecycle.dashboard",
        name="Lifecycle Dashboard Service",
        description="Produces lifecycle dashboard from lifecycle metrics",
        version="0.1.0",
        domain="lifecycle",
        category="dashboard",
        produces=["lifecycle_dashboard"],
        author="Enterprise Knowledge Engine Team",
        since="3.1.0",
        tags=["lifecycle", "dashboard", "technical_currency"],
    )

    def execute(self, context: ServiceContext) -> ServiceResult:
        result = ServiceResult()

        lifecycle_findings = [
            f for f in context.knowledge_package.findings
            if f.category.value == "lifecycle"
        ]
        lifecycle_metrics = [
            m for m in context.knowledge_package.metrics
            if m.category.value == "lifecycle"
        ]

        result.findings = lifecycle_findings
        result.metrics = lifecycle_metrics

        dashboard_data: Dict[str, Any] = {
            "total_findings": len(lifecycle_findings),
            "total_metrics": len(lifecycle_metrics),
        }

        dashboard = Artifact(
            metadata=ArtifactMetadata(
                name="lifecycle-dashboard",
                kind=ArtifactKind.LIFECYCLE_DASHBOARD,
                version="0.1.0",
                generated_by=self.metadata.id,
            ),
            payload=dashboard_data,
        )
        result.artifacts.append(dashboard)

        result.events.append({
            "type": "lifecycle_dashboard_generated",
            "timestamp": context.clock.isoformat(),
            "service_id": self.metadata.id,
        })

        return result

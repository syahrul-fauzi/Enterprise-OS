"""
Compliance Intelligence Service — consumes existing compliance findings, produces dashboard.
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
class ComplianceService(KnowledgeService):
    metadata = ServiceMetadata(
        id="eke.service.compliance.dashboard",
        name="Compliance Dashboard Service",
        description="Produces compliance dashboard from control and evidence findings",
        version="0.1.0",
        domain="compliance",
        category="dashboard",
        produces=["compliance_dashboard"],
        author="Enterprise Knowledge Engine Team",
        since="3.1.0",
        tags=["compliance", "dashboard", "controls", "evidence"],
    )

    def execute(self, context: ServiceContext) -> ServiceResult:
        result = ServiceResult()

        compliance_findings = [
            f for f in context.knowledge_package.findings
            if f.category.value == "compliance"
        ]
        compliance_metrics = [
            m for m in context.knowledge_package.metrics
            if m.category.value == "compliance"
        ]

        result.findings = compliance_findings
        result.metrics = compliance_metrics

        dashboard_data: Dict[str, Any] = {
            "total_findings": len(compliance_findings),
            "total_metrics": len(compliance_metrics),
        }

        dashboard = Artifact(
            metadata=ArtifactMetadata(
                name="compliance-dashboard",
                kind=ArtifactKind.COMPLIANCE_DASHBOARD,
                version="0.1.0",
                generated_by=self.metadata.id,
            ),
            payload=dashboard_data,
        )
        result.artifacts.append(dashboard)

        result.events.append({
            "type": "compliance_dashboard_generated",
            "timestamp": context.clock.isoformat(),
            "service_id": self.metadata.id,
        })

        return result

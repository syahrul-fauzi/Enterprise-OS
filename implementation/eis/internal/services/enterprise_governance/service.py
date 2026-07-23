"""
Governance Intelligence Service — consumes existing ownership findings, produces governance dashboard.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any

from eis.services.base import KnowledgeService
from eis.services.metadata import ServiceMetadata
from eis.services.context import ServiceContext
from eis.services.result import ServiceResult
from eke.artifacts import Artifact, ArtifactKind, ArtifactMetadata
from eke.knowledge import FindingCategory


@dataclass
class GovernanceService(KnowledgeService):
    metadata = ServiceMetadata(
        id="eke.service.governance.dashboard",
        name="Governance Dashboard Service",
        description="Produces governance dashboard from ownership and policy findings",
        version="0.1.0",
        domain="governance",
        category="dashboard",
        produces=["governance_dashboard"],
        author="Enterprise Knowledge Engine Team",
        since="3.1.0",
        tags=["governance", "ownership", "dashboard"],
    )

    def execute(self, context: ServiceContext) -> ServiceResult:
        """Execute governance service, transforming existing findings into dashboard."""
        result = ServiceResult()

        # Consume existing governance findings and metrics
        governance_findings = [
            f for f in context.knowledge_package.findings
            if f.category == FindingCategory.GOVERNANCE
        ]
        governance_metrics = [
            m for m in context.knowledge_package.metrics
            if m.category.value == "governance"
        ]

        result.findings = governance_findings
        result.metrics = governance_metrics
        result.recommendations = context.knowledge_package.recommendations

        # Create simple governance dashboard artifact
        dashboard_data: Dict[str, Any] = {
            "total_findings": len(governance_findings),
            "total_metrics": len(governance_metrics),
            "findings_by_severity": {},
        }
        for finding in governance_findings:
            severity = finding.severity.value
            if severity not in dashboard_data["findings_by_severity"]:
                dashboard_data["findings_by_severity"][severity] = 0
            dashboard_data["findings_by_severity"][severity] += 1

        dashboard = Artifact(
            metadata=ArtifactMetadata(
                name="governance-dashboard",
                kind=ArtifactKind.GOVERNANCE_DASHBOARD,
                version="0.1.0",
                generated_by=self.metadata.id,
            ),
            payload=dashboard_data,
        )
        result.artifacts.append(dashboard)

        # Add event
        result.events.append({
            "type": "governance_dashboard_generated",
            "timestamp": context.clock.isoformat(),
            "service_id": self.metadata.id,
        })

        return result

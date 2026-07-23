"""
Risk Intelligence Service — consumes existing risk findings, produces risk register.
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
class RiskService(KnowledgeService):
    metadata = ServiceMetadata(
        id="eke.service.risk.register",
        name="Risk Register Service",
        description="Produces risk register from risk findings and metrics",
        version="0.1.0",
        domain="risk",
        category="register",
        produces=["risk_register"],
        author="Enterprise Knowledge Engine Team",
        since="3.1.0",
        tags=["risk", "register"],
    )

    def execute(self, context: ServiceContext) -> ServiceResult:
        """Execute risk service, transforming existing risk findings into register."""
        result = ServiceResult()

        # Consume existing risk findings and metrics
        risk_findings = [
            f for f in context.knowledge_package.findings
            if f.category == FindingCategory.RISK
        ]
        risk_metrics = [
            m for m in context.knowledge_package.metrics
            if m.category.value == "risk"
        ]

        result.findings = risk_findings
        result.metrics = risk_metrics

        # Create simple risk register artifact
        register_data: Dict[str, Any] = {
            "total_findings": len(risk_findings),
            "total_metrics": len(risk_metrics),
            "findings": [f.to_dict() for f in risk_findings],
        }

        register = Artifact(
            metadata=ArtifactMetadata(
                name="risk-register",
                kind=ArtifactKind.RISK_REGISTER,
                version="0.1.0",
                generated_by=self.metadata.id,
            ),
            payload=register_data,
        )
        result.artifacts.append(register)

        result.events.append({
            "type": "risk_register_generated",
            "timestamp": context.clock.isoformat(),
            "service_id": self.metadata.id,
        })

        return result

"""
Planning Intelligence Service — consumes existing planning findings, produces roadmap.
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
class PlanningService(KnowledgeService):
    metadata = ServiceMetadata(
        id="eke.service.planning.roadmap",
        name="Planning Roadmap Service",
        description="Produces modernization roadmap from dependency and impact analysis",
        version="0.1.0",
        domain="planning",
        category="roadmap",
        produces=["planning_roadmap"],
        author="Enterprise Knowledge Engine Team",
        since="3.1.0",
        tags=["planning", "roadmap", "modernization"],
    )

    def execute(self, context: ServiceContext) -> ServiceResult:
        """Execute planning service, transforming existing findings into roadmap."""
        result = ServiceResult()

        planning_findings = [
            f for f in context.knowledge_package.findings
            if f.category.value == "planning"
        ]
        planning_metrics = [
            m for m in context.knowledge_package.metrics
            if m.category.value == "planning"
        ]

        result.findings = planning_findings
        result.metrics = planning_metrics
        result.recommendations = context.knowledge_package.recommendations

        roadmap_data: Dict[str, Any] = {
            "total_findings": len(planning_findings),
            "total_metrics": len(planning_metrics),
            "modernization_candidates": [],
        }

        roadmap = Artifact(
            metadata=ArtifactMetadata(
                name="planning-roadmap",
                kind=ArtifactKind.PLANNING_ROADMAP,
                version="0.1.0",
                generated_by=self.metadata.id,
            ),
            payload=roadmap_data,
        )
        result.artifacts.append(roadmap)

        result.events.append({
            "type": "planning_roadmap_generated",
            "timestamp": context.clock.isoformat(),
            "service_id": self.metadata.id,
        })

        return result

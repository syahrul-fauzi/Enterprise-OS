# Enterprise Intelligence Runtime (Public Facade)
from typing import Optional, List
import time
import uuid

from eis.api.result import (
    AnalysisResult,
    Status,
    Metrics,
    EvidenceBundle
)
from eis.contracts.intelligence_package import EnterpriseIntelligencePackage
from eke.contracts.knowledge_package import KnowledgePackage
from eis.internal.engine.runtime import EnterpriseIntelligenceRuntime as InternalRuntime
from eis.internal.diagnostics import AnalysisDiagnostic
from eis.internal.evidence import AnalysisEvidence

# Import shared engine framework types
from shared.engine.result import EngineStatus


class EnterpriseIntelligenceRuntime:
    """
    Public facade for EIS Intelligence Runtime!
    Now uses shared Engine Framework!
    """
    def __init__(self):
        self._engine_runtime = InternalRuntime()

    def analyze(
        self,
        knowledge_package: KnowledgePackage,
        analyzer_ids: Optional[List[str]] = None,
        domains: Optional[List[str]] = None
    ) -> AnalysisResult:
        """
        Execute full intelligence pipeline: KnowledgePackage → EnterpriseIntelligencePackage!
        """
        result = self._engine_runtime.execute(
            knowledge_package,
            analyzer_ids=analyzer_ids,
            domains=domains
        )

        # Convert engine framework result to existing API's format
        old_status = Status.SUCCESS if result.status == EngineStatus.SUCCESS else Status.FAILURE
        old_diagnostics = [
            AnalysisDiagnostic(
                code=d.code,
                severity=d.severity.value,
                message=d.message,
                source=d.source
            ) for d in result.diagnostics
        ]

        # Build metrics based on output artifact
        findings_count = 0
        insights_count = 0
        recommendations_count = 0
        decision_options_count = 0
        portfolio_items_count = 0
        roadmap_items_count = 0
        if result.output_artifact:
            findings_count = len(result.output_artifact.manifest.findings)
            insights_count = len(result.output_artifact.manifest.insights)
            recommendations_count = len(result.output_artifact.manifest.recommendations)
            decision_options_count = len(result.output_artifact.manifest.decision_options)
            portfolio_items_count = len(result.output_artifact.manifest.portfolio_items)
            roadmap_items_count = len(result.output_artifact.manifest.roadmap_items)

        old_metrics = Metrics(
            duration_seconds=result.duration_seconds,
            findings_count=findings_count,
            insights_count=insights_count,
            recommendations_count=recommendations_count,
            decision_options_count=decision_options_count,
            portfolio_items_count=portfolio_items_count,
            roadmap_items_count=roadmap_items_count
        )

        old_evidence = None
        if result.evidence:
            old_evidence = EvidenceBundle(
                evidence_id=str(uuid.uuid4()),
                analysis_evidence=result.evidence
            )

        return AnalysisResult(
            status=old_status,
            intelligence_package=result.output_artifact,
            metrics=old_metrics,
            evidence=old_evidence,
            diagnostics=old_diagnostics,
            duration=result.duration_seconds
        )

    def replay(
        self,
        knowledge_package: KnowledgePackage,
        analysis_evidence: AnalysisEvidence
    ) -> AnalysisResult:
        """
        Re-execute analysis deterministically from saved evidence!
        """
        # TODO: Implement replay using the new framework's replay method
        return self.analyze(
            knowledge_package=knowledge_package,
            analyzer_ids=analysis_evidence.analyzer_ids
        )

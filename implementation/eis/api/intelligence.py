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
from eis.internal.engine.engine import EnterpriseIntelligenceEngine as InternalEngine
from eis.internal.diagnostics import AnalysisDiagnostic
from eis.internal.evidence import AnalysisEvidence


class EnterpriseIntelligenceRuntime:
    """
    Public facade for EIS Intelligence Runtime (symmetric to EKE!).
    Single entry point is `analyze()`.
    """
    def __init__(self):
        self._engine = InternalEngine()

    def analyze(
        self,
        knowledge_package: KnowledgePackage,
        analyzer_ids: Optional[List[str]] = None,
        domains: Optional[List[str]] = None
    ) -> AnalysisResult:
        """
        Execute full intelligence pipeline: KnowledgePackage → EnterpriseIntelligencePackage.
        Single public entry point (symmetric to EKE's compile())!
        """
        start = time.time()
        try:
            # Run internal engine
            intel_package, analysis_evidence = self._engine.execute(
                knowledge_package=knowledge_package,
                analyzer_ids=analyzer_ids,
                domains=domains
            )

            # Calculate metrics
            metrics = Metrics(
                duration_seconds=time.time() - start,
                findings_count=len(intel_package.manifest.findings),
                insights_count=len(intel_package.manifest.insights),
                recommendations_count=len(intel_package.manifest.recommendations),
                decision_options_count=len(intel_package.manifest.decision_options),
                portfolio_items_count=len(intel_package.manifest.portfolio_items),
                roadmap_items_count=len(intel_package.manifest.roadmap_items)
            )

            # Create evidence bundle
            evidence = EvidenceBundle(
                evidence_id=str(uuid.uuid4()),
                analysis_evidence=analysis_evidence
            )

            # Return AnalysisResult
            return AnalysisResult(
                status=Status.SUCCESS,
                intelligence_package=intel_package,
                metrics=metrics,
                evidence=evidence,
                duration=time.time() - start
            )
        except Exception as e:
            return AnalysisResult(
                status=Status.FAILURE,
                diagnostics=[AnalysisDiagnostic(
                    code="EIS-001",
                    severity="error",
                    message=str(e)
                )],
                duration=time.time() - start
            )

    def replay(
        self,
        knowledge_package: KnowledgePackage,
        analysis_evidence: AnalysisEvidence
    ) -> AnalysisResult:
        """
        Re-execute analysis deterministically from saved evidence!
        Symmetric to EKE's replay!
        """
        # Re-use the same analyzer_ids (or domains) from evidence
        return self.analyze(
            knowledge_package=knowledge_package,
            analyzer_ids=analysis_evidence.analyzer_ids
        )

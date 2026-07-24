#!/usr/bin/env python3
"""
EAEO Public API: Enterprise Architecture Orchestrator
"""
import uuid
from typing import Optional, List

from eis.contracts.intelligence_package import EnterpriseIntelligencePackage
from eaeo.contracts.mission_contract import MissionContract
from eaeo.api.result import AnalysisResult, Status, Metrics, EvidenceBundle
from eaeo.internal.evidence import MissionEvidence
from eaeo.internal.diagnostics import MissionDiagnostic
from eaeo.internal.engine.runtime import EnterpriseArchitectureOrchestrationRuntime
from shared.engine.result import EngineStatus


class EnterpriseArchitectureOrchestrator:
    """
    EAEO Public API Facade
    """

    def __init__(self):
        self._runtime = EnterpriseArchitectureOrchestrationRuntime()

    def analyze(
        self,
        intelligence_package: EnterpriseIntelligencePackage,
        **kwargs
    ) -> AnalysisResult:
        """
        Execute EAEO on an EnterpriseIntelligencePackage and produce a MissionContract
        """
        engine_result = self._runtime.execute(
            intelligence_package,
            **kwargs
        )

        old_status = Status.SUCCESS if engine_result.status == EngineStatus.SUCCESS else Status.FAILURE

        old_diagnostics: List[MissionDiagnostic] = [
            MissionDiagnostic(
                code=d.code,
                severity=d.severity.value,
                message=d.message,
                source=d.source
            ) for d in engine_result.diagnostics
        ]

        old_metrics = None
        if engine_result.metrics:
            old_metrics = Metrics(
                duration_seconds=engine_result.duration_seconds,
                num_missions=engine_result.metrics.get("num_missions", 0),
                num_objectives=engine_result.metrics.get("num_objectives", 0),
                num_tasks=engine_result.metrics.get("num_tasks", 0)
            )

        old_evidence = None
        if engine_result.evidence:
            old_evidence = EvidenceBundle(
                evidence_id=str(uuid.uuid4()),
                mission_evidence=engine_result.evidence
            )

        return AnalysisResult(
            status=old_status,
            mission_contract=engine_result.output_artifact,
            diagnostics=old_diagnostics,
            metrics=old_metrics,
            evidence=old_evidence,
            duration=engine_result.duration_seconds
        )

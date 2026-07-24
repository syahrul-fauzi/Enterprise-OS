#!/usr/bin/env python3
"""
MOS Public API: Mission Orchestration Executor
"""
import uuid
from typing import Optional, List

from ceos.contracts.authorization_decision import AuthorizationDecision
from mos.contracts.execution_ledger import ExecutionLedger
from mos.api.result import ExecutionResult, Status, Metrics, EvidenceBundle
from mos.internal.evidence import ExecutionEvidence
from mos.internal.diagnostics import ExecutionDiagnostic
from mos.internal.engine.runtime import MissionOrchestrationRuntime
from shared.engine.result import EngineStatus


class MissionOrchestrationExecutor:
    """MOS Public API Facade."""

    def __init__(self):
        self._runtime = MissionOrchestrationRuntime()

    def execute(
        self,
        authorization_decision: AuthorizationDecision,
        **kwargs
    ) -> ExecutionResult:
        """Execute MOS on an AuthorizationDecision and produce an ExecutionLedger."""
        engine_result = self._runtime.execute(
            authorization_decision,
            **kwargs
        )

        old_status = Status.SUCCESS if engine_result.status == EngineStatus.SUCCESS else Status.FAILURE

        old_diagnostics: List[ExecutionDiagnostic] = [
            ExecutionDiagnostic(
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
                num_execution_records=engine_result.metrics.get("num_execution_records", 0),
                overall_status=engine_result.metrics.get("overall_status")
            )

        old_evidence = None
        if engine_result.evidence:
            old_evidence = EvidenceBundle(
                evidence_id=str(uuid.uuid4()),
                execution_evidence=engine_result.evidence
            )

        return ExecutionResult(
            status=old_status,
            execution_ledger=engine_result.output_artifact,
            diagnostics=old_diagnostics,
            metrics=old_metrics,
            evidence=old_evidence,
            duration=engine_result.duration_seconds
        )

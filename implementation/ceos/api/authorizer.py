#!/usr/bin/env python3
"""
CEOS Public API: Compliance and Enterprise Authorization Authorizer
"""
import uuid
from typing import Optional, List

from eaeo.contracts.mission_contract import MissionContract
from ceos.contracts.authorization_decision import AuthorizationDecision
from ceos.api.result import AuthorizationResult, Status, Metrics, EvidenceBundle
from ceos.internal.evidence import AuthorizationEvidence
from ceos.internal.diagnostics import AuthorizationDiagnostic
from ceos.internal.engine.runtime import ComplianceEnterpriseAuthorizationRuntime
from shared.engine.result import EngineStatus


class ComplianceEnterpriseAuthorizationAuthorizer:
    """CEOS Public API Facade."""

    def __init__(self):
        self._runtime = ComplianceEnterpriseAuthorizationRuntime()

    def authorize(
        self,
        mission_contract: MissionContract,
        **kwargs
    ) -> AuthorizationResult:
        """Execute CEOS on a MissionContract and produce an AuthorizationDecision."""
        engine_result = self._runtime.execute(
            mission_contract,
            **kwargs
        )

        old_status = Status.SUCCESS if engine_result.status == EngineStatus.SUCCESS else Status.FAILURE

        old_diagnostics: List[AuthorizationDiagnostic] = [
            AuthorizationDiagnostic(
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
                num_policies=engine_result.metrics.get("num_policies", 0),
                overall_decision=engine_result.metrics.get("overall_decision")
            )

        old_evidence = None
        if engine_result.evidence:
            old_evidence = EvidenceBundle(
                evidence_id=str(uuid.uuid4()),
                authorization_evidence=engine_result.evidence
            )

        return AuthorizationResult(
            status=old_status,
            authorization_decision=engine_result.output_artifact,
            diagnostics=old_diagnostics,
            metrics=old_metrics,
            evidence=old_evidence,
            duration=engine_result.duration_seconds
        )

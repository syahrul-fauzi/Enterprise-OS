#!/usr/bin/env python3
"""
Compliance and Enterprise Authorization Runtime
Implements EngineRuntime from shared engine framework!
"""
from __future__ import annotations
import logging
from typing import Optional, Any, Dict
from datetime import datetime
import hashlib

from shared.engine.runtime import EngineRuntime
from shared.engine.context import EngineContext
from shared.engine.result import EngineResult, EngineStatus
from shared.engine.manifest import ExecutionManifest, EngineMetadata, ExecutionDetails, ArtifactDetails
from shared.engine.diagnostics import EngineDiagnostic, EngineDiagnosticSeverity
from shared.serialization.canonical import canonical_json

from eaeo.contracts.mission_contract import MissionContract
from ceos.contracts.authorization_decision import (
    AuthorizationDecision,
    AuthorizationDecisionMetadata,
    DecisionStatus,
    PolicyEvaluation
)
from ceos.internal.evidence import AuthorizationEvidence


logger = logging.getLogger(__name__)


class ComplianceEnterpriseAuthorizationRuntime(
    EngineRuntime[MissionContract, AuthorizationDecision, AuthorizationEvidence]
):
    """CEOS runtime implementing EngineRuntime interface."""

    def get_engine_metadata(self) -> EngineMetadata:
        """Return static CEOS metadata."""
        return EngineMetadata(
            engine_id="ceos",
            engine_name="Compliance and Enterprise Authorization System",
            engine_version="1.0.0",
            contract_version="1.0.0",
            capabilities=["authorize", "evaluate", "check_compliance"]
        )

    def execute(
        self,
        input_artifact: MissionContract,
        context: Optional[EngineContext] = None,
        **kwargs: Any
    ) -> EngineResult[AuthorizationDecision, AuthorizationEvidence]:
        """Execute CEOS: transform MissionContract into AuthorizationDecision."""
        start_time = datetime.utcnow()
        # Use from_parent() if context is provided to inherit correlation_id chain
        engine_ctx = EngineContext.from_parent(context) if context else EngineContext()
        diagnostics: list[EngineDiagnostic] = []

        try:
            # Create execution manifest
            exec_manifest = ExecutionManifest(
                engine_metadata=self.get_engine_metadata(),
                execution=ExecutionDetails(
                    correlation_id=engine_ctx.correlation_id,
                    started_at=start_time
                )
            )

            # Initialize evidence
            evidence = AuthorizationEvidence(
                execution_id=exec_manifest.execution.execution_id,
                started_at=start_time,
                configuration=kwargs.get("configuration", {})
            )

            # Create AuthorizationDecision (sample implementation!)
            decision_meta = AuthorizationDecisionMetadata(
                name=f"Authorization Decision from {input_artifact.metadata.name}"
            )
            sample_policy_evaluation = PolicyEvaluation(
                policy_id="ceos-policy-001",
                policy_name="Sample Compliance Check Mission",
                status=DecisionStatus.ALLOW,
                reason="All mission objectives are compliant with enterprise policies"
            )
            authorization_decision = AuthorizationDecision(
                metadata=decision_meta,
                overall_status=DecisionStatus.ALLOW,
                policy_evaluations=[sample_policy_evaluation]
            )
            authorization_decision.content_hash = authorization_decision.compute_content_hash()

            # Update evidence
            evidence.policy_ids_evaluated = [pe.policy_id for pe in authorization_decision.policy_evaluations]
            evidence.evaluation_trace = [
                {
                    "policy_id": pe.policy_id,
                    "policy_name": pe.policy_name,
                    "status": pe.status.value,
                    "reason": pe.reason
                } for pe in authorization_decision.policy_evaluations
            ]

            # Update manifest
            end_time = datetime.utcnow()
            exec_manifest.execution.finished_at = end_time
            exec_manifest.execution.duration_seconds = (end_time - start_time).total_seconds()
            exec_manifest.execution.status = "success"
            exec_manifest.artifacts.output_artifact_hash = authorization_decision.content_hash
            exec_manifest.artifacts.input_artifact_hash = input_artifact.content_hash
            # Set evidence id and hash
            exec_manifest.artifacts.evidence_id = exec_manifest.execution.execution_id
            exec_manifest.artifacts.evidence_hash = hashlib.sha256(
                canonical_json(evidence.to_dict()).encode("utf-8")
            ).hexdigest()
            exec_manifest.metrics = {
                "num_policies": len(authorization_decision.policy_evaluations),
                "overall_decision": authorization_decision.overall_status.value
            }
            evidence.finished_at = end_time

            return EngineResult(
                status=EngineStatus.SUCCESS,
                manifest=exec_manifest,
                output_artifact=authorization_decision,
                diagnostics=diagnostics,
                evidence=evidence,
                metrics=exec_manifest.metrics,
                duration_seconds=exec_manifest.execution.duration_seconds
            )

        except Exception as e:
            end_time = datetime.utcnow()
            error_diag = EngineDiagnostic(
                code="CEOS-001",
                severity=EngineDiagnosticSeverity.ERROR,
                message=str(e),
                source="ComplianceEnterpriseAuthorizationRuntime"
            )
            diagnostics.append(error_diag)

            exec_manifest = ExecutionManifest(
                engine_metadata=self.get_engine_metadata(),
                execution=ExecutionDetails(
                    correlation_id=engine_ctx.correlation_id,
                    started_at=start_time,
                    finished_at=end_time,
                    duration_seconds=(end_time - start_time).total_seconds(),
                    status="failure"
                ),
                metrics={
                    "duration_seconds": (end_time - start_time).total_seconds()
                }
            )

            return EngineResult(
                status=EngineStatus.FAILURE,
                manifest=exec_manifest,
                output_artifact=None,
                diagnostics=diagnostics,
                evidence=None,
                metrics=exec_manifest.metrics,
                duration_seconds=exec_manifest.execution.duration_seconds
            )

    def replay(self, manifest: ExecutionManifest, **kwargs: Any) -> EngineResult[AuthorizationDecision, AuthorizationEvidence]:
        raise NotImplementedError("Replay not yet implemented for CEOS!")
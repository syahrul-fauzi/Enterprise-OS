#!/usr/bin/env python3
"""
Mission Orchestration System Runtime
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

from ceos.contracts.authorization_decision import AuthorizationDecision
from mos.contracts.execution_ledger import (
    ExecutionLedger,
    ExecutionLedgerMetadata,
    ExecutionRecord,
    ExecutionStatus
)
from mos.contracts.evidence_bundle import EvidenceBundle
from mos.internal.evidence import ExecutionEvidence


logger = logging.getLogger(__name__)


class MissionOrchestrationRuntime(
    EngineRuntime[AuthorizationDecision, ExecutionLedger, ExecutionEvidence]
):
    """MOS runtime implementing EngineRuntime interface."""

    def get_engine_metadata(self) -> EngineMetadata:
        """Return static MOS metadata."""
        return EngineMetadata(
            engine_id="mos",
            engine_name="Mission Orchestration System",
            engine_version="1.0.0",
            contract_version="1.0.0",
            capabilities=["execute", "orchestrate", "ledger"]
        )

    def execute(
        self,
        input_artifact: AuthorizationDecision,
        context: Optional[EngineContext] = None,
        **kwargs: Any
    ) -> EngineResult[ExecutionLedger, ExecutionEvidence]:
        """Execute MOS: transform AuthorizationDecision into ExecutionLedger."""
        start_time = datetime.utcnow()
        engine_ctx = context or EngineContext()
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
            evidence = ExecutionEvidence(
                execution_id=exec_manifest.execution.execution_id,
                started_at=start_time,
                configuration=kwargs.get("configuration", {})
            )

            # Create Execution Ledger (sample implementation!)
            ledger_meta = ExecutionLedgerMetadata(
                name=f"Execution Ledger for {input_artifact.metadata.name}"
            )
            sample_execution_record = ExecutionRecord(
                engine_id="mos",
                engine_name="Mission Orchestration System",
                engine_version="1.0.0",
                execution_id=exec_manifest.execution.execution_id,
                correlation_id=engine_ctx.correlation_id,
                started_at=start_time,
                status=ExecutionStatus.SUCCESS,
                input_artifact_hash=input_artifact.content_hash
            )
            execution_ledger = ExecutionLedger(
                metadata=ledger_meta,
                execution_records=[sample_execution_record]
            )
            execution_ledger.content_hash = execution_ledger.compute_content_hash()

            # Update evidence
            evidence.mission_ids = [
                f"mission-{i}" for i in range(len(execution_ledger.execution_records))
            ]
            evidence.execution_trace = [
                {
                    "record_id": rec.execution_id,
                    "engine_id": rec.engine_id,
                    "status": rec.status.value
                } for rec in execution_ledger.execution_records
            ]

            # Update manifest
            end_time = datetime.utcnow()
            exec_manifest.execution.finished_at = end_time
            exec_manifest.execution.duration_seconds = (end_time - start_time).total_seconds()
            exec_manifest.execution.status = "success"
            exec_manifest.artifacts.output_artifact_hash = execution_ledger.content_hash
            exec_manifest.artifacts.input_artifact_hash = input_artifact.content_hash
            # Set evidence id and hash
            exec_manifest.artifacts.evidence_id = exec_manifest.execution.execution_id
            exec_manifest.artifacts.evidence_hash = hashlib.sha256(
                canonical_json(evidence.to_dict()).encode("utf-8")
            ).hexdigest()
            exec_manifest.metrics = {
                "num_execution_records": len(execution_ledger.execution_records),
                "overall_status": execution_ledger.execution_records[0].status.value
            }
            evidence.finished_at = end_time

            return EngineResult(
                status=EngineStatus.SUCCESS,
                manifest=exec_manifest,
                output_artifact=execution_ledger,
                diagnostics=diagnostics,
                evidence=evidence,
                metrics=exec_manifest.metrics,
                duration_seconds=exec_manifest.execution.duration_seconds
            )

        except Exception as e:
            end_time = datetime.utcnow()
            error_diag = EngineDiagnostic(
                code="MOS-001",
                severity=EngineDiagnosticSeverity.ERROR,
                message=str(e),
                source="MissionOrchestrationRuntime"
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

    def replay(self, manifest: ExecutionManifest, **kwargs: Any) -> EngineResult[ExecutionLedger, ExecutionEvidence]:
        raise NotImplementedError("Replay not yet implemented for MOS!")

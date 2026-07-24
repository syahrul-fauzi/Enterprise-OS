#!/usr/bin/env python3
"""
Enterprise Intelligence Services (EIS) Runtime
Implements shared.engine.EngineRuntime
"""
from __future__ import annotations
import logging
from typing import Optional, Any, Dict
from datetime import datetime
import hashlib
from shared.serialization.canonical import canonical_json

from shared.engine.runtime import EngineRuntime
from shared.engine.context import EngineContext
from shared.engine.result import EngineResult, EngineStatus
from shared.engine.manifest import ExecutionManifest, EngineMetadata, ExecutionDetails, ArtifactDetails
from shared.engine.diagnostics import EngineDiagnostic, EngineDiagnosticSeverity

from eke.contracts.knowledge_package import KnowledgePackage
from eis.contracts.intelligence_package import EnterpriseIntelligencePackage, IntelligenceManifest
from eis.internal.engine.engine import EnterpriseIntelligenceEngine
from eis.internal.evidence import AnalysisEvidence


logger = logging.getLogger(__name__)


class EnterpriseIntelligenceRuntime(EngineRuntime[KnowledgePackage, EnterpriseIntelligencePackage, AnalysisEvidence]):
    """
    EIS's Runtime implementation using the shared Engine Framework
    """

    def get_engine_metadata(self) -> EngineMetadata:
        """Return static metadata about EIS"""
        return EngineMetadata(
            engine_id="eis",
            engine_name="Enterprise Intelligence Services",
            engine_version="1.0.0",
            contract_version="1.0.0",
            capabilities=["analyze", "synthesize", "recommend"]
        )

    def execute(
        self,
        input_artifact: KnowledgePackage,
        context: Optional[EngineContext] = None,
        **kwargs: Any
    ) -> EngineResult[EnterpriseIntelligencePackage, AnalysisEvidence]:
        """
        Execute the full EIS analysis pipeline
        """
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

            # Get optional params
            analyzer_ids = kwargs.get("analyzer_ids")
            domains = kwargs.get("domains")

            # Initialize internal engine
            internal_engine = EnterpriseIntelligenceEngine(configuration=kwargs.get("configuration"))

            # Execute and get results
            intel_package, analysis_evidence = internal_engine.execute(
                knowledge_package=input_artifact,
                analyzer_ids=analyzer_ids,
                domains=domains
            )

            # Update evidence timestamps and execution id
            analysis_evidence.execution_id = exec_manifest.execution.execution_id
            analysis_evidence.started_at = start_time
            analysis_evidence.finished_at = datetime.utcnow()

            # Complete manifest
            end_time = analysis_evidence.finished_at
            exec_manifest.execution.finished_at = end_time
            exec_manifest.execution.duration_seconds = (end_time - start_time).total_seconds()
            exec_manifest.execution.status = "success"
            exec_manifest.artifacts.output_artifact_hash = intel_package.content_hash
            if input_artifact.content_hash:
                exec_manifest.artifacts.input_artifact_hash = input_artifact.content_hash
            # Set evidence id and hash
            exec_manifest.artifacts.evidence_id = exec_manifest.execution.execution_id
            exec_manifest.artifacts.evidence_hash = hashlib.sha256(
                canonical_json(analysis_evidence.to_dict()).encode("utf-8")
            ).hexdigest()
            exec_manifest.metrics = {"duration_sec": exec_manifest.execution.duration_seconds}

            return EngineResult(
                status=EngineStatus.SUCCESS,
                manifest=exec_manifest,
                output_artifact=intel_package,
                diagnostics=diagnostics,
                evidence=analysis_evidence,
                metrics={"duration_sec": exec_manifest.execution.duration_seconds},
                duration_seconds=exec_manifest.execution.duration_seconds
            )

        except Exception as e:
            end_time = datetime.utcnow()
            error_diagnostic = EngineDiagnostic(
                code="EIS-001",
                severity=EngineDiagnosticSeverity.ERROR,
                message=str(e),
                source="EnterpriseIntelligenceRuntime"
            )
            diagnostics.append(error_diagnostic)

            exec_manifest = ExecutionManifest(
                engine_metadata=self.get_engine_metadata(),
                execution=ExecutionDetails(
                    correlation_id=engine_ctx.correlation_id,
                    started_at=start_time,
                    finished_at=end_time,
                    duration_seconds=(end_time - start_time).total_seconds(),
                    status="failure"
                ),
                metrics={"duration_sec": (end_time - start_time).total_seconds()}
            )

            return EngineResult(
                status=EngineStatus.FAILURE,
                manifest=exec_manifest,
                output_artifact=None,
                diagnostics=diagnostics,
                evidence=None,
                metrics={"duration_sec": exec_manifest.duration_seconds},
                duration_seconds=exec_manifest.duration_seconds
            )

    def replay(self, manifest: ExecutionManifest, **kwargs: Any) -> EngineResult[EnterpriseIntelligencePackage, AnalysisEvidence]:
        """
        Replay an execution from manifest and evidence
        TODO: Implement full replay
        """
        raise NotImplementedError("Replay not implemented yet for EIS")

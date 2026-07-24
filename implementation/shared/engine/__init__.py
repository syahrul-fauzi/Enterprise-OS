# Enterprise OS Engine Framework (Shared)
"""
Engine Framework: shared lifecycle, contracts, and base classes
for all EOS engines (EKE, EIS, EAEO, CEOS, MOS)
"""
from shared.engine.context import EngineContext
from shared.engine.diagnostics import (
    EngineDiagnostic,
    EngineDiagnosticSeverity,
    EngineDiagnosticEngine
)
from shared.engine.evidence import BaseEngineEvidence
from shared.engine.manifest import EngineMetadata, ExecutionManifest, ExecutionDetails, ArtifactDetails
from shared.engine.result import EngineResult, EngineStatus
from shared.engine.runtime import EngineRuntime

__all__ = [
    "EngineContext",
    "EngineDiagnostic",
    "EngineDiagnosticSeverity",
    "EngineDiagnosticEngine",
    "BaseEngineEvidence",
    "EngineMetadata",
    "ExecutionManifest",
    "ExecutionDetails",
    "ArtifactDetails",
    "EngineResult",
    "EngineStatus",
    "EngineRuntime"
]

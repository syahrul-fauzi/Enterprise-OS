# Base Engine Result
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional, TypeVar, Generic

from shared.engine.diagnostics import EngineDiagnostic
from shared.engine.manifest import EngineManifest
from shared.engine.evidence import BaseEngineEvidence


OutputT = TypeVar('OutputT')  # Output Artifact Type
EvidenceT = TypeVar('EvidenceT', bound=BaseEngineEvidence)  # Engine-specific Evidence


class EngineStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    PENDING = "pending"


@dataclass
class EngineResult(Generic[OutputT, EvidenceT]):
    """
    Base Result for all engine operations!
    """
    status: EngineStatus
    manifest: EngineManifest
    output_artifact: Optional[OutputT] = None
    diagnostics: list[EngineDiagnostic] = field(default_factory=list)
    evidence: Optional[EvidenceT] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    duration_seconds: float = 0.0
    additional_outputs: Dict[str, Any] = field(default_factory=dict)

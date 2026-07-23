# Base Engine Context
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from datetime import datetime
import uuid

from shared.engine.diagnostics import EngineDiagnosticEngine


@dataclass
class EngineContext:
    """
    Base Execution Context for all EOS engines!
    Attributes common to every engine's execution:
    - execution_id: unique ID for this run
    - correlation_id: to link this run to others in a chain
    - engine_version: version of the engine
    - configuration: engine config
    - diagnostics: diagnostic engine
    - started_at: timestamp when execution began
    - provenance: dict for tracking origins
    - metrics: dict for runtime metrics
    """
    execution_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: Optional[str] = None
    engine_version: str = "1.0.0"
    configuration: Dict[str, Any] = field(default_factory=dict)
    diagnostics: EngineDiagnosticEngine = field(default_factory=EngineDiagnosticEngine)
    started_at: datetime = field(default_factory=datetime.utcnow)
    provenance: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)

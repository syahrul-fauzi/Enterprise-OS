# Shared Metadata Contract
# Re-exporting from engine framework to avoid duplicates
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from shared.engine.manifest import EngineMetadata


@dataclass
class Provenance:
    source_engine: str
    source_operation: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    additional_data: Dict[str, Any] = field(default_factory=dict)

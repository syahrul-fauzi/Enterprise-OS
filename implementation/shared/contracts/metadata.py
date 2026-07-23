# Shared Metadata Contract
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class EngineMetadata:
    engine_id: str
    engine_version: str
    generated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Provenance:
    source_engine: str
    source_operation: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    additional_data: Dict[str, Any] = field(default_factory=dict)

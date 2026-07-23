# Shared Envelope Contract
from dataclasses import dataclass, field
from typing import Optional, Any, Dict
from shared.contracts.metadata import EngineMetadata, Provenance


@dataclass
class ContractEnvelope:
    metadata: EngineMetadata
    payload: Any
    provenance: Optional[Provenance] = None
    additional_headers: Dict[str, Any] = field(default_factory=dict)

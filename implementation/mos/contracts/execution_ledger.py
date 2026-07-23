# ExecutionLedger Contract
from dataclasses import dataclass, field
from typing import Any, List, Dict
from datetime import datetime


@dataclass
class ExecutionEntry:
    timestamp: datetime = field(default_factory=datetime.utcnow)
    event_type: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)
    provenance: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionLedger:
    """
    Public contract for ExecutionLedger output from MOS
    """
    ledger_id: str = ""
    entries: List[ExecutionEntry] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ledger_id": self.ledger_id,
            "entries": [
                {
                    "timestamp": entry.timestamp.isoformat(),
                    "event_type": entry.event_type,
                    "payload": entry.payload,
                    "provenance": entry.provenance
                }
                for entry in self.entries
            ],
            "metadata": self.metadata
        }

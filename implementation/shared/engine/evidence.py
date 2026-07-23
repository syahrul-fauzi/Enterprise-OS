# Base Engine Evidence
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime


@dataclass
class BaseEngineEvidence:
    """
    Base Evidence class!
    Captures what happened during execution for audit/replay.
    """
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    configuration_hash: Optional[str] = None
    input_artifact_hash: Optional[str] = None
    items: List[Dict[str, Any]] = field(default_factory=list)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "configuration_hash": self.configuration_hash,
            "input_artifact_hash": self.input_artifact_hash,
            "items": self.items,
            "notes": self.notes
        }

    @classmethod
    def from_dict(cls, data: dict) -> "BaseEngineEvidence":
        return cls(
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            finished_at=datetime.fromisoformat(data["finished_at"]) if data.get("finished_at") else None,
            configuration_hash=data.get("configuration_hash"),
            input_artifact_hash=data.get("input_artifact_hash"),
            items=data.get("items", []),
            notes=data.get("notes")
        )

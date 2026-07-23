# Finding Model (Enterprise Intelligence Model v1)
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class Finding:
    """Immutable finding from an analyzer."""
    finding_id: str
    severity: str  # "info", "warning", "error", "critical"
    title: str
    description: str
    source_analyzer: str
    source_artifact: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_id": self.finding_id,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "source_analyzer": self.source_analyzer,
            "source_artifact": self.source_artifact,
            "generated_at": self.generated_at.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Finding":
        return cls(
            finding_id=data["finding_id"],
            severity=data["severity"],
            title=data["title"],
            description=data["description"],
            source_analyzer=data["source_analyzer"],
            source_artifact=data.get("source_artifact"),
            generated_at=datetime.fromisoformat(data["generated_at"]),
            metadata=data.get("metadata", {})
        )

# Insight Model (Enterprise Intelligence Model v1)
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from eis.model.finding import Finding


@dataclass
class Insight:
    """Immutable insight synthesized from one or more findings."""
    insight_id: str
    title: str
    description: str
    source_findings: List[str]  # List of finding IDs this insight is based on
    source_analyzer: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "title": self.title,
            "description": self.description,
            "source_findings": self.source_findings,
            "source_analyzer": self.source_analyzer,
            "generated_at": self.generated_at.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Insight":
        return cls(
            insight_id=data["insight_id"],
            title=data["title"],
            description=data["description"],
            source_findings=data["source_findings"],
            source_analyzer=data["source_analyzer"],
            generated_at=datetime.fromisoformat(data["generated_at"]),
            metadata=data.get("metadata", {})
        )

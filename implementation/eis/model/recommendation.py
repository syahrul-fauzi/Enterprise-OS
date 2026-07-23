# Recommendation Model (Enterprise Intelligence Model v1)
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from eis.model.insight import Insight


@dataclass
class Recommendation:
    """Immutable recommendation synthesized from one or more insights."""
    recommendation_id: str
    title: str
    description: str
    priority: str  # "low", "medium", "high", "critical"
    source_insights: List[str]  # List of insight IDs this recommendation is based on
    source_analyzer: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "recommendation_id": self.recommendation_id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "source_insights": self.source_insights,
            "source_analyzer": self.source_analyzer,
            "generated_at": self.generated_at.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Recommendation":
        return cls(
            recommendation_id=data["recommendation_id"],
            title=data["title"],
            description=data["description"],
            priority=data["priority"],
            source_insights=data["source_insights"],
            source_analyzer=data["source_analyzer"],
            generated_at=datetime.fromisoformat(data["generated_at"]),
            metadata=data.get("metadata", {})
        )

# Decision Option Model (Enterprise Intelligence Model v1)
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from eis.model.recommendation import Recommendation


@dataclass
class DecisionOption:
    """Immutable decision option for EAEO to consider."""
    decision_option_id: str
    title: str
    description: str
    source_recommendations: List[str]  # List of recommendation IDs
    cost_estimate: Optional[str] = None
    time_estimate: Optional[str] = None
    risk_estimate: Optional[str] = None
    source_analyzer: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision_option_id": self.decision_option_id,
            "title": self.title,
            "description": self.description,
            "source_recommendations": self.source_recommendations,
            "cost_estimate": self.cost_estimate,
            "time_estimate": self.time_estimate,
            "risk_estimate": self.risk_estimate,
            "source_analyzer": self.source_analyzer,
            "generated_at": self.generated_at.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionOption":
        return cls(
            decision_option_id=data["decision_option_id"],
            title=data["title"],
            description=data["description"],
            source_recommendations=data["source_recommendations"],
            cost_estimate=data.get("cost_estimate"),
            time_estimate=data.get("time_estimate"),
            risk_estimate=data.get("risk_estimate"),
            source_analyzer=data["source_analyzer"],
            generated_at=datetime.fromisoformat(data["generated_at"]),
            metadata=data.get("metadata", {})
        )

# Portfolio Item Model (Enterprise Intelligence Model v1)
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from eis.model.decision_option import DecisionOption


@dataclass
class PortfolioItem:
    """Immutable portfolio item (proposed initiative or change)."""
    portfolio_item_id: str
    title: str
    description: str
    source_decision_options: List[str]  # List of decision option IDs
    status: str  # "proposed", "planned", "in_progress", "completed"
    source_analyzer: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "portfolio_item_id": self.portfolio_item_id,
            "title": self.title,
            "description": self.description,
            "source_decision_options": self.source_decision_options,
            "status": self.status,
            "source_analyzer": self.source_analyzer,
            "generated_at": self.generated_at.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PortfolioItem":
        return cls(
            portfolio_item_id=data["portfolio_item_id"],
            title=data["title"],
            description=data["description"],
            source_decision_options=data["source_decision_options"],
            status=data["status"],
            source_analyzer=data["source_analyzer"],
            generated_at=datetime.fromisoformat(data["generated_at"]),
            metadata=data.get("metadata", {})
        )

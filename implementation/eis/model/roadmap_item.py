# Roadmap Item Model (Enterprise Intelligence Model v1)
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from eis.model.portfolio_item import PortfolioItem


@dataclass
class RoadmapItem:
    """Immutable roadmap item (timed initiative or change)."""
    roadmap_item_id: str
    title: str
    description: str
    source_portfolio_items: List[str]  # List of portfolio item IDs
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    dependencies: List[str] = field(default_factory=list)  # List of roadmap item IDs
    source_analyzer: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "roadmap_item_id": self.roadmap_item_id,
            "title": self.title,
            "description": self.description,
            "source_portfolio_items": self.source_portfolio_items,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "dependencies": self.dependencies,
            "source_analyzer": self.source_analyzer,
            "generated_at": self.generated_at.isoformat(),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RoadmapItem":
        return cls(
            roadmap_item_id=data["roadmap_item_id"],
            title=data["title"],
            description=data["description"],
            source_portfolio_items=data["source_portfolio_items"],
            start_date=datetime.fromisoformat(data["start_date"]) if data.get("start_date") else None,
            end_date=datetime.fromisoformat(data["end_date"]) if data.get("end_date") else None,
            dependencies=data.get("dependencies", []),
            source_analyzer=data["source_analyzer"],
            generated_at=datetime.fromisoformat(data["generated_at"]),
            metadata=data.get("metadata", {})
        )

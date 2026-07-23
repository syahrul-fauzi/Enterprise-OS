# Roadmap Builder
from typing import List
from eis.model.portfolio_item import PortfolioItem
from eis.model.roadmap_item import RoadmapItem
import uuid


class RoadmapBuilder:
    """
    Builds RoadmapItems from a list of PortfolioItems.
    Deterministic!
    """
    def build(self, portfolio_items: List[PortfolioItem]) -> List[RoadmapItem]:
        roadmap_items = []
        for item in portfolio_items:
            roadmap_item = RoadmapItem(
                roadmap_item_id=f"roadmap-{str(uuid.uuid4())}",
                title=f"Roadmap: {item.title}",
                description=f"Roadmap item based on portfolio item: {item.description}",
                source_portfolio_items=[item.portfolio_item_id],
                source_analyzer="roadmap-builder"
            )
            roadmap_items.append(roadmap_item)
        return roadmap_items

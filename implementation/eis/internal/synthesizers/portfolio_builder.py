# Portfolio Builder
from typing import List
from eis.model.decision_option import DecisionOption
from eis.model.portfolio_item import PortfolioItem
import uuid


class PortfolioBuilder:
    """
    Builds PortfolioItems from a list of DecisionOptions.
    Deterministic!
    """
    def build(self, decision_options: List[DecisionOption]) -> List[PortfolioItem]:
        portfolio_items = []
        for option in decision_options:
            item = PortfolioItem(
                portfolio_item_id=f"portfolio-{str(uuid.uuid4())}",
                title=f"Proposed: {option.title}",
                description=f"Portfolio item based on decision option: {option.description}",
                source_decision_options=[option.decision_option_id],
                status="proposed",
                source_analyzer="portfolio-builder"
            )
            portfolio_items.append(item)
        return portfolio_items

# Decision Builder
from typing import List
from eis.model.recommendation import Recommendation
from eis.model.decision_option import DecisionOption
import uuid


class DecisionBuilder:
    """
    Builds DecisionOptions from a list of Recommendations.
    Deterministic!
    """
    def build(self, recommendations: List[Recommendation]) -> List[DecisionOption]:
        decision_options = []
        for recommendation in recommendations:
            option = DecisionOption(
                decision_option_id=f"option-{str(uuid.uuid4())}",
                title=f"Option: {recommendation.title}",
                description=f"Decision option based on recommendation: {recommendation.description}",
                source_recommendations=[recommendation.recommendation_id],
                source_analyzer="decision-builder"
            )
            decision_options.append(option)
        return decision_options

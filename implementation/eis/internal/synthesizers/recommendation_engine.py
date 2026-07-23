# Recommendation Engine
from typing import List
from eis.model.insight import Insight
from eis.model.recommendation import Recommendation
import uuid


class RecommendationEngine:
    """
    Generates Recommendations from a list of Insights.
    Deterministic!
    """
    def generate(self, insights: List[Insight]) -> List[Recommendation]:
        recommendations = []
        for insight in insights:
            recommendation = Recommendation(
                recommendation_id=f"rec-{str(uuid.uuid4())}",
                title=f"Address: {insight.title}",
                description=f"Recommendation based on insight: {insight.description}",
                priority="medium",
                source_insights=[insight.insight_id],
                source_analyzer="recommendation-engine"
            )
            recommendations.append(recommendation)
        return recommendations

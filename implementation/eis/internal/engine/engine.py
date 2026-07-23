"""
Enterprise Intelligence Engine — orchestrates the full intelligence pipeline.
"""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

from eke.contracts.knowledge_package import KnowledgePackage
from eis.contracts.intelligence_package import (
    EnterpriseIntelligencePackage,
    IntelligenceManifest
)
from eis.internal.base import AnalysisContext
from eis.internal.evidence import AnalysisEvidence
from eis.internal.registry.analysis_registry import analysis_registry
from eis.internal.synthesizers.insight_synthesizer import InsightSynthesizer
from eis.internal.synthesizers.recommendation_engine import RecommendationEngine
from eis.internal.synthesizers.decision_builder import DecisionBuilder
from eis.internal.synthesizers.portfolio_builder import PortfolioBuilder
from eis.internal.synthesizers.roadmap_builder import RoadmapBuilder


class EnterpriseIntelligenceEngine:
    """
    Orchestrates the full Enterprise Intelligence Pipeline:
    Knowledge Package → Analyzers → Findings → Insight Synthesizer → Insights → Recommendation Engine →
    Recommendations → Decision Builder → Decision Options → Portfolio Builder → Portfolio Items →
    Roadmap Builder → Enterprise Intelligence Package
    """

    def __init__(self, configuration: Optional[Dict[str, Any]] = None):
        self.configuration = configuration or {}
        self.logger = logging.getLogger(__name__)

        # Initialize pipeline components
        self.insight_synthesizer = InsightSynthesizer()
        self.recommendation_engine = RecommendationEngine()
        self.decision_builder = DecisionBuilder()
        self.portfolio_builder = PortfolioBuilder()
        self.roadmap_builder = RoadmapBuilder()

    def execute(
        self,
        knowledge_package: KnowledgePackage,
        analyzer_ids: Optional[List[str]] = None,
        domains: Optional[List[str]] = None,
    ) -> Tuple[EnterpriseIntelligencePackage, AnalysisEvidence]:
        """
        Execute the full intelligence pipeline using AnalysisContext.
        Returns (intelligence_package, analysis_evidence).
        Deterministic!
        """
        # Initialize analysis context and evidence
        started_at = datetime.utcnow()
        context = AnalysisContext(
            knowledge_package=knowledge_package,
            configuration=self.configuration
        )
        analysis_evidence = AnalysisEvidence(
            configuration=self.configuration,
            started_at=started_at
        )

        # Step 1: Collect all findings from analyzers
        findings = []
        if analyzer_ids:
            analyzers = [analysis_registry.get(id) for id in analyzer_ids if analysis_registry.get(id)]
        elif domains:
            analyzers = []
            for domain in domains:
                analyzers.extend(analysis_registry.by_domain(domain))
        else:
            analyzers = analysis_registry.all()

        analysis_evidence.analyzer_ids = [a.analyzer_id for a in analyzers]

        for analyzer in analyzers:
            findings.extend(analyzer.analyze(knowledge_package))

        analysis_evidence.finding_ids = [f.finding_id for f in findings]

        # Step 2: Synthesize insights from findings
        insights = self.insight_synthesizer.synthesize(findings)
        analysis_evidence.insight_ids = [i.insight_id for i in insights]

        # Step 3: Generate recommendations from insights
        recommendations = self.recommendation_engine.generate(insights)
        analysis_evidence.recommendation_ids = [r.recommendation_id for r in recommendations]

        # Step 4: Build decision options from recommendations
        decision_options = self.decision_builder.build(recommendations)

        # Step 5: Build portfolio items from decision options
        portfolio_items = self.portfolio_builder.build(decision_options)

        # Step 6: Build roadmap items from portfolio items
        roadmap_items = self.roadmap_builder.build(portfolio_items)

        # Step 7: Assemble Enterprise Intelligence Package
        manifest = IntelligenceManifest(
            package_id=f"{knowledge_package.metadata.package_id}-intelligence",
            version="1.0.0",
            findings=findings,
            insights=insights,
            recommendations=recommendations,
            decision_options=decision_options,
            portfolio_items=portfolio_items,
            roadmap_items=roadmap_items
        )
        intelligence_package = EnterpriseIntelligencePackage(
            knowledge_package=knowledge_package,
            manifest=manifest
        )
        intelligence_package.content_hash = intelligence_package.compute_content_hash()

        analysis_evidence.completed_at = datetime.utcnow()
        return intelligence_package, analysis_evidence


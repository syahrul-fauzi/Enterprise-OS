#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Planning Intelligence Reasoning Rule
Analyzes modernization waves, dependencies, and transformation roadmap candidates.
"""
from typing import Dict, Any, List
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata
from eke.knowledge import (
    Finding, FindingSeverity, FindingCategory,
    Metric, MetricCategory,
    Recommendation, RecommendationPriority,
    Evidence
)
import uuid


class PlanningAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-011",
        name="Planning Analysis",
        description="Analyzes modernization waves, dependency mapping, and transformation roadmap candidates",
        category="planning",
        domain="planning",
        type="assessment",
        depends_on=["EKL-R-005", "EKL-R-006"],  # Dependency & Impact Analysis
        produces=["findings", "metrics", "recommendations", "evidence"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        findings: List[Finding] = []
        metrics: List[Metric] = []
        recommendations: List[Recommendation] = []
        evidence_list: List[Evidence] = []

        total_assets = 0
        modernization_candidates = []
        critical_path_assets = []
        infrastructure_assets = []
        platform_assets = []
        application_assets = []

        for obj in view.find_objects():
            total_assets += 1
            # Categorize assets by type (simple heuristic based on ID/type for now)
            obj_type = obj.type.lower() if obj.type else ""
            obj_id = obj.id.lower()
            if "infrastructure" in obj_id or "infra" in obj_id or obj_type in ["infrastructure", "infra"]:
                infrastructure_assets.append(obj.id)
            elif "platform" in obj_id or obj_type in ["platform"]:
                platform_assets.append(obj.id)
            elif "application" in obj_id or "app" in obj_id or obj_type in ["application", "app"]:
                application_assets.append(obj.id)

        # Identify modernization candidates (assets with many dependents, high impact)
        # For now, use a simple heuristic: assets with >2 dependents (predecessors)
        for obj in view.find_objects():
            dependents = view.predecessors(obj)
            if len(dependents) > 2:
                modernization_candidates.append(obj.id)

        # Identify critical path assets (assets that are both high impact and critical)
        # For now, we'll use the same heuristic as above
        critical_path_assets = []
        for obj_id in modernization_candidates:
            obj = view.get_object(obj_id)
            if obj and len(view.predecessors(obj)) > 4:
                critical_path_assets.append(obj_id)

        # Create metrics
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Total Assets",
            value=total_assets,
            category=MetricCategory.PLANNING,
            description="Total number of assets under planning",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Infrastructure Assets",
            value=len(infrastructure_assets),
            category=MetricCategory.PLANNING,
            description="Number of infrastructure assets (Wave 1 candidates)",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Platform Assets",
            value=len(platform_assets),
            category=MetricCategory.PLANNING,
            description="Number of platform assets (Wave 2 candidates)",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Application Assets",
            value=len(application_assets),
            category=MetricCategory.PLANNING,
            description="Number of application assets (Wave 3 candidates)",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Modernization Candidates",
            value=len(modernization_candidates),
            category=MetricCategory.PLANNING,
            description="Number of assets identified as modernization candidates",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Critical Path Assets",
            value=len(critical_path_assets),
            category=MetricCategory.PLANNING,
            description="Number of critical path assets with high dependency impact",
            computed_by=self.metadata.id
        ))

        # Create findings if no modernization candidates identified
        if total_assets > 0 and len(modernization_candidates) == 0:
            findings.append(Finding(
                id=str(uuid.uuid4()),
                title="No Modernization Candidates Identified",
                description="No assets were identified as modernization candidates based on dependency analysis",
                category=FindingCategory.PLANNING,
                severity=FindingSeverity.INFO,
                rule_id=self.metadata.id,
                rule_version=self.metadata.version,
                message="Consider reviewing asset dependencies to identify modernization priorities",
                related_objects=[],
                recommendation_ids=[]
            ))

        # Create recommendations for modernization waves
        if infrastructure_assets:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                title="Wave 1: Modernize Infrastructure Assets",
                description=f"Modernize {len(infrastructure_assets)} infrastructure asset(s) first",
                priority=RecommendationPriority.HIGH,
                applies_to=infrastructure_assets,
                generated_by=self.metadata.id
            ))
        if platform_assets:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                title="Wave 2: Modernize Platform Assets",
                description=f"Modernize {len(platform_assets)} platform asset(s) second",
                priority=RecommendationPriority.MEDIUM,
                applies_to=platform_assets,
                generated_by=self.metadata.id
            ))
        if application_assets:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                title="Wave 3: Modernize Application Assets",
                description=f"Modernize {len(application_assets)} application asset(s) third",
                priority=RecommendationPriority.MEDIUM,
                applies_to=application_assets,
                generated_by=self.metadata.id
            ))
        if modernization_candidates:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                title="Prioritize High-Impact Modernization",
                description=f"Prioritize modernization of {len(modernization_candidates)} candidate asset(s)",
                priority=RecommendationPriority.HIGH,
                applies_to=modernization_candidates,
                generated_by=self.metadata.id
            ))

        # Create evidence
        if modernization_candidates:
            evidence_list.append(Evidence(
                object_ids=modernization_candidates,
                notes="These assets have multiple dependents and were identified as modernization candidates"
            ))

        return {
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list,
            "total_assets": total_assets,
            "infrastructure_assets": infrastructure_assets,
            "platform_assets": platform_assets,
            "application_assets": application_assets,
            "modernization_candidates": modernization_candidates,
            "critical_path_assets": critical_path_assets
        }

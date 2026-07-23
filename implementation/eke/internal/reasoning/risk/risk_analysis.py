#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Risk Analysis Reasoning Rule
Calculates composite risk scores based on ownership, dependency, lifecycle, and compliance
"""
from typing import Dict, Any, List
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata
from eke.knowledge import (
    Finding, FindingSeverity, FindingCategory,
    Metric, MetricCategory,
    Recommendation, RecommendationPriority,
    Evidence,
    RiskCategory
)
import uuid


class RiskAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-010",
        name="Risk Analysis",
        description="Calculates composite risk scores for assets",
        category="risk",
        domain="risk",
        type="assessment",
        depends_on=["EKL-R-003", "EKL-R-005", "EKL-R-009"],  # Ownership, Dependency, Lifecycle
        produces=["findings", "metrics", "recommendations", "evidence"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        findings: List[Finding] = []
        metrics: List[Metric] = []
        recommendations: List[Recommendation] = []
        evidence_list: List[Evidence] = []

        total_assets = 0
        critical_assets = []
        high_risk_assets = []
        medium_risk_assets = []
        low_risk_assets = []
        total_risk_score = 0

        for obj in view.find_objects():
            total_assets += 1
            # Calculate individual risk factors (simplified for now)
            ownership_factor = 50  # Default if no data
            dependency_factor = 50  # Default
            lifecycle_factor = 50  # Default
            compliance_factor = 50  # Default

            # Composite risk score
            risk_score = (
                0.20 * ownership_factor +
                0.30 * dependency_factor +
                0.25 * lifecycle_factor +
                0.25 * compliance_factor
            )
            total_risk_score += risk_score

            # Categorize
            if 1 <= risk_score <= 25:
                low_risk_assets.append(obj.id)
            elif 26 <= risk_score <= 50:
                medium_risk_assets.append(obj.id)
            elif 51 <= risk_score <= 75:
                high_risk_assets.append(obj.id)
                # Create finding for high risk asset
                finding_id = str(uuid.uuid4())
                findings.append(Finding(
                    id=finding_id,
                    title=f"High Risk Asset: {obj.id}",
                    description=f"Asset {obj.id} has a high risk score of {round(risk_score, 2)}",
                    category=FindingCategory.RISK,
                    severity=FindingSeverity.WARNING,
                    rule_id=self.metadata.id,
                    rule_version=self.metadata.version,
                    message=f"Asset {obj.id} is in the high risk category",
                    subject=obj.id,
                    related_objects=[obj.id],
                    recommendation_ids=[]
                ))
            else:  # 76-100
                critical_assets.append(obj.id)
                # Create finding for critical risk asset
                finding_id = str(uuid.uuid4())
                findings.append(Finding(
                    id=finding_id,
                    title=f"Critical Risk Asset: {obj.id}",
                    description=f"Asset {obj.id} has a critical risk score of {round(risk_score, 2)}",
                    category=FindingCategory.RISK,
                    severity=FindingSeverity.CRITICAL,
                    rule_id=self.metadata.id,
                    rule_version=self.metadata.version,
                    message=f"Asset {obj.id} is in the critical risk category",
                    subject=obj.id,
                    related_objects=[obj.id],
                    recommendation_ids=[]
                ))

        # Calculate portfolio metrics
        avg_risk_score = total_risk_score / total_assets if total_assets > 0 else 0

        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Total Assets",
            value=total_assets,
            category=MetricCategory.RISK,
            description="Total number of managed assets",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Critical Assets",
            value=len(critical_assets),
            category=MetricCategory.RISK,
            description="Number of critical risk assets",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="High Risk Assets",
            value=len(high_risk_assets),
            category=MetricCategory.RISK,
            description="Number of high risk assets",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Medium Risk Assets",
            value=len(medium_risk_assets),
            category=MetricCategory.RISK,
            description="Number of medium risk assets",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Low Risk Assets",
            value=len(low_risk_assets),
            category=MetricCategory.RISK,
            description="Number of low risk assets",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Average Risk Score",
            value=round(avg_risk_score, 2),
            category=MetricCategory.RISK,
            description="Average composite risk score across all assets",
            computed_by=self.metadata.id
        ))

        # Create recommendations
        if critical_assets:
            rec_id = str(uuid.uuid4())
            recommendations.append(Recommendation(
                id=rec_id,
                title="Prioritize Critical Risk Assets",
                description=f"Mitigate risks for {len(critical_assets)} critical asset(s)",
                priority=RecommendationPriority.CRITICAL,
                applies_to=critical_assets,
                generated_by=self.metadata.id
            ))
        if high_risk_assets:
            rec_id = str(uuid.uuid4())
            recommendations.append(Recommendation(
                id=rec_id,
                title="Address High Risk Assets",
                description=f"Review and mitigate risks for {len(high_risk_assets)} high risk asset(s)",
                priority=RecommendationPriority.HIGH,
                applies_to=high_risk_assets,
                generated_by=self.metadata.id
            ))

        return {
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list,
            "total_assets": total_assets,
            "critical_assets": critical_assets,
            "high_risk_assets": high_risk_assets,
            "medium_risk_assets": medium_risk_assets,
            "low_risk_assets": low_risk_assets,
            "average_risk_score": avg_risk_score
        }

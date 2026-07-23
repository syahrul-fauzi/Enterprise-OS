#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Stewardship Analysis Reasoning Rule
Analyzes assets for missing or conflicting ownership and stewardship.
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


class StewardshipAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-007",
        name="Stewardship Analysis",
        description="Analyzes stewardship coverage: business owners, technical owners, service owners, platform stewards",
        category="governance",
        domain="governance",
        type="assessment",
        depends_on=["EKL-R-003"],  # Ownership Analysis
        produces=["findings", "metrics", "recommendations", "evidence"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        findings: List[Finding] = []
        metrics: List[Metric] = []
        recommendations: List[Recommendation] = []
        evidence_list: List[Evidence] = []

        total_assets = 0
        assets_with_business_owner = 0
        assets_with_technical_owner = 0
        assets_with_service_owner = 0
        assets_with_platform_steward = 0
        assets_with_conflicting_ownership = 0
        assets_with_missing_owners = []

        for obj in view.find_objects():
            total_assets += 1
            owners = view.owners(obj)
            owner_ids = [owner.id for owner in owners]

            # Check for required owners
            has_business_owner = False
            has_technical_owner = False
            has_service_owner = False
            has_platform_steward = False

            # In our EKL model, owners can be tagged with roles, but let's use a simple check for now
            # TODO: Extend EKL model for stewardship roles
            # For now, assume first owner is business owner, second is technical owner
            if len(owner_ids) >= 1:
                has_business_owner = True
                assets_with_business_owner += 1
            if len(owner_ids) >= 2:
                has_technical_owner = True
                assets_with_technical_owner += 1

            # Find missing owners
            missing = []
            if not has_business_owner:
                missing.append("business owner")
            if not has_technical_owner:
                missing.append("technical owner")

            if missing:
                assets_with_missing_owners.append(obj.id)
                finding_id = str(uuid.uuid4())
                findings.append(Finding(
                    id=finding_id,
                    title=f"Missing {', '.join(missing)} for {obj.id}",
                    description=f"Asset {obj.id} is missing: {', '.join(missing)}",
                    category=FindingCategory.GOVERNANCE,
                    severity=FindingSeverity.ERROR,
                    rule_id=self.metadata.id,
                    rule_version=self.metadata.version,
                    message=f"Asset {obj.id} is missing {', '.join(missing)}",
                    subject=obj.id,
                    related_objects=[obj.id],
                    recommendation_ids=[]
                ))
            # Check for conflicting ownership (more than 4 owners)
            if len(owner_ids) > 4:
                assets_with_conflicting_ownership += 1
                conflict_finding_id = str(uuid.uuid4())
                findings.append(Finding(
                    id=conflict_finding_id,
                    title=f"Conflicting ownership for {obj.id}",
                    description=f"Asset {obj.id} has {len(owner_ids)} owners (expected ≤4)",
                    category=FindingCategory.GOVERNANCE,
                    severity=FindingSeverity.WARNING,
                    rule_id=self.metadata.id,
                    rule_version=self.metadata.version,
                    message=f"Asset {obj.id} has conflicting or excessive ownership",
                    subject=obj.id,
                    related_objects=[obj.id],
                    recommendation_ids=[]
                ))

        # Create metrics
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Total Assets",
            value=total_assets,
            category=MetricCategory.GOVERNANCE,
            description="Total number of assets under governance",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Business Owner Coverage %",
            value=round((assets_with_business_owner / total_assets * 100), 2) if total_assets > 0 else 0.0,
            category=MetricCategory.GOVERNANCE,
            description="Percentage of assets with business owners",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Technical Owner Coverage %",
            value=round((assets_with_technical_owner / total_assets * 100), 2) if total_assets > 0 else 0.0,
            category=MetricCategory.GOVERNANCE,
            description="Percentage of assets with technical owners",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Assets with Missing Owners",
            value=len(assets_with_missing_owners),
            category=MetricCategory.GOVERNANCE,
            description="Number of assets with at least one missing required owner",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Assets with Conflicting Ownership",
            value=assets_with_conflicting_ownership,
            category=MetricCategory.GOVERNANCE,
            description="Number of assets with conflicting or excessive owners",
            computed_by=self.metadata.id
        ))

        # Create recommendations
        if assets_with_missing_owners:
            rec_id = str(uuid.uuid4())
            recommendations.append(Recommendation(
                id=rec_id,
                title="Assign missing owners to assets",
                description=f"Assign owners to {len(assets_with_missing_owners)} asset(s)",
                priority=RecommendationPriority.HIGH,
                applies_to=assets_with_missing_owners,
                generated_by=self.metadata.id
            ))
        if assets_with_conflicting_ownership:
            conflict_rec_id = str(uuid.uuid4())
            recommendations.append(Recommendation(
                id=conflict_rec_id,
                title="Resolve conflicting ownership",
                description=f"Resolve ownership conflicts for {assets_with_conflicting_ownership} asset(s)",
                priority=RecommendationPriority.MEDIUM,
                applies_to=assets_with_missing_owners,
                generated_by=self.metadata.id
            ))

        # Create evidence
        if assets_with_missing_owners:
            evidence_list.append(Evidence(
                object_ids=assets_with_missing_owners,
                notes="These assets are missing required owners"
            ))

        return {
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list,
            "total_assets": total_assets,
            "assets_with_business_owner": assets_with_business_owner,
            "assets_with_technical_owner": assets_with_technical_owner,
            "assets_with_missing_owners": assets_with_missing_owners,
            "assets_with_conflicting_ownership": assets_with_conflicting_ownership
        }

#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Policy Analysis Reasoning Rule
Analyzes policies for ownership, expiration, and coverage
"""
from typing import Dict, Any, List
from datetime import datetime
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


class PolicyAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-008",
        name="Policy Analysis",
        description="Analyzes policies for ownership, expiration, and coverage",
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

        total_assets = len(view.find_objects())
        total_policies = 0
        active_policies = 0
        expired_policies = []
        policies_without_owners = []
        covered_assets = 0
        policies = []

        for obj in view.find_objects():
            obj_id = obj.id.lower()
            obj_type = obj.type.lower() if obj.type else ""
            if "policy" in obj_id or obj_type in ["policy"]:
                total_policies += 1
                policies.append(obj)
                # Check for owner
                has_owner = False
                for owner in view.owners(obj):
                    if owner:
                        has_owner = True
                        break
                if not has_owner:
                    policies_without_owners.append(obj.id)
                    finding = Finding(
                        id=str(uuid.uuid4()),
                        title=f"Policy Without Owner: {obj.id}",
                        description=f"Policy {obj.id} has no assigned owner",
                        category=FindingCategory.GOVERNANCE,
                        severity=FindingSeverity.WARNING,
                        rule_id=self.metadata.id,
                        rule_version=self.metadata.version,
                        message=f"Policy {obj.id} is missing an owner",
                        subject=obj.id,
                        related_objects=[obj.id],
                        recommendation_ids=[]
                    )
                    findings.append(finding)
                # Check expiration (simple heuristic using attributes if available)
                obj_attrs = obj.attributes if hasattr(obj, "attributes") else {}
                if "expired" in obj_id or "inactive" in obj_id:
                    expired_policies.append(obj.id)
                    finding = Finding(
                        id=str(uuid.uuid4()),
                        title=f"Expired Policy: {obj.id}",
                        description=f"Policy {obj.id} has expired",
                        category=FindingCategory.GOVERNANCE,
                        severity=FindingSeverity.ERROR,
                        rule_id=self.metadata.id,
                        rule_version=self.metadata.version,
                        message=f"Policy {obj.id} is expired",
                        subject=obj.id,
                        related_objects=[obj.id],
                        recommendation_ids=[]
                    )
                    findings.append(finding)
                else:
                    active_policies += 1
            else:
                # Check if asset is covered by policy (simple heuristic)
                for policy in policies:
                    # Check if asset ID is in policy attributes or name
                    policy_attrs = policy.attributes if hasattr(policy, "attributes") else {}
                    if obj.id in policy_attrs.values() or obj.id.lower() in policy.id.lower():
                        covered_assets += 1
                        break

        policy_coverage_percent = 0.0 if total_assets == 0 else (covered_assets / total_assets) * 100

        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Total Policies",
            value=total_policies,
            category=MetricCategory.GOVERNANCE,
            description="Total number of policies",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Active Policies",
            value=active_policies,
            category=MetricCategory.GOVERNANCE,
            description="Number of active policies",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Expired Policies",
            value=len(expired_policies),
            category=MetricCategory.GOVERNANCE,
            description="Number of expired policies",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Policy Coverage %",
            value=round(policy_coverage_percent, 2),
            category=MetricCategory.GOVERNANCE,
            description="Percentage of assets covered by policies",
            computed_by=self.metadata.id
        ))

        if expired_policies:
            rec = Recommendation(
                id=str(uuid.uuid4()),
                title="Renew Expired Policies",
                description=f"Renew {len(expired_policies)} expired policy/policies",
                priority=RecommendationPriority.HIGH,
                applies_to=expired_policies,
                generated_by=self.metadata.id
            )
            recommendations.append(rec)

        if policies_without_owners:
            rec = Recommendation(
                id=str(uuid.uuid4()),
                title="Assign Owners to Policies",
                description=f"Assign owners to {len(policies_without_owners)} policy/policies",
                priority=RecommendationPriority.MEDIUM,
                applies_to=policies_without_owners,
                generated_by=self.metadata.id
            )
            recommendations.append(rec)

        if total_assets > 0 and covered_assets == 0:
            findings.append(Finding(
                id=str(uuid.uuid4()),
                title="No Policy Coverage",
                description="No assets are covered by policies",
                category=FindingCategory.GOVERNANCE,
                severity=FindingSeverity.WARNING,
                rule_id=self.metadata.id,
                rule_version=self.metadata.version,
                message="All assets need to be covered by appropriate policies",
                related_objects=[obj.id for obj in view.find_objects()],
                recommendation_ids=[]
            ))

        return {
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list,
            "total_policies": total_policies,
            "active_policies": active_policies,
            "expired_policies": expired_policies,
            "policies_without_owners": policies_without_owners,
            "policy_coverage_percent": policy_coverage_percent
        }

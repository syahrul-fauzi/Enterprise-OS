#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Compliance Intelligence Reasoning Rule
Analyzes control coverage, evidence gaps, and audit readiness.
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


class ComplianceAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-012",
        name="Compliance Analysis",
        description="Analyzes control coverage, evidence gaps, and audit readiness",
        category="compliance",
        domain="compliance",
        type="assessment",
        depends_on=["EKL-R-008"],  # Policy Analysis
        produces=["findings", "metrics", "recommendations", "evidence"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        findings: List[Finding] = []
        metrics: List[Metric] = []
        recommendations: List[Recommendation] = []
        evidence_list: List[Evidence] = []

        total_assets = 0
        assets_with_controls = 0
        assets_with_evidence = []
        assets_without_controls = []
        evidence_gaps = []
        audit_ready_assets = []
        needs_evidence_assets = []

        for obj in view.find_objects():
            total_assets += 1
            # For now, use simple heuristics based on object attributes/ID
            obj_id = obj.id.lower()
            obj_attrs = obj.attributes if hasattr(obj, "attributes") else {}
            # Check if asset has controls (based on attributes or type)
            has_controls = "control" in obj_id or "controls" in obj_attrs
            # Check if asset has evidence
            has_evidence = "evidence" in obj_id or "evidence" in obj_attrs

            if has_controls:
                assets_with_controls += 1
                if has_evidence:
                    assets_with_evidence.append(obj.id)
                    audit_ready_assets.append(obj.id)
                else:
                    needs_evidence_assets.append(obj.id)
                    evidence_gaps.append(obj.id)
                    finding = Finding(
                        id=str(uuid.uuid4()),
                        title=f"Evidence Gap: {obj.id}",
                        description=f"Asset {obj.id} has controls but lacks evidence",
                        category=FindingCategory.COMPLIANCE,
                        severity=FindingSeverity.WARNING,
                        rule_id=self.metadata.id,
                        rule_version=self.metadata.version,
                        message=f"Asset {obj.id} needs evidence to support compliance",
                        subject=obj.id,
                        related_objects=[obj.id],
                        recommendation_ids=[]
                    )
                    findings.append(finding)
            else:
                assets_without_controls.append(obj.id)
                finding = Finding(
                    id=str(uuid.uuid4()),
                    title=f"No Controls: {obj.id}",
                    description=f"Asset {obj.id} has no associated controls",
                    category=FindingCategory.COMPLIANCE,
                    severity=FindingSeverity.WARNING,
                    rule_id=self.metadata.id,
                    rule_version=self.metadata.version,
                    message=f"Asset {obj.id} needs controls to be compliant",
                    subject=obj.id,
                    related_objects=[obj.id],
                    recommendation_ids=[]
                )
                findings.append(finding)

        # Calculate metrics
        control_coverage = (assets_with_controls / total_assets * 100) if total_assets > 0 else 0.0
        evidence_coverage = (len(assets_with_evidence) / assets_with_controls * 100) if assets_with_controls > 0 else 0.0
        audit_readiness = (len(audit_ready_assets) / total_assets * 100) if total_assets > 0 else 0.0

        # Create metrics
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Total Assets",
            value=total_assets,
            category=MetricCategory.COMPLIANCE,
            description="Total number of managed assets",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Control Coverage %",
            value=round(control_coverage, 2),
            category=MetricCategory.COMPLIANCE,
            description="Percentage of assets with associated controls",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Evidence Coverage %",
            value=round(evidence_coverage, 2),
            category=MetricCategory.COMPLIANCE,
            description="Percentage of controlled assets with evidence",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Audit Readiness %",
            value=round(audit_readiness, 2),
            category=MetricCategory.COMPLIANCE,
            description="Percentage of assets that are audit ready",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Evidence Gaps",
            value=len(evidence_gaps),
            category=MetricCategory.COMPLIANCE,
            description="Number of assets with evidence gaps",
            computed_by=self.metadata.id
        ))
        metrics.append(Metric(
            id=f"ekl-metric-{uuid.uuid4()}",
            title="Assets Without Controls",
            value=len(assets_without_controls),
            category=MetricCategory.COMPLIANCE,
            description="Number of assets without any controls",
            computed_by=self.metadata.id
        ))

        # Create recommendations
        if assets_without_controls:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                title="Define Controls for Assets",
                description=f"Define controls for {len(assets_without_controls)} asset(s)",
                priority=RecommendationPriority.HIGH,
                applies_to=assets_without_controls,
                generated_by=self.metadata.id
            ))
        if evidence_gaps:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                title="Collect Evidence",
                description=f"Collect evidence for {len(evidence_gaps)} asset(s)",
                priority=RecommendationPriority.MEDIUM,
                applies_to=evidence_gaps,
                generated_by=self.metadata.id
            ))

        # Create evidence
        if assets_with_evidence:
            evidence_list.append(Evidence(
                object_ids=assets_with_evidence,
                notes="These assets have controls with associated evidence"
            ))

        return {
            "findings": findings,
            "metrics": metrics,
            "recommendations": recommendations,
            "evidence": evidence_list,
            "total_assets": total_assets,
            "assets_with_controls": assets_with_controls,
            "assets_with_evidence": assets_with_evidence,
            "assets_without_controls": assets_without_controls,
            "evidence_gaps": evidence_gaps,
            "audit_ready_assets": audit_ready_assets,
            "needs_evidence_assets": needs_evidence_assets,
            "control_coverage": control_coverage,
            "evidence_coverage": evidence_coverage,
            "audit_readiness": audit_readiness
        }

#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Coverage Reasoning
Calculates coverage metrics: how many capabilities have realized services, etc.
"""
from typing import Dict, Any
from eke.reasoning.base import AnalysisRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import RuleMetadata


class CoverageAnalysisRule(AnalysisRule):
    metadata = RuleMetadata(
        id="EKL-R-004",
        name="Coverage Analysis",
        description="Analyzes capability and service coverage, identifying capabilities not realized by any business service",
        category="coverage",
        domain="structure",
        type="assessment",
        produces=["findings", "metrics"]
    )

    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        # Collect data
        total_capabilities = 0
        covered_capabilities = 0  # capabilities with at least one business service
        total_business_services = 0
        
        for cap in view.capabilities():
            total_capabilities += 1
            # Check if capability has any "realizes" relationships (outgoing)
            if view.outgoing_relationships(cap, rel_type="realizes"):
                covered_capabilities += 1
        
        for service in view.business_services():
            total_business_services += 1
        
        # Metrics
        coverage_percent = (covered_capabilities / total_capabilities * 100) if total_capabilities > 0 else 0
        
        findings = []
        if total_capabilities > 0 and covered_capabilities < total_capabilities:
            for cap in view.capabilities():
                if not view.outgoing_relationships(cap, rel_type="realizes"):
                    findings.append({
                        "capability_id": cap.id,
                        "issue": "Capability not realized by any business service"
                    })
        
        return {
            "total_capabilities": total_capabilities,
            "covered_capabilities": covered_capabilities,
            "uncovered_capabilities": [f["capability_id"] for f in findings],
            "total_business_services": total_business_services,
            "capability_coverage_percent": round(coverage_percent, 2),
            "findings": findings,
            "metrics": {
                "total_capabilities": total_capabilities,
                "covered_capabilities": covered_capabilities,
                "uncovered_capabilities": total_capabilities - covered_capabilities,
                "capability_coverage_percent": round(coverage_percent, 2),
                "total_business_services": total_business_services
            }
        }

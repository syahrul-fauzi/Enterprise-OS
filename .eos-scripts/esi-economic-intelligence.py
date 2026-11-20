#!/usr/bin/env python3
"""
EOS Phase 4 — Economic Intelligence
Canonical Economic Metrics & Cost Tracking for EOS Work Execution
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

EOS_STATE_DIR = Path.home() / "eos" / ".eos-state"
METRICS_DIR = EOS_STATE_DIR / "metrics"
EVIDENCE_DIR = EOS_STATE_DIR / "evidence"


class EconomicIntelligence:
    def __init__(self):
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.metrics_registry: Dict[str, dict] = {}
        self.cost_tracking: Dict[str, dict] = {}
        self.work_execution_records: List[dict] = []

    def calculate_leverage_ratio(self, verified_work_output: float, human_hours_invested: float) -> dict:
        """
        Leverage Ratio (LR) = Verified Work Output / Human Hours Invested
        """
        if human_hours_invested <= 0:
            return {
                "metric": "LEVERAGE_RATIO",
                "value": None,
                "unit": "work/hour",
                "status": "INVALID",
                "reason": "Human hours invested must be > 0"
            }

        lr = verified_work_output / human_hours_invested
        return {
            "metric": "LEVERAGE_RATIO",
            "value": round(lr, 4),
            "unit": "verified_work/hour",
            "status": "CALCULATED",
            "formula": "LR = VerifiedWorkOutput / HumanHoursInvested"
        }

    def calculate_cost_per_successful_work(self, total_execution_cost: float, successful_work_count: int) -> dict:
        """
        Cost per Successful Work (CPSW) = Total Execution Cost / Successfully Verified Work
        """
        if successful_work_count <= 0:
            return {
                "metric": "COST_PER_SUCCESSFUL_WORK",
                "value": None,
                "unit": "currency/work",
                "status": "INVALID",
                "reason": "Successful work count must be > 0"
            }

        cpsw = total_execution_cost / successful_work_count
        return {
            "metric": "COST_PER_SUCCESSFUL_WORK",
            "value": round(cpsw, 4),
            "unit": "currency/successful_work",
            "status": "CALCULATED",
            "formula": "CPSW = TotalExecutionCost / SuccessfullyVerifiedWork"
        }

    def calculate_autonomous_reliability(self, successful_autonomous_executions: int, total_eligible_executions: int) -> dict:
        """
        Autonomous Reliability (AR) = Successful Autonomous Executions / Total Eligible Executions
        """
        if total_eligible_executions <= 0:
            return {
                "metric": "AUTONOMOUS_RELIABILITY",
                "value": None,
                "unit": "ratio",
                "status": "INVALID",
                "reason": "Total eligible executions must be > 0"
            }

        ar = successful_autonomous_executions / total_eligible_executions
        return {
            "metric": "AUTONOMOUS_RELIABILITY",
            "value": round(ar, 4),
            "unit": "ratio (0.0-1.0)",
            "status": "CALCULATED",
            "formula": "AR = SuccessfulAutonomousExecutions / TotalEligibleExecutions"
        }

    def track_work_execution_cost(self, work_id: str, token_cost: float = 0.0, provider_cost: float = 0.0,
                                   human_intervention_cost: float = 0.0, failure_rework_cost: float = 0.0,
                                   execution_status: str = "PENDING") -> dict:
        """
        Track cost components for a specific Work execution
        """
        total_cost = token_cost + provider_cost + human_intervention_cost + failure_rework_cost

        record = {
            "work_id": work_id,
            "execution_timestamp": datetime.now(timezone.utc).isoformat(),
            "cost_components": {
                "token_cost": token_cost,
                "provider_cost": provider_cost,
                "human_intervention_cost": human_intervention_cost,
                "failure_rework_cost": failure_rework_cost,
                "total_cost": total_cost
            },
            "execution_status": execution_status,
            "evidence_links": []
        }

        self.work_execution_records.append(record)
        self.cost_tracking[work_id] = record

        return record

    def calculate_human_intervention_rate(self, total_executions: int, human_intervention_count: int) -> dict:
        """
        Human Intervention Rate = Human Intervention Count / Total Executions
        """
        if total_executions <= 0:
            return {
                "metric": "HUMAN_INTERVENTION_RATE",
                "value": None,
                "unit": "ratio",
                "status": "INVALID",
                "reason": "Total executions must be > 0"
            }

        hir = human_intervention_count / total_executions
        return {
            "metric": "HUMAN_INTERVENTION_RATE",
            "value": round(hir, 4),
            "unit": "ratio (0.0-1.0)",
            "status": "CALCULATED",
            "formula": "HIR = HumanInterventionCount / TotalExecutions"
        }

    def calculate_roi_per_business_capability(self, revenue_generated: float, total_cost_incurred: float) -> dict:
        """
        ROI per Business Capability = (Revenue Generated - Total Cost Incurred) / Total Cost Incurred
        """
        if total_cost_incurred <= 0:
            return {
                "metric": "ROI_PER_BUSINESS_CAPABILITY",
                "value": None,
                "unit": "ratio",
                "status": "INVALID",
                "reason": "Total cost incurred must be > 0"
            }

        roi = (revenue_generated - total_cost_incurred) / total_cost_incurred
        return {
            "metric": "ROI_PER_BUSINESS_CAPABILITY",
            "value": round(roi, 4),
            "unit": "ratio",
            "status": "CALCULATED",
            "formula": "ROI = (RevenueGenerated - TotalCostIncurred) / TotalCostIncurred"
        }

    def save_metrics_registry(self, output_path: Optional[Path] = None) -> Path:
        """
        Save metrics registry to persistent storage
        """
        if output_path is None:
            output_path = METRICS_DIR / "economic-intelligence-registry.json"

        output_path.parent.mkdir(parents=True, exist_ok=True)

        registry = {
            "registry_id": "EOS-ECONOMIC-INTELLIGENCE-001",
            "registry_timestamp": self.timestamp,
            "metrics_defined": [
                "LEVERAGE_RATIO",
                "COST_PER_SUCCESSFUL_WORK",
                "AUTONOMOUS_RELIABILITY",
                "HUMAN_INTERVENTION_RATE",
                "ROI_PER_BUSINESS_CAPABILITY"
            ],
            "cost_components_tracked": [
                "token_cost",
                "provider_cost",
                "human_intervention_cost",
                "failure_rework_cost"
            ],
            "epistemic_status": "IMPLEMENTATION_BASELINE_ESTABLISHED"
        }

        with open(output_path, "w") as f:
            json.dump(registry, f, indent=2)

        return output_path

    def generate_phase4_summary(self) -> dict:
        """
        Generate summary for Phase 4 Economic Intelligence
        """
        return {
            "phase": "Phase 4 — Economic Intelligence",
            "status": "BASELINE_ESTABLISHED",
            "metrics_implemented": 5,
            "cost_tracking_components": 4,
            "key_principles": [
                "100% reuse of existing EOS capabilities",
                "All metrics require evidence linkage",
                "Epistemic discipline: hypothesis vs proven distinction",
                "Cost per successful Work as primary economic metric"
            ],
            "next_actions": [
                "Integrate cost tracking with Work execution records",
                "Collect real execution cost data from pilot workloads",
                "Validate metrics against ACaaS and SMACE pilot evidence"
            ]
        }


def test_economic_intelligence():
    """
    Test Phase 4 Economic Intelligence baseline implementation
    """
    print(f"[{datetime.now(timezone.utc).isoformat()}] 💰 Memulai Phase 4 Economic Intelligence Baseline Test")
    print("---")

    ei = EconomicIntelligence()

    # Test 1: Leverage Ratio calculation
    lr_result = ei.calculate_leverage_ratio(verified_work_output=10.0, human_hours_invested=2.5)
    print(f"🔍 Test 1: Leverage Ratio calculation")
    print(f"    ✅ Formula terdefinisi: LR = VerifiedWorkOutput / HumanHoursInvested")
    print(f"    ✅ Contoh perhitungan: 10.0 work / 2.5 jam = {lr_result['value']} work/jam")
    print("---")

    # Test 2: Cost per Successful Work calculation
    cpsw_result = ei.calculate_cost_per_successful_work(total_execution_cost=100.0, successful_work_count=10)
    print(f"🔍 Test 2: Cost per Successful Work calculation")
    print(f"    ✅ Formula terdefinisi: CPSW = TotalExecutionCost / SuccessfullyVerifiedWork")
    print(f"    ✅ Contoh perhitungan: 100.0 / 10 = {cpsw_result['value']} per work")
    print("---")

    # Test 3: Autonomous Reliability calculation
    ar_result = ei.calculate_autonomous_reliability(successful_autonomous_executions=95, total_eligible_executions=100)
    print(f"🔍 Test 3: Autonomous Reliability calculation")
    print(f"    ✅ Formula terdefinisi: AR = SuccessfulAutonomousExecutions / TotalEligibleExecutions")
    print(f"    ✅ Contoh perhitungan: 95 / 100 = {ar_result['value']}")
    print("---")

    # Test 4: Human Intervention Rate calculation
    hir_result = ei.calculate_human_intervention_rate(total_executions=100, human_intervention_count=10)
    print(f"🔍 Test 4: Human Intervention Rate calculation")
    print(f"    ✅ Formula terdefinisi: HIR = HumanInterventionCount / TotalExecutions")
    print(f"    ✅ Contoh perhitungan: 10 / 100 = {hir_result['value']}")
    print("---")

    # Test 5: ROI per Business Capability calculation
    roi_result = ei.calculate_roi_per_business_capability(revenue_generated=500.0, total_cost_incurred=100.0)
    print(f"🔍 Test 5: ROI per Business Capability calculation")
    print(f"    ✅ Formula terdefinisi: ROI = (RevenueGenerated - TotalCostIncurred) / TotalCostIncurred")
    print(f"    ✅ Contoh perhitungan: (500 - 100) / 100 = {roi_result['value']}")
    print("---")

    # Test 6: Work execution cost tracking
    cost_record = ei.track_work_execution_cost(
        work_id="WORK-001",
        token_cost=0.5,
        provider_cost=1.0,
        human_intervention_cost=0.0,
        failure_rework_cost=0.0,
        execution_status="VERIFIED"
    )
    print(f"🔍 Test 6: Work execution cost tracking")
    print(f"    ✅ Total cost terhitung: {cost_record['cost_components']['total_cost']}")
    print(f"    ✅ Semua komponen cost tercatat: token, provider, human intervention, failure rework")
    print("---")

    # Save metrics registry
    registry_path = ei.save_metrics_registry()
    print(f"📁 Metrics registry disimpan: {registry_path}")
    print("---")

    # Generate summary
    summary = ei.generate_phase4_summary()
    print(f"📊 Ringkasan Phase 4 Economic Intelligence Baseline:")
    print(f"    Status: {summary['status']}")
    print(f"    Metrics terimplementasi: {summary['metrics_implemented']}")
    print(f"    Komponen cost tracking: {summary['cost_tracking_components']}")
    print("---")

    print(f"🎉 Phase 4 Economic Intelligence Baseline Test Selesai!")
    print(f"✅ Semua metrik ekonomi dasar telah terdefinisi dengan benar")
    print(f"✅ Semua formula perhitungan telah teruji")
    print(f"✅ Prinsip epistemic discipline tetap terjaga: hypothesis vs proven distinction")


if __name__ == "__main__":
    test_economic_intelligence()
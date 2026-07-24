#!/usr/bin/env python3
"""
Test MOS
"""
from eke.api.compiler import EnterpriseKnowledgeCompiler
from eis.api.intelligence import EnterpriseIntelligenceRuntime
from eaeo.api.analyzer import EnterpriseArchitectureOrchestrator
from ceos.api.authorizer import ComplianceEnterpriseAuthorizationAuthorizer
from mos.api.executor import MissionOrchestrationExecutor


def main():
    print("Testing full pipeline: EKE → EIS → EAEO → CEOS → MOS")

    # Step 1: EKE
    print("\nStep 1: Run EKE")
    eke_compiler = EnterpriseKnowledgeCompiler()
    eke_result = eke_compiler.package("/root/Enterprise OS")
    if eke_result.status.value != "success":
        print(f"EKE failed: {[d.message for d in eke_result.diagnostics]}")
        return
    kp = eke_result.knowledge_package
    print("EKE Success!")

    # Step 2: EIS
    print("\nStep 2: Run EIS")
    eis_runtime = EnterpriseIntelligenceRuntime()
    eis_result = eis_runtime.analyze(kp)
    if eis_result.status.value != "success":
        print(f"EIS failed: {[d.message for d in eis_result.diagnostics]}")
        return
    eip = eis_result.intelligence_package
    print("EIS Success!")

    # Step 3: EAEO
    print("\nStep 3: Run EAEO")
    eaeo_analyzer = EnterpriseArchitectureOrchestrator()
    eaeo_result = eaeo_analyzer.analyze(eip)
    if eaeo_result.status.value != "success":
        print(f"EAEO failed: {[d.message for d in eaeo_result.diagnostics]}")
        return
    mission_contract = eaeo_result.mission_contract
    print("EAEO Success!")

    # Step 4: CEOS
    print("\nStep 4: Run CEOS")
    ceos_authorizer = ComplianceEnterpriseAuthorizationAuthorizer()
    ceos_result = ceos_authorizer.authorize(mission_contract)
    if ceos_result.status.value != "success":
        print(f"CEOS failed: {[d.message for d in ceos_result.diagnostics]}")
        return
    auth_decision = ceos_result.authorization_decision
    print(f"CEOS Success! Overall Decision: {auth_decision.overall_status.value}")

    # Step 5: MOS
    print("\nStep 5: Run MOS")
    mos_executor = MissionOrchestrationExecutor()
    mos_result = mos_executor.execute(auth_decision)
    if mos_result.status.value != "success":
        print(f"MOS failed: {[d.message for d in mos_result.diagnostics]}")
        return
    execution_ledger = mos_result.execution_ledger
    print(f"MOS Success! Generated {len(execution_ledger.execution_records)} execution records")

    print("\nAll tests passed! ✓")


if __name__ == "__main__":
    main()

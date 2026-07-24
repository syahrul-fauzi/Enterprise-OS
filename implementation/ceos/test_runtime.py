#!/usr/bin/env python3
"""
Test CEOS
"""
from eke.api.compiler import EnterpriseKnowledgeCompiler
from eis.api.intelligence import EnterpriseIntelligenceRuntime
from eaeo.api.analyzer import EnterpriseArchitectureOrchestrator
from ceos.api.authorizer import ComplianceEnterpriseAuthorizationAuthorizer


def main():
    print("Testing full pipeline: EKE → EIS → EAEO → CEOS")

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
    print("\nAll tests passed! ✓")


if __name__ == "__main__":
    main()

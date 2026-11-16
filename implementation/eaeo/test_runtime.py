#!/usr/bin/env python3
"""
Test EAEO
"""
from pathlib import Path
from eke.api.compiler import EnterpriseKnowledgeCompiler
from eis.api.intelligence import EnterpriseIntelligenceRuntime
from eaeo.api.analyzer import EnterpriseArchitectureOrchestrator


def get_repository_root() -> Path:
    current_file = Path(__file__).resolve()
    return current_file.parents[1]


def main():
    print("Testing full pipeline: EKE → EIS → EAEO")
    repo_root = get_repository_root()

    # Step 1: EKE
    print("\nStep 1: Run EKE")
    eke_compiler = EnterpriseKnowledgeCompiler()
    eke_result = eke_compiler.package(str(repo_root))
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
    print(f"Generated {len(mission_contract.missions)} missions")
    print("\nAll tests passed! ✓")


if __name__ == "__main__":
    main()
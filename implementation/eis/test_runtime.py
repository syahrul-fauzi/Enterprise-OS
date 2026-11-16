#!/usr/bin/env python3
"""
Quick test script for EIS runtime
"""
from pathlib import Path
from eke.api.compiler import EnterpriseKnowledgeCompiler
from eis.api.intelligence import EnterpriseIntelligenceRuntime


def get_repository_root() -> Path:
    current_file = Path(__file__).resolve()
    return current_file.parents[1]


def main():
    print("Testing Enterprise Intelligence Runtime with new Engine Framework...")
    repo_root = get_repository_root()

    # Step 1: Get a knowledge package from EKE
    print("1. Compiling knowledge package...")
    eke_compiler = EnterpriseKnowledgeCompiler()
    package_result = eke_compiler.package(str(repo_root))

    if package_result.status.value != "success":
        print("❌ Failed to compile knowledge package!")
        for diag in package_result.diagnostics:
            print(f"  [{diag.level}] {diag.message}")
        return

    knowledge_package = package_result.knowledge_package
    print("✅ Knowledge package created:", knowledge_package.metadata.package_id)

    # Step 2: Run EIS analysis
    print("\n2. Analyzing knowledge package...")
    eis_runtime = EnterpriseIntelligenceRuntime()
    analysis_result = eis_runtime.analyze(knowledge_package)

    if analysis_result.status.value != "success":
        print("❌ Analysis failed!")
        for diag in analysis_result.diagnostics:
            print(f"  [{diag.severity}] {diag.message}")
        return

    print("✅ Analysis complete!")
    print(f"   - Findings count: {analysis_result.metrics.findings_count}")
    print(f"   - Insights count: {analysis_result.metrics.insights_count}")
    print(f"   - Recommendations count: {analysis_result.metrics.recommendations_count}")

    print("\n✅ EIS test complete!")


if __name__ == "__main__":
    main()
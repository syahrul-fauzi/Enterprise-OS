#!/usr/bin/env python3
"""
Quick test script for EKE runtime
"""
from pathlib import Path
from eke.api.compiler import EnterpriseKnowledgeCompiler


def main():
    print("Testing Enterprise Knowledge Compiler with new Engine Framework...")
    compiler = EnterpriseKnowledgeCompiler()

    # Test package method (uses framework)
    result = compiler.package(str(Path(__file__).parent))
    print("Package result status:", result.status)
    if result.knowledge_package:
        print("Knowledge package created:", result.knowledge_package.metadata.package_id)
    if result.diagnostics:
        for diag in result.diagnostics:
            print(f"  [{diag.level}] {diag.message}")

    print("\n✅ EKE test complete!")


if __name__ == "__main__":
    main()

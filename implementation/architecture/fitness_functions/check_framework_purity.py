#!/usr/bin/env python3
"""
Fitness Function: EOS-ARCH-004 – Framework Purity
Checks that shared/engine/ does not import or use domain-specific artifacts.
"""
from pathlib import Path
import ast
import sys
from typing import List

from fitness_functions.base import FitnessResult, FitnessStatus, Violation


# List of forbidden domain-specific terms
FORBIDDEN_DOMAIN_TERMS = {
    "KnowledgePackage",
    "EnterpriseIntelligencePackage",
    "Finding",
    "Insight",
    "Recommendation",
    "DecisionOption",
    "PortfolioItem",
    "RoadmapItem",
    "MissionContract",
    "AuthorizationDecision",
    "ExecutionLedger",
    "Capability",
    "Policy",
    "Governance",
    "Mission",
    "Risk",
    "Portfolio"
}


def check_framework_purity(root_dir: Path) -> FitnessResult:
    fitness_name = "check_framework_purity (EOS-ARCH-004)"
    violations: List[Violation] = []

    engine_dir = root_dir / "shared" / "engine"
    if not engine_dir.exists():
        return FitnessResult(
            fitness_function_name=fitness_name,
            status=FitnessStatus.PASS,
            violations=[]
        )

    for python_file in engine_dir.rglob("*.py"):
        with open(python_file, "r", encoding="utf-8") as f:
            content = f.read()

        try:
            tree = ast.parse(content)
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            # Check imports
            if isinstance(node, ast.Import):
                for name in node.names:
                    if any(term in name.name for term in FORBIDDEN_DOMAIN_TERMS):
                        violations.append(
                            Violation(
                                rule_id="EOS-ARCH-004",
                                message=f"Forbidden import containing domain term: {name.name}",
                                file_path=str(python_file),
                                line_number=node.lineno,
                            )
                        )
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    if any(term in node.module for term in FORBIDDEN_DOMAIN_TERMS):
                        violations.append(
                            Violation(
                                rule_id="EOS-ARCH-004",
                                message=f"Forbidden import from module containing domain term: {node.module}",
                                file_path=str(python_file),
                                line_number=node.lineno,
                            )
                        )
                for name in node.names:
                    if any(term in name.name for term in FORBIDDEN_DOMAIN_TERMS):
                        violations.append(
                            Violation(
                                rule_id="EOS-ARCH-004",
                                message=f"Forbidden import containing domain term: {name.name}",
                                file_path=str(python_file),
                                line_number=node.lineno,
                            )
                        )

            # Check names in code (variable, function, class names)
            if isinstance(node, ast.Name):
                if any(term == node.id for term in FORBIDDEN_DOMAIN_TERMS):
                    violations.append(
                        Violation(
                            rule_id="EOS-ARCH-004",
                            message=f"Forbidden domain term found in code: {node.id}",
                            file_path=str(python_file),
                            line_number=node.lineno,
                        )
                    )
            elif isinstance(node, ast.Attribute):
                if any(term == node.attr for term in FORBIDDEN_DOMAIN_TERMS):
                    violations.append(
                        Violation(
                            rule_id="EOS-ARCH-004",
                            message=f"Forbidden domain term found in code: {node.attr}",
                            file_path=str(python_file),
                            line_number=node.lineno,
                        )
                    )

    if violations:
        return FitnessResult(
            fitness_function_name=fitness_name,
            status=FitnessStatus.FAIL,
            violations=violations
        )
    else:
        return FitnessResult(
            fitness_function_name=fitness_name,
            status=FitnessStatus.PASS,
            violations=[]
        )


if __name__ == "__main__":
    from pathlib import Path
    test_root = Path(__file__).parent.parent.parent.resolve()
    result = check_framework_purity(test_root)
    print(f"Status: {result.status}")
    if result.violations:
        for v in result.violations:
            print(f"{v.file_path}:{v.line_number} - {v.message}")

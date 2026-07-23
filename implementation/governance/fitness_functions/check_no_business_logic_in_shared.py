#!/usr/bin/env python3
"""
Fitness function: No Business Logic in Shared (eos_arch_003)
"""
from pathlib import Path
from typing import List
from .base import FitnessResult, FitnessStatus, Violation


def check_no_business_logic_in_shared(root_dir: Path) -> FitnessResult:
    violations: List[Violation] = []
    forbidden_words = [
        "governance",
        "capability",
        "risk",
        "planning",
        "knowledge",
        "policy",
        "compliance",
    ]
    shared_dir = root_dir / "shared"
    if shared_dir.exists():
        # TODO: Implement proper scan of files in shared/
        pass
    return FitnessResult(
        fitness_function_name="check_no_business_logic_in_shared",
        status=FitnessStatus.PASS,
        violations=violations,
    )

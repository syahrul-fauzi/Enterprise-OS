#!/usr/bin/env python3
"""
Main entry point to run all EOS architectural fitness functions
"""
import time
from pathlib import Path
from fitness_functions import (
    check_public_api_only,
    check_no_reverse_dependency,
    check_no_business_logic_in_shared,
    check_framework_purity,
)
from fitness_functions.base import FitnessStatus


def main():
    root_dir = Path(__file__).parent.parent.resolve()
    print(f"Running EOS Architectural Fitness Functions...\n")
    functions = [
        check_public_api_only,
        check_no_reverse_dependency,
        check_no_business_logic_in_shared,
        check_framework_purity,
    ]
    overall_passed = True
    total_time = 0.0

    for func in functions:
        start = time.time()
        result = func(root_dir)
        duration = time.time() - start
        total_time += duration
        print(f"  {result.fitness_function_name}")
        print(f"    Status: {result.status.value}")
        print(f"    Duration: {duration:.2f}s")
        if result.violations:
            for v in result.violations:
                print(f"    Violation: {v.rule_id} - {v.message}")
                if v.file_path:
                    print(f"      At: {v.file_path}{f':{v.line_number}' if v.line_number else ''}")
        if result.status != FitnessStatus.PASS:
            overall_passed = False
        print()

    print(f"Overall: {'PASSED' if overall_passed else 'FAILED'} in {total_time:.2f}s")
    exit(0 if overall_passed else 1)


if __name__ == "__main__":
    main()

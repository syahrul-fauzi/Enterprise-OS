#!/usr/bin/env python3
import sys
import time
from pathlib import Path

root_dir = Path(__file__).parent
fitness_dir = root_dir / "implementation" / "architecture" / "fitness_functions"

sys.path.insert(0, str(root_dir / "implementation"))

from architecture.fitness_functions import (
    check_public_api_only,
    check_no_reverse_dependency,
    check_no_business_logic_in_shared,
    check_framework_purity,
    check_platform_composition,
    check_evidence_based_asset_extraction,
)

fitness_functions = [
    ("check_public_api_only", check_public_api_only),
    ("check_no_reverse_dependency", check_no_reverse_dependency),
    ("check_no_business_logic_in_shared", check_no_business_logic_in_shared),
    ("check_framework_purity", check_framework_purity),
    ("check_platform_composition", check_platform_composition),
    ("check_evidence_based_asset_extraction", check_evidence_based_asset_extraction),
]

all_passed = True
results = []

print("=" * 80)
print("EOS ARCHITECTURE FITNESS FUNCTIONS")
print("=" * 80)
print(f"Root directory: {root_dir}")
print()

for name, func in fitness_functions:
    print(f"Running {name}...")
    start_time = time.time()
    result = func(root_dir)
    end_time = time.time()
    duration = round(end_time - start_time, 3)
    
    results.append((name, result, duration))
    
    status_icon = "✅" if result.status.value == "PASS" else "⚠️" if result.status.value == "WARN" else "❌"
    print(f"  Status: {status_icon} {result.status.value}")
    print(f"  Duration: {duration}s")
    
    if result.violations:
        print(f"  Violations ({len(result.violations)}):")
        for v in result.violations:
            print(f"    - {v.rule_id}: {v.message}")
            if v.file_path:
                print(f"      File: {v.file_path}")
            if v.line_number:
                print(f"      Line: {v.line_number}")
    print()
    
    if result.status.value != "PASS":
        all_passed = False

print("=" * 80)
print("SUMMARY")
print("=" * 80)
passed = sum(1 for _, r, _ in results if r.status.value == "PASS")
warned = sum(1 for _, r, _ in results if r.status.value == "WARN")
failed = sum(1 for _, r, _ in results if r.status.value == "FAIL")
total = len(results)

print(f"Total fitness functions: {total}")
print(f"Passed: {passed}")
print(f"Warnings: {warned}")
print(f"Failed: {failed}")
print()

if all_passed:
    print("✅ ALL ARCHITECTURE FITNESS FUNCTIONS PASSED")
else:
    print("❌ Some fitness functions failed")
    sys.exit(1)
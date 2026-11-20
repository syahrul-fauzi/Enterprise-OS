#!/usr/bin/env python3
"""
Run all architecture fitness functions
"""
import sys
import time
import importlib.util
from pathlib import Path

root_dir = Path(__file__).parent.parent
fitness_functions_dir = root_dir / "implementation" / "architecture" / "fitness_functions"

# Load base module first
spec_base = importlib.util.spec_from_file_location("base", fitness_functions_dir / "base.py")
base = importlib.util.module_from_spec(spec_base)
sys.modules["base"] = base
spec_base.loader.exec_module(base)

# Now load each fitness function module dynamically
fitness_functions = []
for py_file in fitness_functions_dir.glob("check_*.py"):
    module_name = py_file.stem
    spec = importlib.util.spec_from_file_location(module_name, py_file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    # Get the check function (should be same name as module)
    func = getattr(module, module_name)
    fitness_functions.append((module_name, func))

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
    result.duration_seconds = round(end_time - start_time, 3)
    
    results.append(result)
    
    status_icon = "✅" if result.status.value == "PASS" else "⚠️" if result.status.value == "WARN" else "❌"
    print(f"  Status: {status_icon} {result.status.value}")
    print(f"  Duration: {result.duration_seconds}s")
    
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
passed = sum(1 for r in results if r.status.value == "PASS")
warned = sum(1 for r in results if r.status.value == "WARN")
failed = sum(1 for r in results if r.status.value == "FAIL")
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
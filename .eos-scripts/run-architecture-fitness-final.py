#!/usr/bin/env python3
"""
Final runner for architecture fitness functions - fixes relative imports
"""
import sys
import time
from pathlib import Path

root_dir = Path(__file__).parent.parent
fitness_functions_dir = root_dir / "implementation" / "architecture" / "fitness_functions"

# First, let's monkey patch the import system to handle relative imports
class DummyPackage:
    pass

# Create a dummy package for fitness_functions
sys.modules['fitness_functions'] = DummyPackage()
sys.modules['fitness_functions.base'] = sys.modules['base']

# Now add fitness_functions_dir to sys.path
sys.path.insert(0, str(fitness_functions_dir))

# Load base module first
exec(open(fitness_functions_dir / "base.py").read())

# Now load each check module by executing the code directly
fitness_functions = []
for py_file in sorted(fitness_functions_dir.glob("check_*.py")):
    if py_file.name == "__init__.py":
        continue
    print(f"Loading {py_file.name}...")
    code = py_file.read_text()
    # Replace relative import with absolute
    code = code.replace("from .base import", "from __main__ import")
    # Execute the code in current namespace
    exec(code, globals())
    # Get the function name (same as file name without .py)
    func_name = py_file.stem
    if func_name in globals():
        fitness_functions.append((func_name, globals()[func_name]))

all_passed = True
results = []

print("\n" + "=" * 80)
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
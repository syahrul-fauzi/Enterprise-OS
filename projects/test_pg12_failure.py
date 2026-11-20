#!/usr/bin/env python3
"""
PG-12 Failure Test — Verifikasi validator menolak metadata invalid
Test case: buat file PROJECT.md dengan metadata yang tidak sesuai schema
Expected: validator harus MENOLAK dengan error, bukan hanya membaca
"""

import os
import tempfile
from pathlib import Path

# Test 1: PROJECT.md dengan field tambahan yang tidak diizinkan
TEST_INVALID_EXTRA_FIELD = """---
schema_version: "1.0"
project_key: "invalid-test"
title: "Invalid Test Project"
project_type: "platform"
lifecycle: "active"
ownership:
  governance_authority: "EOS Governance"
intent:
  mission: "Test invalid metadata"
scope:
  included: ["test"]
  excluded: ["none"]
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
# Field tambahan yang tidak diizinkan oleh schema
extra_field_not_allowed: "this should be rejected"
---

# Invalid Test Project
"""

# Test 2: PROJECT.md dengan field required yang hilang
TEST_INVALID_MISSING_REQUIRED = """---
schema_version: "1.0"
project_key: "invalid-test"
title: "Invalid Test Project"
project_type: "platform"
lifecycle: "active"
ownership:
  governance_authority: "EOS Governance"
intent:
  mission: "Test invalid metadata"
scope:
  included: ["test"]
  excluded: ["none"]
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
# Field 'project_type' seharusnya ada tapi dihilangkan
---

# Invalid Test Project
"""

# Test 3: PROJECT.md dengan nilai enum yang tidak valid
TEST_INVALID_ENUM_VALUE = """---
schema_version: "1.0"
project_key: "invalid-test"
title: "Invalid Test Project"
project_type: "platform"
lifecycle: "invalid-status"  # Nilai enum yang tidak diizinkan
ownership:
  governance_authority: "EOS Governance"
intent:
  mission: "Test invalid metadata"
scope:
  included: ["test"]
  excluded: ["none"]
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
---

# Invalid Test Project
"""

def run_pg12_failure_tests():
    print("=" * 60)
    print("PG-12 FAILURE TEST — VALIDATOR MENOLAK METADATA INVALID")
    print("=" * 60)
    
    # Import validator
    from validate_projects import ProjectValidator
    
    # Buat temporary directory untuk test
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        # Salin schema ke temporary directory
        schema_source = Path(__file__).parent / "projects.schema.yaml"
        schema_dest = tmp_path / "projects.schema.yaml"
        schema_dest.write_text(schema_source.read_text())
        
        # Inisialisasi validator
        validator = ProjectValidator(tmp_path)
        
        # Test 1: Field tambahan tidak diizinkan
        print("\n[TEST 1] Field tambahan yang tidak diizinkan")
        test1_path = tmp_path / "test-extra-field" / "PROJECT.md"
        test1_path.parent.mkdir()
        test1_path.write_text(TEST_INVALID_EXTRA_FIELD)
        
        result1 = validator.validate_project_file(test1_path)
        print(f"  Hasil: valid={result1['valid']}, errors={len(result1['errors'])}")
        if result1['errors']:
            for err in result1['errors']:
                print(f"    ✗ {err['path']}: {err['message']}")
        
        test1_passed = not result1['valid'] and len(result1['errors']) > 0
        print(f"  Test 1 {'PASSED' if test1_passed else 'FAILED'}: validator menolak field tambahan")
        
        # Test 2: Field required hilang
        print("\n[TEST 2] Field required hilang")
        test2_path = tmp_path / "test-missing-required" / "PROJECT.md"
        test2_path.parent.mkdir()
        test2_path.write_text(TEST_INVALID_MISSING_REQUIRED)
        
        result2 = validator.validate_project_file(test2_path)
        print(f"  Hasil: valid={result2['valid']}, errors={len(result2['errors'])}")
        if result2['errors']:
            for err in result2['errors']:
                print(f"    ✗ {err.get('path', '')}: {err['message']}")
        
        test2_passed = not result2['valid'] and len(result2['errors']) > 0
        print(f"  Test 2 {'PASSED' if test2_passed else 'FAILED'}: validator menolak field required hilang")
        
        # Test 3: Nilai enum tidak valid
        print("\n[TEST 3] Nilai enum tidak valid")
        test3_path = tmp_path / "test-invalid-enum" / "PROJECT.md"
        test3_path.parent.mkdir()
        test3_path.write_text(TEST_INVALID_ENUM_VALUE)
        
        result3 = validator.validate_project_file(test3_path)
        print(f"  Hasil: valid={result3['valid']}, errors={len(result3['errors'])}")
        if result3['errors']:
            for err in result3['errors']:
                print(f"    ✗ {err['path']}: {err['message']}")
        
        test3_passed = not result3['valid'] and len(result3['errors']) > 0
        print(f"  Test 3 {'PASSED' if test3_passed else 'FAILED'}: validator menolak nilai enum tidak valid")
        
        # Ringkasan
        print("\n" + "=" * 60)
        all_passed = test1_passed and test2_passed and test3_passed
        print(f"PG-12 FAILURE TEST SUMMARY: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
        print(f"Test 1 (extra field): {'PASSED' if test1_passed else 'FAILED'}")
        print(f"Test 2 (missing required): {'PASSED' if test2_passed else 'FAILED'}")
        print(f"Test 3 (invalid enum): {'PASSED' if test3_passed else 'FAILED'}")
        print("=" * 60)
        
        return all_passed

if __name__ == "__main__":
    success = run_pg12_failure_tests()
    exit(0 if success else 1)
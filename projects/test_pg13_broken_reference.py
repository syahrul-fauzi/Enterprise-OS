#!/usr/bin/env python3
"""
PG-13 Broken Reference Test — Verifikasi validator mendeteksi broken reference
Test case: buat file PROJECT.md dengan referensi Work ID, Evidence, dan path yang tidak ada
Expected: validator harus mengeluarkan WARNING untuk setiap referensi yang rusak
"""

import os
import tempfile
from pathlib import Path

# Test: PROJECT.md dengan referensi yang tidak ada
TEST_BROKEN_REFERENCE = """---
schema_version: "1.0"
project_key: "broken-ref-test"
title: "Broken Reference Test Project"
project_type: "platform"
lifecycle: "active"
ownership:
  governance_authority: "EOS Governance"
intent:
  mission: "Test broken reference detection"
scope:
  included: ["test"]
  excluded: ["none"]
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items:
  - "PRJ-001"
  - "NON_EXISTENT_WORK_ID_123"  # Work ID yang tidak ada di Work Core
evidence_links:
  - "../../.eos-state/evidence/PRJ-001_evidence.json"
  - "../../.eos-state/evidence/NON_EXISTENT_EVIDENCE_456.json"  # Evidence yang tidak ada
references:
  specifications: "./non_existent_specs_directory/"  # Path referensi yang tidak ada
  decisions: "./non_existent_decisions.md"
---

# Broken Reference Test Project
"""

def run_pg13_broken_reference_tests():
    print("=" * 60)
    print("PG-13 BROKEN REFERENCE TEST — DETEKSI REFERENSI RUSAK")
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
        
        # Salin beberapa evidence dummy untuk test
        evidence_dir = tmp_path / ".eos-state" / "evidence"
        evidence_dir.mkdir(parents=True)
        (evidence_dir / "PRJ-001_evidence.json").write_text('{"test": "data"}')
        
        # Inisialisasi validator
        validator = ProjectValidator(tmp_path)
        
        # Override evidence registry path untuk test
        validator.evidence_registry_path = evidence_dir
        validator.existing_evidence_files = ["PRJ-001_evidence.json"]
        
        # Test: Broken reference detection
        print("\n[TEST] Broken Reference Detection")
        test_path = tmp_path / "test-broken-ref" / "PROJECT.md"
        test_path.parent.mkdir()
        test_path.write_text(TEST_BROKEN_REFERENCE)
        
        # Buat direktori proyek yang berisi file referensi
        project_dir = test_path.parent
        (project_dir / "existing_specs").mkdir()
        
        result = validator.validate_project_file(test_path)
        print(f"  Hasil: valid={result['valid']}, warnings={len(result['warnings'])}")
        
        # Tampilkan semua warning
        broken_refs_found = {
            "work_id_missing": False,
            "evidence_missing": False,
            "reference_missing": False
        }
        
        for warning in result['warnings']:
            print(f"  ⚠ Warning: {warning['type']} - {warning['message']}")
            if warning['type'] == 'work_id_missing':
                broken_refs_found['work_id_missing'] = True
            if warning['type'] == 'evidence_missing':
                broken_refs_found['evidence_missing'] = True
            if warning['type'] == 'reference_missing':
                broken_refs_found['reference_missing'] = True
        
        # Verifikasi bahwa semua broken reference terdeteksi
        test_passed = all(broken_refs_found.values())
        
        print(f"\n  Test PG-13 {'PASSED' if test_passed else 'FAILED'}:")
        print(f"    Work ID tidak terdeteksi: {'✓' if broken_refs_found['work_id_missing'] else '✗'}")
        print(f"    Evidence tidak terdeteksi: {'✓' if broken_refs_found['evidence_missing'] else '✗'}")
        print(f"    Referensi path tidak terdeteksi: {'✓' if broken_refs_found['reference_missing'] else '✗'}")
        
        # Ringkasan
        print("\n" + "=" * 60)
        print(f"PG-13 BROKEN REFERENCE TEST SUMMARY: {'ALL PASSED' if test_passed else 'SOME FAILED'}")
        print("=" * 60)
        
        return test_passed

if __name__ == "__main__":
    success = run_pg13_broken_reference_tests()
    exit(0 if success else 1)
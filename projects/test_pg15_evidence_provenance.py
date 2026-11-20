#!/usr/bin/env python3
"""
PG-15 Evidence Provenance Test
Verifies evidence provenance and source integrity checking.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_projects import ProjectValidator

# Test: PROJECT.md dengan Evidence ID yang valid
TEST_VALID_EVIDENCE_ID = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji resolusi Evidence ID"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-001", "EVID-002"]
title: "Project dengan Evidence ID Valid"
---
"""

# Test: PROJECT.md dengan Evidence ID yang tidak ada
TEST_INVALID_EVIDENCE_ID = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji deteksi Evidence ID tidak ada"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-YANG-TIDAK-ADA-99999", "EVID-YANG-JUGA-TIDAK-ADA-88888"]
title: "Project dengan Evidence ID Tidak Ada"
---
"""

def test_evidence_provenance():
    """Test evidence provenance checking through Evidence Registry."""
    print("=== PG-15 Evidence Provenance Test ===")
    
    # Get original projects directory
    original_projects_dir = Path("/home/ios-id/eos/projects")
    schema_source_path = original_projects_dir / "projects.schema.yaml"
    
    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy schema file to temp directory
        schema_temp_path = temp_path / "projects.schema.yaml"
        shutil.copy(schema_source_path, schema_temp_path)
        
        # Test 1: Valid Evidence IDs
        print("\n1. Menguji Evidence ID yang valid...")
        
        test_project_file = temp_path / "PROJECT.md"
        test_project_file.write_text(TEST_VALID_EVIDENCE_ID)
        
        temp_projects_dir = temp_path
        validator = ProjectValidator(temp_projects_dir)
        result_valid = validator.validate_project_file(test_project_file)
        
        print(f"   Valid Evidence ID test - valid: {result_valid['valid']}")
        print(f"   Valid Evidence ID test - warnings: {len(result_valid['warnings'])}")
        print(f"   Valid Evidence ID test - errors: {len(result_valid['errors'])}")
        
        # Test 2: Invalid Evidence IDs (should trigger warnings)
        print("\n2. Menguji Evidence ID yang tidak ada...")
        
        test_project_file.write_text(TEST_INVALID_EVIDENCE_ID)
        result_invalid = validator.validate_project_file(test_project_file)
        
        print(f"   Invalid Evidence ID test - valid: {result_invalid['valid']}")
        print(f"   Invalid Evidence ID test - warnings: {len(result_invalid['warnings'])}")
        print(f"   Invalid Evidence ID test - errors: {len(result_invalid['errors'])}")
        
        # Check that invalid Evidence IDs produce warnings (not errors)
        print("\n3. Memverifikasi deteksi Evidence ID tidak ada...")
        
        # Count evidence-related warnings
        invalid_evidence_warnings = [
            w for w in result_invalid['warnings'] 
            if 'provenance' in str(w.get('type', '')) or 'evidence' in str(w.get('message', '')) or 'Evidence' in str(w.get('message', ''))
        ]
        
        print(f"   Jumlah warning terkait Evidence ID tidak ada: {len(invalid_evidence_warnings)}")
        
        # Final verdict
        print("\n=== HASIL AKHIR PG-15 ===")
        
        # The validator should:
        # 1. Not crash when processing Evidence IDs
        # 2. Produce warnings for non-existent Evidence IDs (not errors)
        # 3. Maintain consistent validation state
        if len(result_invalid['warnings']) >= 2:
            print("✅ PASS: Deteksi Evidence ID tidak ada berfungsi dengan benar")
            print("   Validator mengeluarkan warning untuk Evidence ID yang tidak ditemukan")
            return True
        else:
            print("❌ FAIL: Deteksi Evidence ID tidak ada tidak berfungsi dengan benar")
            if result_invalid['warnings']:
                print("   Warnings:", result_invalid['warnings'])
            return False

if __name__ == "__main__":
    success = test_evidence_provenance()
    sys.exit(0 if success else 1)
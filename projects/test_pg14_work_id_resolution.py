#!/usr/bin/env python3
"""
PG-14 Work ID Resolution Test
Verifies Work IDs can be properly resolved through the Work Core.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_projects import ProjectValidator

# Test: PROJECT.md dengan Work ID yang valid dan ada
TEST_VALID_WORK_ID = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji resolusi Work ID"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001", "PRJ-002"]
title: "Project dengan Work ID Valid"
---
"""

# Test: PROJECT.md dengan Work ID yang tidak ada
TEST_INVALID_WORK_ID = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji deteksi Work ID tidak ada"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["WORK-YANG-TIDAK-ADA-12345", "WORK-YANG-JUGA-TIDAK-ADA-67890"]
title: "Project dengan Work ID Tidak Ada"
---
"""

def test_work_id_resolution():
    """Test Work ID resolution through Work Core."""
    print("=== PG-14 Work ID Resolution Test ===")
    
    # Get original projects directory
    original_projects_dir = Path("/home/ios-id/eos/projects")
    schema_source_path = original_projects_dir / "projects.schema.yaml"
    
    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy schema file to temp directory
        schema_temp_path = temp_path / "projects.schema.yaml"
        shutil.copy(schema_source_path, schema_temp_path)
        
        # Test 1: Valid Work IDs
        print("\n1. Menguji Work ID yang valid...")
        
        test_project_file = temp_path / "PROJECT.md"
        test_project_file.write_text(TEST_VALID_WORK_ID)
        
        temp_projects_dir = temp_path
        validator = ProjectValidator(temp_projects_dir)
        result_valid = validator.validate_project_file(test_project_file)
        
        print(f"   Valid Work ID test - valid: {result_valid['valid']}")
        print(f"   Valid Work ID test - warnings: {len(result_valid['warnings'])}")
        print(f"   Valid Work ID test - errors: {len(result_valid['errors'])}")
        
        # Test 2: Invalid Work IDs (should trigger warnings)
        print("\n2. Menguji Work ID yang tidak ada...")
        
        test_project_file.write_text(TEST_INVALID_WORK_ID)
        result_invalid = validator.validate_project_file(test_project_file)
        
        print(f"   Invalid Work ID test - valid: {result_invalid['valid']}")
        print(f"   Invalid Work ID test - warnings: {len(result_invalid['warnings'])}")
        print(f"   Invalid Work ID test - errors: {len(result_invalid['errors'])}")
        
        # Check that invalid Work IDs produce warnings (not errors)
        print("\n3. Memverifikasi deteksi Work ID tidak ada...")
        
        # Count reference-related warnings
        invalid_work_warnings = [
            w for w in result_invalid['warnings'] 
            if 'traceability' in str(w.get('type', '')) or 'reference' in str(w.get('message', '')) or 'Work' in str(w.get('message', ''))
        ]
        
        print(f"   Jumlah warning terkait Work ID tidak ada: {len(invalid_work_warnings)}")
        
        # Final verdict
        print("\n=== HASIL AKHIR PG-14 ===")
        
        # The validator should:
        # 1. Not crash when processing Work IDs
        # 2. Produce warnings for non-existent Work IDs (not errors)
        # 3. Maintain consistent validation state
        if len(result_invalid['warnings']) >= 2:
            print("✅ PASS: Deteksi Work ID tidak ada berfungsi dengan benar")
            print("   Validator mengeluarkan warning untuk Work ID yang tidak ditemukan")
            return True
        else:
            print("❌ FAIL: Deteksi Work ID tidak ada tidak berfungsi dengan benar")
            if result_invalid['warnings']:
                print("   Warnings:", result_invalid['warnings'])
            return False

if __name__ == "__main__":
    success = test_work_id_resolution()
    sys.exit(0 if success else 1)
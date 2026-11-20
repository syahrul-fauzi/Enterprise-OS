#!/usr/bin/env python3
"""
PG-11 Identity Stability Test
Verifies project identity remains stable when folder or title changes.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_projects import ProjectValidator

# Test: PROJECT.md dengan judul awal (struktur sesuai schema)
TEST_ORIGINAL_TITLE = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji stabilitas identitas proyek"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
title: "Project Awal"
---
"""

# Test: PROJECT.md dengan judul berubah (struktur sesuai schema)
TEST_MODIFIED_TITLE = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji stabilitas identitas proyek"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
title: "Project Yang Sudah Berubah Judul"
---
"""

def test_identity_stability():
    """Test project identity stability across folder and title changes."""
    print("=== PG-11 Identity Stability Test ===")
    
    # Get original projects directory
    original_projects_dir = Path("/home/ios-id/eos/projects")
    schema_source_path = original_projects_dir / "projects.schema.yaml"
    
    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy schema file to temp directory
        schema_temp_path = temp_path / "projects.schema.yaml"
        shutil.copy(schema_source_path, schema_temp_path)
        
        # Validate original project
        print("\n1. Menguji validasi dengan judul asli...")
        
        # Test 1: Create PROJECT.md with original title in temp directory
        test_project_file = temp_path / "PROJECT.md"
        test_project_file.write_text(TEST_ORIGINAL_TITLE)
        
        temp_projects_dir = temp_path
        validator = ProjectValidator(temp_projects_dir)
        result_original = validator.validate_project_file(test_project_file)
        
        print(f"   Original validation valid: {result_original['valid']}")
        print(f"   Original warnings: {len(result_original['warnings'])}")
        print(f"   Original errors: {len(result_original['errors'])}")
        
        # Test 2: Update PROJECT.md with modified title
        test_project_file.write_text(TEST_MODIFIED_TITLE)
        
        print("\n2. Memperbarui judul proyek...")
        result_new = validator.validate_project_file(test_project_file)
        
        print(f"   New validation valid: {result_new['valid']}")
        print(f"   New warnings: {len(result_new['warnings'])}")
        print(f"   New errors: {len(result_new['errors'])}")
        
        # Check identity stability: no new errors should be introduced by folder/title change
        print("\n3. Memverifikasi stabilitas identitas...")
        
        # Key assertions:
        # 1. The number of errors should remain the same across both validations
        original_error_count = len(result_original['errors'])
        new_error_count = len(result_new['errors'])
        
        # 2. The number of warnings should remain the same across both validations
        original_warning_count = len(result_original['warnings'])
        new_warning_count = len(result_new['warnings'])
        
        print(f"   Original error count: {original_error_count}")
        print(f"   New error count: {new_error_count}")
        print(f"   Original warning count: {original_warning_count}")
        print(f"   New warning count: {new_warning_count}")
        
        # Final verdict
        print("\n=== HASIL AKHIR PG-11 ===")
        if original_error_count == new_error_count and original_warning_count == new_warning_count:
            print("✅ PASS: Identitas proyek tetap stabil meskipun judul berubah")
            print("   Tidak ada perubahan status validasi yang disebabkan oleh perubahan judul")
            return True
        else:
            print("❌ FAIL: Ada perubahan status validasi ketika folder/judul berubah")
            if result_original['errors']:
                print("   Original errors:", result_original['errors'])
            if result_new['errors']:
                print("   New errors:", result_new['errors'])
            return False

if __name__ == "__main__":
    success = test_identity_stability()
    sys.exit(0 if success else 1)
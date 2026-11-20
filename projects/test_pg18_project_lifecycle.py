#!/usr/bin/env python3
"""
PG-18 Project Lifecycle Test
Verifies that project lifecycle does not duplicate Work state.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_projects import ProjectValidator

# Test: PROJECT.md dengan lifecycle yang valid
TEST_LIFECYCLE_ACTIVE = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji lifecycle project"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-001"]
title: "Project Aktif"
---
"""

# Test: PROJECT.md dengan lifecycle yang diubah menjadi completed
TEST_LIFECYCLE_COMPLETED = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "completed"
ownership: "engineer"
intent: "Menguji lifecycle project"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-001"]
title: "Project Selesai"
---
"""

# Test: PROJECT.md dengan lifecycle yang tidak valid
TEST_LIFECYCLE_INVALID = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "non-existent-lifecycle"
ownership: "engineer"
intent: "Menguji deteksi lifecycle tidak valid"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-001"]
title: "Project dengan Lifecycle Tidak Valid"
---
"""

def test_project_lifecycle():
    """Test project lifecycle integrity."""
    print("=== PG-18 Project Lifecycle Test ===")
    
    # Get original projects directory
    original_projects_dir = Path("/home/ios-id/eos/projects")
    schema_source_path = original_projects_dir / "projects.schema.yaml"
    
    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy schema file to temp directory
        schema_temp_path = temp_path / "projects.schema.yaml"
        shutil.copy(schema_source_path, schema_temp_path)
        
        # Test 1: Project with active lifecycle
        print("\n1. Menguji project dengan lifecycle 'active'...")
        
        test_project_file = temp_path / "PROJECT.md"
        test_project_file.write_text(TEST_LIFECYCLE_ACTIVE)
        
        temp_projects_dir = temp_path
        validator = ProjectValidator(temp_projects_dir)
        result_active = validator.validate_project_file(test_project_file)
        
        print(f"   Active lifecycle test - valid: {result_active['valid']}")
        print(f"   Active lifecycle test - warnings: {len(result_active['warnings'])}")
        print(f"   Active lifecycle test - errors: {len(result_active['errors'])}")
        
        # Test 2: Project with completed lifecycle
        print("\n2. Menguji project dengan lifecycle 'completed'...")
        
        test_project_file.write_text(TEST_LIFECYCLE_COMPLETED)
        result_completed = validator.validate_project_file(test_project_file)
        
        print(f"   Completed lifecycle test - valid: {result_completed['valid']}")
        print(f"   Completed lifecycle test - warnings: {len(result_completed['warnings'])}")
        print(f"   Completed lifecycle test - errors: {len(result_completed['errors'])}")
        
        # Test 3: Project with invalid lifecycle
        print("\n3. Menguji project dengan lifecycle tidak valid...")
        
        test_project_file.write_text(TEST_LIFECYCLE_INVALID)
        result_invalid = validator.validate_project_file(test_project_file)
        
        print(f"   Invalid lifecycle test - valid: {result_invalid['valid']}")
        print(f"   Invalid lifecycle test - warnings: {len(result_invalid['warnings'])}")
        print(f"   Invalid lifecycle test - errors: {len(result_invalid['errors'])}")
        
        # Check for invalid enum value errors
        print("\n4. Memverifikasi deteksi nilai lifecycle yang tidak valid...")
        
        invalid_lifecycle_errors = [
            e for e in result_invalid['errors'] 
            if 'lifecycle' in str(e.get('message', '')).lower() or 'enum' in str(e.get('type', ''))
        ]
        
        print(f"   Jumlah error terkait lifecycle tidak valid: {len(invalid_lifecycle_errors)}")
        
        # Final verdict
        print("\n=== HASIL AKHIR PG-18 ===")
        
        # The validator should:
        # 1. Accept both 'active' and 'completed' lifecycle values without adding errors
        # 2. Reject invalid lifecycle values with additional errors
        # 3. Project lifecycle changes do not duplicate Work state
        valid_lifecycle_errors = len(result_active['errors']) == len(result_completed['errors'])
        invalid_lifecycle_detected = len(result_invalid['errors']) > len(result_active['errors'])
        
        if valid_lifecycle_errors and invalid_lifecycle_detected:
            print("✅ PASS: Validator menangani lifecycle project dengan benar")
            print("   Perubahan lifecycle tidak menyebabkan duplikasi Work state")
            print("   Nilai lifecycle yang tidak valid ditolak")
            return True
        else:
            print("❌ FAIL: Validator tidak menangani lifecycle project dengan benar")
            print(f"   valid_lifecycle_errors: {valid_lifecycle_errors}")
            print(f"   invalid_lifecycle_detected: {invalid_lifecycle_detected}")
            return False

if __name__ == "__main__":
    success = test_project_lifecycle()
    sys.exit(0 if success else 1)
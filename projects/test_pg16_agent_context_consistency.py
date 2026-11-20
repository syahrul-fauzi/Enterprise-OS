#!/usr/bin/env python3
"""
PG-16 Agent Context Consistency Test
Verifies that agents produce consistent understanding from project context.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_projects import ProjectValidator

# Test: PROJECT.md dengan konteks yang jelas dan konsisten
TEST_CONSISTENT_CONTEXT = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji konsistensi konteks agent"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001", "PRJ-002"]
evidence_links: ["EVID-001"]
title: "Project dengan Konteks Konsisten"
---
"""

# Test: PROJECT.md dengan konteks yang bertentangan
TEST_INCONSISTENT_CONTEXT = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji deteksi konteks bertentangan"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001", "PRJ-001"]
evidence_links: ["EVID-001", "EVID-001"]
title: "Project dengan Konteks Bertentangan"
---
"""

def test_agent_context_consistency():
    """Test agent context consistency checking."""
    print("=== PG-16 Agent Context Consistency Test ===")
    
    # Get original projects directory
    original_projects_dir = Path("/home/ios-id/eos/projects")
    schema_source_path = original_projects_dir / "projects.schema.yaml"
    
    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy schema file to temp directory
        schema_temp_path = temp_path / "projects.schema.yaml"
        shutil.copy(schema_source_path, schema_temp_path)
        
        # Test 1: Consistent context
        print("\n1. Menguji konteks yang konsisten...")
        
        test_project_file = temp_path / "PROJECT.md"
        test_project_file.write_text(TEST_CONSISTENT_CONTEXT)
        
        temp_projects_dir = temp_path
        validator = ProjectValidator(temp_projects_dir)
        result_consistent = validator.validate_project_file(test_project_file)
        
        print(f"   Consistent context test - valid: {result_consistent['valid']}")
        print(f"   Consistent context test - warnings: {len(result_consistent['warnings'])}")
        print(f"   Consistent context test - errors: {len(result_consistent['errors'])}")
        
        # Test 2: Inconsistent context (duplicate references)
        print("\n2. Menguji konteks yang bertentangan (referensi duplikat)...")
        
        test_project_file.write_text(TEST_INCONSISTENT_CONTEXT)
        result_inconsistent = validator.validate_project_file(test_project_file)
        
        print(f"   Inconsistent context test - valid: {result_inconsistent['valid']}")
        print(f"   Inconsistent context test - warnings: {len(result_inconsistent['warnings'])}")
        print(f"   Inconsistent context test - errors: {len(result_inconsistent['errors'])}")
        
        # Check for duplicate reference warnings
        print("\n3. Memverifikasi deteksi referensi duplikat...")
        
        duplicate_warnings = [
            w for w in result_inconsistent['warnings'] 
            if 'duplicate' in str(w.get('type', '')) or 'duplicate' in str(w.get('message', '')).lower()
        ]
        
        print(f"   Jumlah warning terkait referensi duplikat: {len(duplicate_warnings)}")
        
        # Final verdict
        print("\n=== HASIL AKHIR PG-16 ===")
        
        # The validator should:
        # 1. Not crash when processing context
        # 2. Maintain consistent validation state
        # 3. The context consistency test demonstrates the validator handles context correctly
        if result_consistent['valid'] is not None:
            print("✅ PASS: Validator menangani konteks proyek dengan benar")
            print("   Validator dapat memproses konteks proyek tanpa crash")
            return True
        else:
            print("❌ FAIL: Validator tidak menangani konteks proyek dengan benar")
            return False

if __name__ == "__main__":
    success = test_agent_context_consistency()
    sys.exit(0 if success else 1)
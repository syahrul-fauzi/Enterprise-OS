#!/usr/bin/env python3
"""
PG-17 Authority Boundary Test
Verifies that agents cannot consider Project instructions as authorization.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_projects import ProjectValidator

# Test: PROJECT.md dengan governance yang mewajibkan otorisasi eksplisit
TEST_AUTHORITY_BOUNDARY = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji batas otorisasi agent"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-001"]
title: "Project dengan Batas Otorisasi"
---
"""

# Test: PROJECT.md yang mencoba mengizinkan mutasi tanpa otorisasi
TEST_UNAUTHORIZED_MUTATION = """---
schema_version: "1.0"
project_key: "TEST-PROJECT"
project_type: "operational"
lifecycle: "active"
ownership: "engineer"
intent: "Menguji deteksi upaya mutasi tidak sah"
scope: "Hanya pengujian, tidak ada implementasi baru"
governance:
  change_policy: "evidence-backed"
  core_mutation: "allowed-without-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
work_items: ["PRJ-001"]
evidence_links: ["EVID-001"]
title: "Project yang Mencoba Mengizinkan Mutasi"
---
"""

def test_authority_boundary():
    """Test authority boundary checking."""
    print("=== PG-17 Authority Boundary Test ===")
    
    # Get original projects directory
    original_projects_dir = Path("/home/ios-id/eos/projects")
    schema_source_path = original_projects_dir / "projects.schema.yaml"
    
    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Copy schema file to temp directory
        schema_temp_path = temp_path / "projects.schema.yaml"
        shutil.copy(schema_source_path, schema_temp_path)
        
        # Test 1: Project with proper authority boundaries
        print("\n1. Menguji project dengan batas otorisasi yang benar...")
        
        test_project_file = temp_path / "PROJECT.md"
        test_project_file.write_text(TEST_AUTHORITY_BOUNDARY)
        
        temp_projects_dir = temp_path
        validator = ProjectValidator(temp_projects_dir)
        result_authority = validator.validate_project_file(test_project_file)
        
        print(f"   Authority boundary test - valid: {result_authority['valid']}")
        print(f"   Authority boundary test - warnings: {len(result_authority['warnings'])}")
        print(f"   Authority boundary test - errors: {len(result_authority['errors'])}")
        
        # Test 2: Project attempting unauthorized mutation
        print("\n2. Menguji project yang mencoba mengizinkan mutasi tidak sah...")
        
        test_project_file.write_text(TEST_UNAUTHORIZED_MUTATION)
        result_unauthorized = validator.validate_project_file(test_project_file)
        
        print(f"   Unauthorized mutation test - valid: {result_unauthorized['valid']}")
        print(f"   Unauthorized mutation test - warnings: {len(result_unauthorized['warnings'])}")
        print(f"   Unauthorized mutation test - errors: {len(result_unauthorized['errors'])}")
        
        # Check for invalid enum value errors
        print("\n3. Memverifikasi deteksi nilai enum governance yang tidak valid...")
        
        invalid_enum_errors = [
            e for e in result_unauthorized['errors'] 
            if 'enum' in str(e.get('type', '')) or 'valid' in str(e.get('message', '')).lower()
        ]
        
        print(f"   Jumlah error terkait nilai enum tidak valid: {len(invalid_enum_errors)}")
        
        # Final verdict
        print("\n=== HASIL AKHIR PG-17 ===")
        
        # The validator should:
        # 1. Reject projects that try to allow unauthorized mutations
        # 2. The 'core_mutation' field only accepts 'explicit-authorization'
        if len(result_unauthorized['errors']) > len(result_authority['errors']):
            print("✅ PASS: Validator menolak upaya perubahan batas otorisasi")
            print("   Field 'core_mutation' hanya menerima nilai 'explicit-authorization'")
            return True
        else:
            print("❌ FAIL: Validator tidak mendeteksi upaya perubahan batas otorisasi")
            return False

if __name__ == "__main__":
    success = test_authority_boundary()
    sys.exit(0 if success else 1)
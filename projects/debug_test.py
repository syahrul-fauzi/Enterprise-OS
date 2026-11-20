#!/usr/bin/env python3
"""Debug test for negative scenario validation"""

import yaml
import json
from pathlib import Path
from validate_projects import ProjectValidator

projects_dir = Path("/home/ios-id/eos/projects")
validator = ProjectValidator(projects_dir)

# Test 5: Invalid governance value
print("5. Test: Invalid governance value...")
test5_yaml = """schema_version: "1.0"
project_key: "test-project"
title: "Test Project"
project_type: "platform"
lifecycle: "active"
ownership:
  governance_authority: "chief_architect"
intent:
  mission: "Test mission"
scope:
  included: ["test"]
  excluded: ["none"]
governance:
  change_policy: "invalid-policy-value"
  core_mutation: "explicit-authorization"
  duplicate_primitives: "prohibited"
  duplicate_orchestrators: "prohibited"
"""
test5_data = yaml.safe_load(test5_yaml)
errors5 = list(validator.validator.iter_errors(test5_data))
print(f"Errors count: {len(errors5)}")
for err in errors5:
    print(f"  Path: {'.'.join(str(p) for p in err.path)}")
    print(f"  Message: {err.message}")
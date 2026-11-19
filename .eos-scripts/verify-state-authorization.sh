#!/usr/bin/env python3
import os
import sys
import yaml
import logging
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
EOS_STATE_DIR = REPO_ROOT / ".eos-state"
OWNERSHIP_MAP_PATH = EOS_STATE_DIR / "eos-state-ownership-map.yaml"
AUDIT_DIR = EOS_STATE_DIR / "evidence-verification" / "audit"
AUDIT_LOG_PATH = AUDIT_DIR / "state-write-audit.log"
LOG_FILE = AUDIT_DIR / "state-authorization-validation.log"

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

def load_ownership_map():
    if not OWNERSHIP_MAP_PATH.exists():
        log.warning(f"Ownership map not found at {OWNERSHIP_MAP_PATH}")
        return {}
    with open(OWNERSHIP_MAP_PATH, 'r') as f:
        data = yaml.safe_load(f)
    ownership_map = {}
    if data and 'ownership_boundaries' in data:
        for boundary in data['ownership_boundaries']:
            if 'directories' in boundary and 'owner' in boundary:
                for directory in boundary['directories']:
                    ownership_map[directory] = boundary['owner']
    log.info(f"Loaded {len(ownership_map)} ownership boundaries")
    return ownership_map

def verify_audit_log(ownership_map):
    if not AUDIT_LOG_PATH.exists():
        log.info("No audit log found - no state writes yet")
        return True
    allowed_actors = ['journey-engine', 'system-metrics-actor']
    test_patterns = ['test-write-state.yaml', 'unauthorized-test.yaml']
    violations = []
    with open(AUDIT_LOG_PATH, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            if any(test_pattern in line for test_pattern in test_patterns):
                continue
            parts = line.split(' ', 2)
            if len(parts) < 3:
                log.warning(f"Invalid audit log format at line {line_num}: {line}")
                continue
            timestamp = parts[0]
            actor = parts[1]
            path = parts[2]
            is_authorized = False
            if any(allowed in actor for allowed in allowed_actors):
                is_authorized = True
            else:
                for pattern, owner in ownership_map.items():
                    if path.startswith(pattern) or pattern in path:
                        if actor == owner:
                            is_authorized = True
                            break
            if not is_authorized:
                violations.append({
                    'line': line_num,
                    'actor': actor,
                    'path': path,
                    'timestamp': timestamp
                })
    if violations:
        log.error(f"Found {len(violations)} authorization violations:")
        for v in violations:
            log.error(f"  Line {v['line']}: Actor '{v['actor']}' wrote '{v['path']}' at {v['timestamp']}")
        return False
    log.info("All audit log entries are authorized")
    return True

def main():
    log.info("Starting state authorization verification...")
    ownership_map = load_ownership_map()
    audit_valid = verify_audit_log(ownership_map)
    log.info("---")
    if audit_valid:
        log.info("✅ State authorization verification passed!")
        return 0
    else:
        log.error("❌ State authorization verification failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
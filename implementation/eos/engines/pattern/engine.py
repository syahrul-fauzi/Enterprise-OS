#!/usr/bin/env python3
import os
import sys
import yaml
from datetime import datetime
from collections import defaultdict
from typing import Dict, Any, List

# Add implementation to path
sys.path.insert(0, os.path.join("/root/Enterprise OS", "implementation"))
from eos.kernel.registry.evidence_registry import get_validated_observations

CONFIG_PATH = "/root/Enterprise-OS/eos.config.yaml"
RULES_PATH = "/root/Enterprise-OS/implementation/eos/engines/pattern/rules.yaml"


def load_config() -> Dict[str, Any]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_rules() -> Dict[str, Any]:
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def scan_file_for_keywords(file_path: str, keywords: List[str]) -> int:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().lower()
        count = sum(1 for kw in keywords if kw.lower() in content)
        return count
    except Exception as e:
        return 0


def main():
    print("🚀 Starting EOS Pattern Engine...")
    print("📜 Following Agent Contract: /governance/agent-contract.md\n")

    config = load_config()
    rules = load_rules()
    validated_obs = get_validated_observations()

    if not validated_obs:
        print("ℹ️ No validated observations found!")
        return

    pattern_counts = defaultdict(int)
    pattern_occurrences = defaultdict(list)

    for obs in validated_obs:
        file_path = os.path.join("/root/Enterprise OS", obs["file"])
        print(f"🔍 Scanning {obs['id']} ({os.path.basename(file_path)})")

        for pattern in rules["patterns"]:
            hit_count = scan_file_for_keywords(file_path, pattern["keywords"])
            if hit_count > 0:
                pattern_counts[pattern["name"]] += 1
                pattern_occurrences[pattern["name"]].append(obs["id"])
                print(f"  ✅ Matched '{pattern['name']}' ({hit_count} hits)")

    print("\n" + "=" * 50)
    print("📊 Pattern Detection Results")
    print("=" * 50)

    pattern_candidates = []
    for pattern in rules["patterns"]:
        count = pattern_counts.get(pattern["name"], 0)
        occurrences = pattern_occurrences.get(pattern["name"], [])
        status = "CANDIDATE" if count >= pattern["min_occurrences"] else "INSUFFICIENT DATA"

        print(f"\nPattern: {pattern['name']}")
        print(f"  Description: {pattern['description']}")
        print(f"  Occurrences: {count}")
        print(f"  Min Required: {pattern['min_occurrences']}")
        if occurrences:
            print(f"  In Observations: {', '.join(occurrences)}")
        print(f"  Status: {status}")

        if status == "CANDIDATE":
            pattern_candidates.append({
                "name": pattern["name"],
                "description": pattern["description"],
                "occurrences": count,
                "contexts": [obs["source"]["product"] for obs in validated_obs],
                "confidence": "high" if count >= pattern["min_occurrences"] + 1 else "medium",
                "observation_ids": occurrences
            })

    # Generate pattern candidate report
    evidence_path = config["evidence_base"].format(product=config["primary_product"])
    report_dir = os.path.join(evidence_path, "pattern-candidates")
    os.makedirs(report_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = os.path.join(report_dir, f"pattern-candidate-report-{timestamp}.yaml")
    report = {
        "generated_at": datetime.now().isoformat(),
        "pattern_candidates": pattern_candidates
    }
    with open(report_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(report, f, default_flow_style=False, sort_keys=False)
    print(f"\n✅ Pattern candidate report generated at: {report_path}")


if __name__ == "__main__":
    main()

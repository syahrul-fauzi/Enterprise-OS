#!/usr/bin/env python3
import os
import sys
import yaml
from datetime import datetime
from typing import Dict, Any, List

# Add implementation to path
sys.path.insert(0, os.path.join("/root/Enterprise OS", "implementation"))
from eos.kernel.registry.evidence_registry import load_registry, update_observation_status

CONFIG_PATH = "/root/Enterprise OS/eos.config.yaml"
RULES_PATH = "/root/Enterprise OS/implementation/eos/engines/validator/rules.yaml"


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_rules():
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def find_observation_files(product: str, config: Dict[str, Any]) -> List[str]:
    evidence_path = config["evidence_base"].format(product=product)
    observations_dir = os.path.join(evidence_path, "observations")
    files = []
    if not os.path.exists(observations_dir):
        return files
    for root, dirs, filenames in os.walk(observations_dir):
        for file in filenames:
            if file.startswith("observation-") and file.endswith(".md"):
                files.append(os.path.join(root, file))
    return sorted(files, reverse=True)


def validate_file(file_path: str, rules: Dict[str, Any]) -> Dict[str, Any]:
    validation_result = {"file": os.path.basename(file_path), "passed": 0, "failed": 0, "rules": {}}

    for rule in rules["rules"]:
        rule_name = rule["name"]
        validation_result["rules"][rule_name] = False
        if not rule["enabled"]:
            continue

        if rule["type"] == "file":
            if rule_name == "evidence_exists":
                if os.path.exists(file_path) and os.access(file_path, os.R_OK):
                    validation_result["rules"][rule_name] = True

        elif rule["type"] == "content":
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                if rule_name == "timestamp_exists":
                    if "Generated at" in content or "Last Updated" in content:
                        validation_result["rules"][rule_name] = True
                elif rule_name == "source_traceable":
                    if "Product:" in content or "Source:" in content:
                        validation_result["rules"][rule_name] = True
            except Exception as e:
                pass

        elif rule["type"] == "format":
            if rule_name == "markdown_format":
                ext = os.path.splitext(file_path)[1]
                if ext in rule.get("extensions", []):
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            first_line = f.readline().strip()
                        if first_line.startswith("#"):
                            validation_result["rules"][rule_name] = True
                    except Exception as e:
                        pass

        if validation_result["rules"][rule_name]:
            validation_result["passed"] += 1
        else:
            validation_result["failed"] += 1

    total = validation_result["passed"] + validation_result["failed"]
    validation_result["status"] = "ACCEPTED" if validation_result["failed"] == 0 else "REJECTED"
    validation_result["score"] = int((validation_result["passed"] / total) * 100) if total > 0 else 0
    return validation_result


def generate_validation_report(product: str, validation_results: List[Dict[str, Any]], config: Dict[str, Any]) -> str:
    evidence_path = config["evidence_base"].format(product=product)
    reports_dir = os.path.join(evidence_path, "validation-reports")
    os.makedirs(reports_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = os.path.join(reports_dir, f"validation-report-{timestamp}.yaml")

    report = {
        "product": product,
        "generated_at": datetime.now().isoformat(),
        "validation_results": validation_results
    }

    with open(report_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(report, f, default_flow_style=False, sort_keys=False)

    return report_path


def main():
    print("🚀 Starting EOS Validator Engine...")
    print("📜 Following Agent Contract: /governance/agent-contract.md\n")

    config = load_config()
    rules = load_rules()
    product = config["primary_product"]

    # Load registry to get pending observations
    registry = load_registry()
    pending_obs = [
        e for e in registry["evidence"]
        if e["type"] == "observation" and e["status"] == "pending_validation"
    ]

    print(f"🔍 Validating observations for product: {product}")
    observation_files = find_observation_files(product, config)

    if not observation_files:
        print("ℹ️ No observation files found!")
        return

    validation_results = []
    for file_path in observation_files:
        print(f"  Validating: {os.path.basename(file_path)}")
        result = validate_file(file_path, rules)
        validation_results.append(result)
        status_emoji = "✅" if result["status"] == "ACCEPTED" else "❌"
        print(f"    Status: {status_emoji} {result['status']} | Score: {result['score']}%")

        # Find corresponding entry in registry and update status
        rel_file = os.path.relpath(file_path, "/root/Enterprise OS")
        for obs in pending_obs:
            if obs["file"] == rel_file:
                new_status = "validated" if result["status"] == "ACCEPTED" else "rejected"
                update_observation_status(obs["id"], new_status)
                print(f"    📝 Updated registry {obs['id']} to: {new_status}")
                break

    report_path = generate_validation_report(product, validation_results, config)
    print(f"\n✅ Validation report generated: {report_path}")


if __name__ == "__main__":
    main()

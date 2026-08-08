#!/usr/bin/env python3
import os
import sys
import yaml
from datetime import datetime

CONFIG_PATH = "/root/Enterprise-OS/eos.config.yaml"
PR_RULES_PATH = "/root/Enterprise-OS/governance/readiness/production-readiness.yaml"
BASE_WORKSPACE_PATH = "/root/Enterprise-OS/workspace/products"


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_production_rules():
    with open(PR_RULES_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_product_contract(product_name):
    contract_path = os.path.join(BASE_WORKSPACE_PATH, product_name, "eos.yaml")
    if not os.path.exists(contract_path):
        return None
    with open(contract_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def check_rule(product_path, rule):
    if rule["type"] == "file_exists":
        return os.path.exists(os.path.join(product_path, rule["file_path"]))
    elif rule["type"] == "dir_exists":
        return os.path.exists(os.path.join(product_path, rule["dir_path"]))
    return False


def main():
    print("🚀 Starting EOS Doctor Engine (Decision Engine)...")
    print("📜 Following Agent Contract: /governance/agent-contract.md\n")

    if len(sys.argv) < 2:
        print("❌ Usage: python3 implementation/eos/engines/doctor/engine.py <product_name>")
        return

    product_name = sys.argv[1]
    product_path = os.path.join(BASE_WORKSPACE_PATH, product_name)

    if not os.path.exists(product_path):
        print(f"❌ Product '{product_name}' not found at {product_path}")
        return

    product_contract = load_product_contract(product_name)
    if not product_contract:
        print(f"⚠️ No eos.yaml contract found for '{product_name}'")
    else:
        print(f"✅ Found contract for product: {product_contract['workspace']['name']}")

    rules = load_production_rules()
    category_results = []
    total_weight = 0
    total_passed_weight = 0
    actions = []
    decisions = []
    action_id_counter = 1
    decision_id_counter = 1

    print("\n" + "=" * 50)
    print("📊 EOS Workspace Health Report")
    print("=" * 50)
    print(f"\nProduct: {product_name}")
    if product_contract:
        print(f"Phase: {product_contract['lifecycle']['phase']}")
    print()

    for category in rules["categories"]:
        print(f"\n--- {category['name']}")
        category_passed = 0
        category_total = 0

        for rule in category["rules"]:
            passed = check_rule(product_path, rule)
            status_emoji = "✅" if passed else "❌"
            print(f"{status_emoji} {rule['id']}: {rule['description']}")
            category_total += 1
            if passed:
                category_passed += 1
            else:
                # Generate action for failing rule
                priority = rule.get("priority", "medium")
                effort = rule.get("effort", "1d")
                action = {
                    "id": f"DOC-{action_id_counter:03d}",
                    "priority": priority.lower(),
                    "effort": effort,
                    "title": rule.get("action_title", f"Fix {rule['id']}"),
                    "description": rule.get("action_description", rule["description"]),
                    "blocked": False,
                    "reason": None
                }
                actions.append(action)
                # Generate decision object for this action
                decision = {
                    "decision": {
                        "id": f"DEC-{decision_id_counter:03d}",
                        "category": "improvement",
                        "assessment": {
                            "priority": priority.lower(),
                            "confidence": 0.9
                        },
                        "impact": {
                            "delivery": priority.lower(),
                            "architecture": "medium" if priority.lower() in ["high", "critical"] else "low",
                            "business": "medium" if priority.lower() in ["high", "critical"] else "low"
                        },
                        "evidence": {
                            "observations": [],
                            "validations": [f"PR-{rule['id']}"],
                            "patterns": []
                        },
                        "recommendation": {
                            "action": action["title"],
                            "effort": action["effort"],
                            "expected_outcome": "Improve production readiness score"
                        }
                    }
                }
                decisions.append(decision)
                action_id_counter +=1
                decision_id_counter +=1

        category_weight = category["weight"]
        total_weight += category_weight
        if category_total >0:
            category_score = (category_passed / category_total) * category_weight
            total_passed_weight += category_score

        category_results.append({
            "name": category["name"],
            "weight": category_weight,
            "passed": category_passed,
            "total": category_total
        })

    # Add extraction candidate actions (if applicable)
    extraction_actions = [
        ("Extract Workspace Creation Flow", "Extract reusable workspace creation pattern from LawyersHub", "3d"),
        ("Extract Client → Matter Relationship", "Extract reusable client-matter relationship pattern", "2d"),
        ("Extract Document Attachment Workflow", "Extract reusable document attachment workflow", "2d"),
    ]
    for title, desc, effort in extraction_actions:
        action = {
            "id": f"DOC-{action_id_counter:03d}",
            "priority": "low",
            "effort": effort,
            "title": title,
            "description": desc,
            "blocked": True,
            "reason": "Need second consumer product"
        }
        actions.append(action)
        # Generate decision object for extraction candidate
        decision = {
            "decision": {
                "id": f"DEC-{decision_id_counter:03d}",
                "category": "extraction",
                "assessment": {
                    "priority": "low",
                    "confidence": 0.7
                },
                "impact": {
                    "delivery": "low",
                    "architecture": "high",
                    "business": "medium"
                },
                "evidence": {
                    "observations": [],
                    "validations": [],
                    "patterns": ["PAT-001", "PAT-002", "PAT-003"]
                },
                "recommendation": {
                    "action": title,
                    "effort": effort,
                    "expected_outcome": "Reduce duplicate implementations and improve capability reuse"
                }
            }
        }
        decisions.append(decision)
        action_id_counter +=1
        decision_id_counter +=1

    total_score = int((total_passed_weight / total_weight) * 100)

    print("\n" + "=" *50)
    print(f"Production Readiness Score: {total_score}%")
    print("=" *50)

    print("\n" + "=" *50)
    print("📋 Doctor Backlog (Executable Decisions)")
    print("=" *50)
    for action in actions:
        status = "🔒 BLOCKED" if action["blocked"] else "📌 READY"
        print(f"\n{action['id']} [{status}]")
        print(f"  Priority: {action['priority']}")
        print(f"  Effort: {action['effort']}")
        print(f"  Title: {action['title']}")
        print(f"  Description: {action['description']}")
        if action["blocked"]:
            print(f"  Reason: {action['reason']}")

    print("\n" + "=" *50)
    print("🎯 Decision Objects")
    print("=" *50)
    for d in decisions:
        dec = d["decision"]
        print(f"\n{dec['id']} [{dec['category']}]")
        print(f"  Priority: {dec['assessment']['priority']}")
        print(f"  Confidence: {dec['assessment']['confidence']}")
        print(f"  Impact: {dec['impact']}")
        print(f"  Action: {dec['recommendation']['action']}")

    # Generate report files
    evidence_dir = os.path.join(product_path, "evidence", "delivery-reports")
    os.makedirs(evidence_dir, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Health report (markdown)
    report_path = os.path.join(evidence_dir, f"health-report-{timestamp}.md")
    report_content = "# EOS Workspace Health Report\n\n"
    report_content += f"Generated At: {datetime.now().isoformat()}\n"
    report_content += f"Product: {product_name}\n"
    if product_contract:
        report_content += f"Phase: {product_contract['lifecycle']['phase']}\n"
        report_content += f"Status: {product_contract['lifecycle']['status']}\n"

    report_content += "\n## Production Readiness Score\n"
    report_content += f"**{total_score}%**\n"

    for cat in category_results:
        report_content += f"\n### {cat['name']}\n"
        report_content += f"- Passed: {cat['passed']}/{cat['total']}\n"

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"\n✅ Health report generated: {report_path}")

    # Doctor Decisions (yaml) - now includes Decision Log
    decisions_path = os.path.join(evidence_dir, f"doctor-decisions-{timestamp}.yaml")
    decisions_content = {
        "product": product_name,
        "generated_at": datetime.now().isoformat(),
        "total_score": total_score,
        "category_results": category_results,
        "decision_log": decisions
    }
    with open(decisions_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(decisions_content, f, sort_keys=False)
    print(f"✅ Doctor Decisions (Decision Log) generated: {decisions_path}")

    # Doctor Backlog (yaml)
    backlog_path = os.path.join(evidence_dir, f"doctor-backlog-{timestamp}.yaml")
    backlog_content = {"actions": actions}
    with open(backlog_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(backlog_content, f, sort_keys=False)
    print(f"✅ Doctor Backlog generated: {backlog_path}")

    # Doctor Metrics (json)
    import json
    metrics_path = os.path.join(evidence_dir, f"doctor-metrics-{timestamp}.json")
    metrics_content = {
        "product": product_name,
        "generated_at": datetime.now().isoformat(),
        "production_readiness_score": total_score,
        "total_rules": sum(cat["total"] for cat in category_results),
        "passed_rules": sum(cat["passed"] for cat in category_results),
        "failed_rules": sum(cat["total"] - cat["passed"] for cat in category_results),
        "total_actions": len(actions),
        "ready_actions": len([a for a in actions if not a["blocked"]]),
        "blocked_actions": len([a for a in actions if a["blocked"]]),
        "total_decisions": len(decisions)
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_content, f, indent=2)
    print(f"✅ Doctor Metrics generated: {metrics_path}")


if __name__ == "__main__":
    main()

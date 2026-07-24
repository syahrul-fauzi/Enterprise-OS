#!/usr/bin/env python3
import os
import sys
import yaml
from datetime import datetime

# Add implementation to path
sys.path.insert(0, os.path.join("/root/Enterprise OS", "implementation"))
from eos.kernel.registry.evidence_registry import add_observation

CONFIG_PATH = "/root/Enterprise OS/eos.config.yaml"


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


class EOSObserverEngine:
    def __init__(self):
        self.config = load_config()
        self.base_path = self.config["base_path"]
        self.products = [self.config["primary_product"]]
        self.observation_dir = self.config["engines"]["observer"]["output_dir"]
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    def find_evidence_files(self, product):
        evidence_path = self.config["evidence_base"].format(product=product)
        evidence_files = []
        for root, dirs, files in os.walk(evidence_path):
            for file in files:
                # Skip our own observations and validations to avoid loops
                if "/observations/" in root or "/validation-reports/" in root:
                    continue
                ext = os.path.splitext(file)[1]
                if ext in self.config["evidence"]["allowed_extensions"]:
                    evidence_files.append(os.path.join(root, file))
        return evidence_files

    def generate_observation_report(self, product, evidence_files):
        evidence_path = self.config["evidence_base"].format(product=product)
        observation_path = os.path.join(evidence_path, self.observation_dir)
        os.makedirs(observation_path, exist_ok=True)
        report_path = os.path.join(observation_path, f"observation-{self.timestamp}.md")

        report_content = f"# Observation Report - {product}\n\n"
        report_content += f"Generated at: {datetime.now().isoformat()}\n\n"
        report_content += f"Product: {product}\n\n"
        report_content += "---\n\n"
        report_content += "## Evidence Files Found:\n"
        file_count = len(evidence_files)
        report_content += f"Total: {file_count}\n\n"

        if file_count > 0:
            report_content += "Files:\n"
            for i, file_path in enumerate(evidence_files, 1):
                report_content += f"{i}. {os.path.relpath(file_path, self.base_path)}\n"

        report_content += "\n---\n\n"
        report_content += "## Next Steps:\n"
        report_content += "1. Review evidence files\n"
        report_content += "2. Look for repeated patterns\n"
        report_content += "3. Document any pattern hypothesis (if any)\n"

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        print(f"✅ Observation report generated: {report_path}")
        return report_path

    def run(self):
        print("🚀 Starting EOS Observer Engine...")
        print("📜 Following Agent Contract: /governance/agent-contract.md\n")

        for product in self.products:
            print(f"🔍 Observing product: {product}")
            evidence_files = self.find_evidence_files(product)
            report_path = self.generate_observation_report(product, evidence_files)
            # Add to registry
            entry = add_observation(product, report_path)
            print(f"📝 Added to evidence registry as {entry['id']}")

        print("\n✅ Observer Engine completed!")
        print("📊 Next step: Review observation reports in workspace/products/<product>/evidence/observations/")


if __name__ == "__main__":
    engine = EOSObserverEngine()
    engine.run()

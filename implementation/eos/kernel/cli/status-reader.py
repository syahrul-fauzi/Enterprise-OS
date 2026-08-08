#!/usr/bin/env python3
import os
from typing import Any, Dict, Tuple

import yaml

BASELINE_LOCK_PATH = "/root/Enterprise-OS/governance/BASELINE_LOCK.yaml"


def load_yaml(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"State file not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_repository_state() -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    baseline_lock = load_yaml(BASELINE_LOCK_PATH)
    governance_state_path = (
        baseline_lock.get("baseline", {}).get("repository_state")
        or baseline_lock.get("machine_readable_state", {}).get("governance_state")
    )
    if not governance_state_path:
        raise KeyError("BASELINE_LOCK.yaml does not declare repository_state")
    governance_state = load_yaml(governance_state_path)
    return baseline_lock, governance_state, governance_state_path


def format_evidence_states(evidence: Dict[str, Any]) -> str:
    ordered = ["governance", "foundation", "execution", "verification"]
    return ", ".join(f"{key}={evidence.get(key, 'UNKNOWN')}" for key in ordered)


def format_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return str(value).lower()
    return str(value)


def print_state_summary(
    baseline_lock: Dict[str, Any],
    governance_state: Dict[str, Any],
    governance_state_path: str,
) -> None:
    baseline = baseline_lock.get("baseline", {})
    current_gate = governance_state.get("current_gate", {})
    next_gate = governance_state.get("next_gate", {})
    repository = governance_state.get("repository", {})
    compliance_report = repository.get("architecture_compliance_report", {})
    predicate = governance_state.get("predicates", {}).get("ready_gate_b", {})
    evidence = governance_state.get("evidence", {})
    lifecycle = governance_state.get("lifecycle", {}).get("allowed_statuses", [])
    canonical_repository_state = governance_state.get("repository_state", {})
    repository_proof = governance_state.get("repository_proof", {})

    print("\n" + "=" * 64)
    print("EOS GOVERNANCE STATUS")
    print("=" * 64)

    print("\nState Contract")
    print(f"Baseline lock: {BASELINE_LOCK_PATH}")
    print(f"Repository state: {governance_state_path}")
    print(f"Baseline version: {baseline.get('version', 'UNKNOWN')}")
    print(f"Baseline status: {baseline.get('status', 'UNKNOWN')}")
    print(
        f"Certificate status: {baseline.get('certificate_status', 'UNKNOWN')}"
    )

    print("\nCurrent Gate")
    print(f"Gate: {current_gate.get('id', 'UNKNOWN')}")
    print(f"Name: {current_gate.get('name', 'UNKNOWN')}")
    print(f"Status: {current_gate.get('status', 'UNKNOWN')}")
    print(
        f"Next gate: {next_gate.get('id', 'UNKNOWN')} "
        f"({next_gate.get('name', 'UNKNOWN')})"
    )

    print("\nRepository")
    print(
        "Status: "
        f"{repository.get('status', repository.get('compliance', 'UNKNOWN'))}"
    )
    print(f"Compliance: {repository.get('compliance', 'UNKNOWN')}")
    print(
        f"Baseline violations: "
        f"{repository.get('baseline_violations', 'UNKNOWN')}"
    )
    print(f"Legacy violations: {repository.get('legacy_violations', 'UNKNOWN')}")
    print(
        "Architecture compliance report: "
        f"{compliance_report.get('status', 'UNKNOWN')}"
    )

    print("\nEvidence")
    print(format_evidence_states(evidence))

    print("\nGate B Predicate")
    print(f"Expression: {predicate.get('expression', 'UNKNOWN')}")
    print(f"Result: {format_scalar(predicate.get('result', 'UNKNOWN'))}")

    if canonical_repository_state:
        print("\nCanonical Repository State")
        print(
            "Governance: "
            f"{canonical_repository_state.get('governance', 'UNKNOWN')}"
        )
        print(
            "Readiness: "
            f"gate_b={format_scalar(canonical_repository_state.get('readiness', {}).get('gate_b', 'UNKNOWN'))}, "
            f"gate_c={format_scalar(canonical_repository_state.get('readiness', {}).get('gate_c', 'UNKNOWN'))}, "
            f"gate_d={format_scalar(canonical_repository_state.get('readiness', {}).get('gate_d', 'UNKNOWN'))}, "
            f"gate_e={format_scalar(canonical_repository_state.get('readiness', {}).get('gate_e', 'UNKNOWN'))}"
        )

    if repository_proof:
        print("\nRepository Proof")
        print(f"Proof id: {repository_proof.get('proof_id', 'UNKNOWN')}")
        print(
            f"Status: {repository_proof.get('proof_status', 'UNKNOWN')}"
        )
        print(
            f"Registry hash: {repository_proof.get('registry_hash', 'UNKNOWN')}"
        )

    print("\nLifecycle")
    print(" -> ".join(lifecycle) if lifecycle else "UNKNOWN")

    print("\n" + "=" * 64 + "\n")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="EOS governance status reader")
    parser.add_argument(
        "action",
        nargs="?",
        default="show",
        choices=["show", "status"],
        help="Action to perform (show or status)",
    )
    args = parser.parse_args()

    if args.action in {"show", "status"}:
        baseline_lock, governance_state, governance_state_path = (
            load_repository_state()
        )
        print_state_summary(baseline_lock, governance_state, governance_state_path)


if __name__ == "__main__":
    main()

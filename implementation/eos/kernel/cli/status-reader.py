#!/usr/bin/env python3
import yaml
import os
from datetime import datetime
from typing import Optional, Dict, Any

CONFIG_PATH = "/root/Enterprise OS/eos.config.yaml"
STATE_PATH = "/root/Enterprise OS/implementation/eos/kernel/state/eos-state.yaml"


def load_config() -> Dict[str, Any]:
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(f"Config file not found at {CONFIG_PATH}")
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_state() -> Dict[str, Any]:
    if not os.path.exists(STATE_PATH):
        raise FileNotFoundError(f"State file not found at {STATE_PATH}")
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_state(state: Dict[str, Any]) -> None:
    state["last_updated"] = datetime.now().isoformat()
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(state, f, default_flow_style=False, sort_keys=False)


def print_state_summary(state: Dict[str, Any]) -> None:
    print("\n" + "=" * 50)
    print("           EOS CONTROL TOWER")
    print("=" * 50)
    print(f"\nVersion: {state['version']}")
    print(f"Phase: {state['phase']}")
    print(f"Sub-phase: {state['sub_phase']}")
    print(f"Next phase: {state['next_phase']}")

    print("\n--- Architecture ---")
    print(f"Status: {state['architecture']['status']}")

    print("\n--- Governance ---")
    print(f"Status: {state['governance']['status']}")
    print(f"Contract: {state['governance']['contract']}")

    print("\n--- Product ---")
    print(f"Primary: {state['product']['primary']}")
    print(f"Primary status: {state['product']['primary_status']}")

    print("\n--- Evidence Loop ---")
    print(f"Status: {state['evidence_loop']['status']}")
    print(f"Completed sessions: {', '.join(state['evidence_loop']['sessions']['completed'])}")

    print("\n--- Patterns ---")
    print(f"Discovered: {state['patterns']['discovered']}")
    print(f"Validated: {state['patterns']['validated']}")
    print(f"Candidates: {state['patterns']['candidates']}")

    print("\n--- Assets ---")
    print(f"Validated: {state['assets']['validated']}")
    print(f"Reused: {state['assets']['reused']}")

    print("\n--- Control Plane ---")
    print(f"Observer: {state['control_plane']['sensors']['observer']['status']}")
    print(f"Validator: {state['control_plane']['validators']['evidence_validator']['status']}")
    print(f"Pattern detection: {state['control_plane']['intelligence']['pattern_detection']['status']}")
    print(f"Doctor Engine: {state['control_plane']['delivery']['delivery_agent']['status']}")
    print(f"Extraction: {state['control_plane']['extraction']['status']}")

    print("\n--- Control Tower Health ---")
    print(f"Architecture: {state['control_tower']['health']['architecture']}%")
    print(f"Delivery: {state['control_tower']['health']['delivery']}%")
    print(f"Evidence: {state['control_tower']['health']['evidence']}%")
    print(f"Asset confidence: {state['control_tower']['health']['asset_confidence']}%")

    print("\n" + "=" * 50 + "\n")


def update_observer_status(status: str) -> None:
    state = load_state()
    state["control_plane"]["sensors"]["observer"]["status"] = status
    save_state(state)
    print(f"✅ Observer status updated to: {status}")


def update_validator_status(status: str) -> None:
    state = load_state()
    state["control_plane"]["validators"]["evidence_validator"]["status"] = status
    save_state(state)
    print(f"✅ Validator status updated to: {status}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="EOS Status Reader")
    parser.add_argument("action", nargs="?", default="show",
                        choices=["show", "update-observer", "update-validator"],
                        help="Action to perform (show, update-observer, update-validator)")
    parser.add_argument("--status", type=str,
                        help="Status to set (for update actions)")
    args = parser.parse_args()

    if args.action == "show":
        state = load_state()
        print_state_summary(state)
    elif args.action == "update-observer":
        if not args.status:
            print("❌ Please provide --status")
            return
        update_observer_status(args.status)
    elif args.action == "update-validator":
        if not args.status:
            print("❌ Please provide --status")
            return
        update_validator_status(args.status)


if __name__ == "__main__":
    main()

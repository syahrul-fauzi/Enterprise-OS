#!/usr/bin/env python3
import os
import yaml
from datetime import datetime
from typing import Dict, Any, List, Optional

CONFIG_PATH = "/root/Enterprise OS/eos.config.yaml"
REGISTRY_PATH = "/root/Enterprise OS/implementation/eos/kernel/registry/evidence-registry.yaml"


def load_config() -> Dict[str, Any]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_registry() -> Dict[str, Any]:
    if not os.path.exists(REGISTRY_PATH):
        return {"version": "1.0", "evidence": []}
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {"version": "1.0", "evidence": []}


def save_registry(registry: Dict[str, Any]) -> None:
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(registry, f, default_flow_style=False, sort_keys=False)


def generate_id(registry: Dict[str, Any], prefix: str) -> str:
    count = sum(1 for e in registry["evidence"] if e.get("id", "").startswith(prefix))
    return f"{prefix}-{count+1:03d}"


def add_observation(
    source_product: str,
    file_path: str,
    created_at: Optional[str] = None
) -> Dict[str, Any]:
    registry = load_registry()
    obs_id = generate_id(registry, "OBS")
    entry = {
        "id": obs_id,
        "source": {"product": source_product},
        "type": "observation",
        "status": "pending_validation",
        "file": os.path.relpath(file_path, "/root/Enterprise OS"),
        "created_at": created_at or datetime.now().isoformat()
    }
    registry["evidence"].append(entry)
    save_registry(registry)
    return entry


def update_observation_status(
    obs_id: str,
    status: str,
    validated_at: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    registry = load_registry()
    for entry in registry["evidence"]:
        if entry["id"] == obs_id and entry["type"] == "observation":
            entry["status"] = status
            entry["validated_at"] = validated_at or datetime.now().isoformat()
            save_registry(registry)
            return entry
    return None


def get_validated_observations() -> List[Dict[str, Any]]:
    registry = load_registry()
    return [e for e in registry["evidence"] if e["type"] == "observation" and e["status"] == "validated"]

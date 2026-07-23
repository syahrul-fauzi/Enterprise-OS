
# Canonical Serialization Utilities
import json
import hashlib
from typing import Any, Dict, List
from pathlib import Path


def canonical_json(obj: Any) -> str:
    """
    Produce canonical JSON string:
    - UTF-8 encoding
    - Lexicographically sorted keys
    - No trailing spaces
    - LF line endings only
    - No unnecessary whitespace
    """
    return json.dumps(
        obj,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        indent=None
    )


def canonical_json_dump(obj: Any, path: Path) -> None:
    """Write canonical JSON to file"""
    path.write_text(canonical_json(obj), encoding="utf-8", newline="\n")


def canonical_json_load(path: Path) -> Any:
    """Load JSON from file (non-canonical input okay)"""
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_digest(content: str) -> str:
    """Compute SHA-256 hex digest of string content"""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def compute_artifact_hash(obj: Any) -> str:
    """Compute canonical SHA-256 hash of any artifact"""
    return sha256_digest(canonical_json(obj))

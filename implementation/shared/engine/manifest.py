# Base Engine Manifest
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import hashlib

from shared.serialization.canonical import canonical_json


@dataclass
class EngineManifest:
    """
    Base Manifest class for all engine executions!
    Captures metadata about what happened for audit, replay, and enterprise ledger!
    """
    manifest_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    engine_id: str
    engine_name: str
    engine_version: str = "1.0.0"
    execution_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: Optional[str] = None
    input_artifact_hash: Optional[str] = None
    output_artifact_hash: Optional[str] = None
    configuration_hash: Optional[str] = None
    evidence_hash: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    status: str = "pending"
    provenance: Dict[str, Any] = field(default_factory=dict)
    additional_metadata: Dict[str, Any] = field(default_factory=dict)

    def compute_content_hash(self) -> str:
        """Compute a stable canonical hash of this manifest."""
        temp_data = {
            "manifest_id": self.manifest_id,
            "engine_id": self.engine_id,
            "engine_name": self.engine_name,
            "engine_version": self.engine_version,
            "execution_id": self.execution_id,
            "correlation_id": self.correlation_id,
            "input_artifact_hash": self.input_artifact_hash,
            "output_artifact_hash": self.output_artifact_hash,
            "configuration_hash": self.configuration_hash,
            "evidence_hash": self.evidence_hash,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "status": self.status,
            "provenance": self.provenance,
            "additional_metadata": self.additional_metadata
        }
        return hashlib.sha256(canonical_json(temp_data).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to canonical dict for serialization."""
        return {
            "manifest_id": self.manifest_id,
            "engine_id": self.engine_id,
            "engine_name": self.engine_name,
            "engine_version": self.engine_version,
            "execution_id": self.execution_id,
            "correlation_id": self.correlation_id,
            "input_artifact_hash": self.input_artifact_hash,
            "output_artifact_hash": self.output_artifact_hash,
            "configuration_hash": self.configuration_hash,
            "evidence_hash": self.evidence_hash,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "status": self.status,
            "provenance": self.provenance,
            "additional_metadata": self.additional_metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EngineManifest":
        return cls(
            manifest_id=data.get("manifest_id"),
            engine_id=data.get("engine_id"),
            engine_name=data.get("engine_name"),
            engine_version=data.get("engine_version", "1.0.0"),
            execution_id=data.get("execution_id"),
            correlation_id=data.get("correlation_id"),
            input_artifact_hash=data.get("input_artifact_hash"),
            output_artifact_hash=data.get("output_artifact_hash"),
            configuration_hash=data.get("configuration_hash"),
            evidence_hash=data.get("evidence_hash"),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            finished_at=datetime.fromisoformat(data["finished_at"]) if data.get("finished_at") else None,
            duration_seconds=data.get("duration_seconds"),
            status=data.get("status", "pending"),
            provenance=data.get("provenance", {}),
            additional_metadata=data.get("additional_metadata", {})
        )

# Engine Metadata & Execution Manifest
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import hashlib

from shared.serialization.canonical import canonical_json


@dataclass
class EngineMetadata:
    """
    Static metadata about an engine!
    This is immutable and describes the engine itself!
    """
    engine_id: str
    engine_name: str
    engine_version: str = "1.0.0"
    contract_version: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.utcnow)
    additional_metadata: Dict[str, Any] = field(default_factory=dict)

    def compute_content_hash(self) -> str:
        """Compute a stable canonical hash of engine metadata."""
        temp_data = {
            "engine_id": self.engine_id,
            "engine_name": self.engine_name,
            "engine_version": self.engine_version,
            "contract_version": self.contract_version,
            "capabilities": self.capabilities,
            "generated_at": self.generated_at.isoformat(),
            "additional_metadata": self.additional_metadata
        }
        return hashlib.sha256(canonical_json(temp_data).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "engine_id": self.engine_id,
            "engine_name": self.engine_name,
            "engine_version": self.engine_version,
            "contract_version": self.contract_version,
            "capabilities": self.capabilities,
            "generated_at": self.generated_at.isoformat(),
            "additional_metadata": self.additional_metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EngineMetadata":
        return cls(
            engine_id=data.get("engine_id"),
            engine_name=data.get("engine_name"),
            engine_version=data.get("engine_version", "1.0.0"),
            contract_version=data.get("contract_version"),
            capabilities=data.get("capabilities", []),
            generated_at=datetime.fromisoformat(data["generated_at"]) if data.get("generated_at") else datetime.utcnow(),
            additional_metadata=data.get("additional_metadata", {})
        )


@dataclass
class ExecutionDetails:
    """
    Lifecycle details of a specific execution!
    """
    execution_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    manifest_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    status: str = "pending"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "execution_id": self.execution_id,
            "manifest_id": self.manifest_id,
            "correlation_id": self.correlation_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "status": self.status
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionDetails":
        return cls(
            execution_id=data.get("execution_id"),
            manifest_id=data.get("manifest_id"),
            correlation_id=data.get("correlation_id"),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            finished_at=datetime.fromisoformat(data["finished_at"]) if data.get("finished_at") else None,
            duration_seconds=data.get("duration_seconds"),
            status=data.get("status", "pending")
        )


@dataclass
class ArtifactDetails:
    """
    Provenance details about artifacts involved in an execution!
    """
    input_artifact_hash: Optional[str] = None
    output_artifact_hash: Optional[str] = None
    configuration_hash: Optional[str] = None
    evidence_hash: Optional[str] = None
    evidence_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "input_artifact_hash": self.input_artifact_hash,
            "output_artifact_hash": self.output_artifact_hash,
            "configuration_hash": self.configuration_hash,
            "evidence_hash": self.evidence_hash,
            "evidence_id": self.evidence_id
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ArtifactDetails":
        return cls(
            input_artifact_hash=data.get("input_artifact_hash"),
            output_artifact_hash=data.get("output_artifact_hash"),
            configuration_hash=data.get("configuration_hash"),
            evidence_hash=data.get("evidence_hash"),
            evidence_id=data.get("evidence_id")
        )


@dataclass
class ExecutionManifest:
    """
    Dynamic manifest for a single engine execution!
    Organized into metadata, execution details, artifacts, and metrics!
    ABI v1
    """
    engine_metadata: EngineMetadata
    manifest_version: str = "1.0.0"  # Version of this manifest's ABI!
    execution: ExecutionDetails = field(default_factory=ExecutionDetails)
    artifacts: ArtifactDetails = field(default_factory=ArtifactDetails)
    provenance: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)
    additional_metadata: Dict[str, Any] = field(default_factory=dict)

    def compute_content_hash(self) -> str:
        """Compute a stable canonical hash of this execution manifest."""
        temp_data = {
            "manifest_version": self.manifest_version,
            "engine_metadata_hash": self.engine_metadata.compute_content_hash(),
            "execution": self.execution.to_dict(),
            "artifacts": self.artifacts.to_dict(),
            "provenance": self.provenance,
            "metrics": self.metrics,
            "additional_metadata": self.additional_metadata
        }
        return hashlib.sha256(canonical_json(temp_data).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "manifest_version": self.manifest_version,
            "engine_metadata": self.engine_metadata.to_dict(),
            "execution": self.execution.to_dict(),
            "artifacts": self.artifacts.to_dict(),
            "provenance": self.provenance,
            "metrics": self.metrics,
            "additional_metadata": self.additional_metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionManifest":
        return cls(
            manifest_version=data.get("manifest_version", "1.0.0"),
            engine_metadata=EngineMetadata.from_dict(data.get("engine_metadata", {})),
            execution=ExecutionDetails.from_dict(data.get("execution", {})),
            artifacts=ArtifactDetails.from_dict(data.get("artifacts", {})),
            provenance=data.get("provenance", {}),
            metrics=data.get("metrics", {}),
            additional_metadata=data.get("additional_metadata", {})
        )

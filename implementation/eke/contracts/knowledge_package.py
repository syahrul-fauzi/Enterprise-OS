# KnowledgePackage Contract (ABI v1)
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
from shared.contracts.metadata import EngineMetadata, Provenance
from shared.serialization.canonical import canonical_json, compute_artifact_hash


@dataclass
class ArtifactManifest:
    """Artifact manifest entry inside KnowledgePackage"""
    artifact_id: str
    artifact_type: str
    path: str
    hash: str
    size_bytes: int


@dataclass
class PackageMetadata:
    """Metadata for KnowledgePackage"""
    package_id: str
    version: str  # Semantic version (e.g., "1.0.0")
    name: str
    description: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)
    engine_metadata: EngineMetadata = field(default_factory=lambda: EngineMetadata(
        engine_id="eke",
        engine_name="Enterprise Knowledge Engine",
        engine_version="1.0.0"
    ))


@dataclass
class KnowledgePackage:
    """
    Frozen KnowledgePackage ABI v1 contract for EKE
    """
    metadata: PackageMetadata
    manifest: List[ArtifactManifest] = field(default_factory=list)
    artifacts: Dict[str, Any] = field(default_factory=dict)
    diagnostics_ref: Optional[str] = None
    evidence_ref: Optional[str] = None
    content_hash: Optional[str] = None

    def compute_content_hash(self) -> str:
        """Compute canonical hash of entire package content (excluding content_hash itself)"""
        temp_data = self.to_dict()
        temp_data.pop("content_hash", None)
        return compute_artifact_hash(temp_data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to canonical dict representation"""
        return {
            "metadata": {
                "package_id": self.metadata.package_id,
                "version": self.metadata.version,
                "name": self.metadata.name,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "manifest": [
                {
                    "artifact_id": a.artifact_id,
                    "artifact_type": a.artifact_type,
                    "path": a.path,
                    "hash": a.hash,
                    "size_bytes": a.size_bytes
                }
                for a in self.manifest
            ],
            "artifacts": self.artifacts,
            "diagnostics_ref": self.diagnostics_ref,
            "evidence_ref": self.evidence_ref,
            "content_hash": self.content_hash
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "KnowledgePackage":
        """Load KnowledgePackage from dict"""
        metadata = PackageMetadata(
            package_id=data["metadata"]["package_id"],
            version=data["metadata"]["version"],
            name=data["metadata"]["name"],
            description=data["metadata"].get("description"),
            generated_at=datetime.fromisoformat(data["metadata"]["generated_at"]),
            engine_metadata=EngineMetadata.from_dict(data["metadata"]["engine_metadata"])
        )
        manifest = [
            ArtifactManifest(
                artifact_id=a["artifact_id"],
                artifact_type=a["artifact_type"],
                path=a["path"],
                hash=a["hash"],
                size_bytes=a["size_bytes"]
            )
            for a in data.get("manifest", [])
        ]
        return cls(
            metadata=metadata,
            manifest=manifest,
            artifacts=data.get("artifacts", {}),
            diagnostics_ref=data.get("diagnostics_ref"),
            evidence_ref=data.get("evidence_ref"),
            content_hash=data.get("content_hash")
        )

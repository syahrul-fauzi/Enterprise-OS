#!/usr/bin/env python3
"""
MOS Execution Ledger (Output Artifact)
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import hashlib
import uuid
from enum import Enum
from shared.engine.manifest import EngineMetadata
from shared.serialization.canonical import canonical_json


class ExecutionStatus(Enum):
    SCHEDULED = "scheduled"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ExecutionRecord:
    """Record of a single engine execution in the ledger."""
    engine_id: str
    engine_name: str
    engine_version: str
    execution_id: str
    correlation_id: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    status: ExecutionStatus = ExecutionStatus.SCHEDULED
    input_artifact_hash: Optional[str] = None
    output_artifact_hash: Optional[str] = None
    evidence_hash: Optional[str] = None
    diagnostics_ref: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionLedgerMetadata:
    """Metadata for an execution ledger."""
    name: str
    ledger_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    version: str = "1.0.0"
    description: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)
    engine_metadata: EngineMetadata = field(
        default_factory=lambda: EngineMetadata(
            engine_id="mos",
            engine_name="Mission Orchestration System",
            engine_version="1.0.0"
        )
    )


@dataclass
class ExecutionLedger:
    """Main ExecutionLedger artifact produced by MOS."""
    metadata: ExecutionLedgerMetadata
    execution_records: List[ExecutionRecord] = field(default_factory=list)
    diagnostics_ref: Optional[str] = None
    evidence_ref: Optional[str] = None
    content_hash: Optional[str] = None

    def compute_content_hash(self) -> str:
        """Compute a stable, canonical hash for this execution ledger."""
        temp_data = {
            "metadata": {
                "name": self.metadata.name,
                "ledger_id": self.metadata.ledger_id,
                "version": self.metadata.version,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "execution_records": [
                {
                    "engine_id": rec.engine_id,
                    "engine_name": rec.engine_name,
                    "engine_version": rec.engine_version,
                    "execution_id": rec.execution_id,
                    "correlation_id": rec.correlation_id,
                    "started_at": rec.started_at.isoformat() if rec.started_at else None,
                    "finished_at": rec.finished_at.isoformat() if rec.finished_at else None,
                    "duration_seconds": rec.duration_seconds,
                    "status": rec.status.value,
                    "input_artifact_hash": rec.input_artifact_hash,
                    "output_artifact_hash": rec.output_artifact_hash,
                    "evidence_hash": rec.evidence_hash,
                    "diagnostics_ref": rec.diagnostics_ref
                } for rec in self.execution_records
            ]
        }
        return hashlib.sha256(canonical_json(temp_data).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to canonical dict for serialization."""
        return {
            "metadata": {
                "name": self.metadata.name,
                "ledger_id": self.metadata.ledger_id,
                "version": self.metadata.version,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "execution_records": [
                {
                    "engine_id": rec.engine_id,
                    "engine_name": rec.engine_name,
                    "engine_version": rec.engine_version,
                    "execution_id": rec.execution_id,
                    "correlation_id": rec.correlation_id,
                    "started_at": rec.started_at.isoformat() if rec.started_at else None,
                    "finished_at": rec.finished_at.isoformat() if rec.finished_at else None,
                    "duration_seconds": rec.duration_seconds,
                    "status": rec.status.value,
                    "input_artifact_hash": rec.input_artifact_hash,
                    "output_artifact_hash": rec.output_artifact_hash,
                    "evidence_hash": rec.evidence_hash,
                    "diagnostics_ref": rec.diagnostics_ref,
                    "metadata": rec.metadata
                } for rec in self.execution_records
            ],
            "diagnostics_ref": self.diagnostics_ref,
            "evidence_ref": self.evidence_ref,
            "content_hash": self.content_hash
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionLedger":
        """Load from dict."""
        engine_meta = EngineMetadata.from_dict(
            data["metadata"]["engine_metadata"]
        ) if "engine_metadata" in data["metadata"] else None

        metadata = ExecutionLedgerMetadata(
            name=data["metadata"]["name"],
            ledger_id=data["metadata"].get("ledger_id"),
            version=data["metadata"].get("version", "1.0.0"),
            description=data["metadata"].get("description"),
            generated_at=datetime.fromisoformat(data["metadata"]["generated_at"]),
            engine_metadata=engine_meta
        )

        execution_records = [
            ExecutionRecord(
                engine_id=rec_data["engine_id"],
                engine_name=rec_data["engine_name"],
                engine_version=rec_data["engine_version"],
                execution_id=rec_data["execution_id"],
                correlation_id=rec_data.get("correlation_id"),
                started_at=datetime.fromisoformat(rec_data["started_at"]) if rec_data.get("started_at") else None,
                finished_at=datetime.fromisoformat(rec_data["finished_at"]) if rec_data.get("finished_at") else None,
                duration_seconds=rec_data.get("duration_seconds"),
                status=ExecutionStatus(rec_data["status"]),
                input_artifact_hash=rec_data.get("input_artifact_hash"),
                output_artifact_hash=rec_data.get("output_artifact_hash"),
                evidence_hash=rec_data.get("evidence_hash"),
                diagnostics_ref=rec_data.get("diagnostics_ref"),
                metadata=rec_data.get("metadata", {})
            ) for rec_data in data.get("execution_records", [])
        ]

        return cls(
            metadata=metadata,
            execution_records=execution_records,
            diagnostics_ref=data.get("diagnostics_ref"),
            evidence_ref=data.get("evidence_ref"),
            content_hash=data.get("content_hash")
        )

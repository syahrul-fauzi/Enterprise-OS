#!/usr/bin/env python3
"""
CEOS Authorization Decision (Output Artifact)
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


class DecisionStatus(Enum):
    ALLOW = "allow"
    DENY = "deny"
    ABSTAIN = "abstain"


@dataclass
class PolicyEvaluation:
    """Single policy evaluation result."""
    policy_id: str
    policy_name: str
    status: DecisionStatus
    reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AuthorizationDecisionMetadata:
    """Metadata for an authorization decision."""
    name: str
    decision_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    version: str = "1.0.0"
    description: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)
    engine_metadata: EngineMetadata = field(
        default_factory=lambda: EngineMetadata(
            engine_id="ceos",
            engine_name="Compliance and Enterprise Authorization System",
            engine_version="1.0.0"
        )
    )


@dataclass
class AuthorizationDecision:
    """Main AuthorizationDecision artifact produced by CEOS."""
    metadata: AuthorizationDecisionMetadata
    overall_status: DecisionStatus
    policy_evaluations: List[PolicyEvaluation] = field(default_factory=list)
    diagnostics_ref: Optional[str] = None
    evidence_ref: Optional[str] = None
    content_hash: Optional[str] = None

    def compute_content_hash(self) -> str:
        """Compute a stable, canonical hash for this authorization decision."""
        temp_data = {
            "metadata": {
                "name": self.metadata.name,
                "decision_id": self.metadata.decision_id,
                "version": self.metadata.version,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "overall_status": self.overall_status.value,
            "policy_evaluations": [
                {
                    "policy_id": pe.policy_id,
                    "policy_name": pe.policy_name,
                    "status": pe.status.value,
                    "reason": pe.reason
                } for pe in self.policy_evaluations
            ]
        }
        return hashlib.sha256(canonical_json(temp_data).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to canonical dict for serialization."""
        return {
            "metadata": {
                "name": self.metadata.name,
                "decision_id": self.metadata.decision_id,
                "version": self.metadata.version,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "overall_status": self.overall_status.value,
            "policy_evaluations": [
                {
                    "policy_id": pe.policy_id,
                    "policy_name": pe.policy_name,
                    "status": pe.status.value,
                    "reason": pe.reason,
                    "metadata": pe.metadata
                } for pe in self.policy_evaluations
            ],
            "diagnostics_ref": self.diagnostics_ref,
            "evidence_ref": self.evidence_ref,
            "content_hash": self.content_hash
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AuthorizationDecision":
        """Load from dict."""
        engine_meta = EngineMetadata.from_dict(
            data["metadata"]["engine_metadata"]
        ) if "engine_metadata" in data["metadata"] else None

        metadata = AuthorizationDecisionMetadata(
            name=data["metadata"]["name"],
            decision_id=data["metadata"].get("decision_id"),
            version=data["metadata"].get("version", "1.0.0"),
            description=data["metadata"].get("description"),
            generated_at=datetime.fromisoformat(data["metadata"]["generated_at"]),
            engine_metadata=engine_meta
        )

        policy_evaluations = [
            PolicyEvaluation(
                policy_id=pe_data["policy_id"],
                policy_name=pe_data["policy_name"],
                status=DecisionStatus(pe_data["status"]),
                reason=pe_data.get("reason"),
                metadata=pe_data.get("metadata", {})
            ) for pe_data in data.get("policy_evaluations", [])
        ]

        return cls(
            metadata=metadata,
            overall_status=DecisionStatus(data["overall_status"]),
            policy_evaluations=policy_evaluations,
            diagnostics_ref=data.get("diagnostics_ref"),
            evidence_ref=data.get("evidence_ref"),
            content_hash=data.get("content_hash")
        )

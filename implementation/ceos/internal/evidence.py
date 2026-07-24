#!/usr/bin/env python3
"""
CEOS Authorization Evidence
Subclass of BaseEngineEvidence!
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from shared.engine.evidence import BaseEngineEvidence


@dataclass
class AuthorizationEvidence(BaseEngineEvidence):
    """Evidence of CEOS authorization evaluation."""
    execution_id: Optional[str] = None
    policy_ids_evaluated: List[str] = field(default_factory=list)
    evaluation_trace: List[Dict[str, Any]] = field(default_factory=list)
    configuration: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "execution_id": self.execution_id,
            "policy_ids_evaluated": self.policy_ids_evaluated,
            "evaluation_trace": self.evaluation_trace,
            "configuration": self.configuration,
            "notes": self.notes
        })
        return base_dict

    @classmethod
    def from_dict(cls, data: dict) -> "AuthorizationEvidence":
        base = BaseEngineEvidence.from_dict(data)
        return cls(
            started_at=base.started_at,
            finished_at=base.finished_at,
            configuration_hash=base.configuration_hash,
            input_artifact_hash=base.input_artifact_hash,
            items=base.items,
            execution_id=data.get("execution_id"),
            policy_ids_evaluated=data.get("policy_ids_evaluated", []),
            evaluation_trace=data.get("evaluation_trace", []),
            configuration=data.get("configuration", {}),
            notes=data.get("notes")
        )

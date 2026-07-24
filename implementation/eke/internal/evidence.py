#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Compiler Evidence
Subclass of BaseEngineEvidence
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from shared.engine.evidence import BaseEngineEvidence


@dataclass
class CompilerEvidence(BaseEngineEvidence):
    """
    Evidence of EKE compiler execution for replay and audit.
    """
    execution_id: Optional[str] = None  # Reference to ExecutionManifest.execution.execution_id
    pass_ids: List[str] = field(default_factory=list)  # Which passes were run
    constraint_ids: List[str] = field(default_factory=list)  # Which constraints were checked
    configuration: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "execution_id": self.execution_id,
            "pass_ids": self.pass_ids,
            "constraint_ids": self.constraint_ids,
            "configuration": self.configuration,
            "notes": self.notes
        })
        return base_dict

    @classmethod
    def from_dict(cls, data: dict) -> "CompilerEvidence":
        base = BaseEngineEvidence.from_dict(data)
        return cls(
            started_at=base.started_at,
            finished_at=base.finished_at,
            configuration_hash=base.configuration_hash,
            input_artifact_hash=base.input_artifact_hash,
            items=base.items,
            execution_id=data.get("execution_id"),
            notes=data.get("notes"),
            pass_ids=data.get("pass_ids", []),
            constraint_ids=data.get("constraint_ids", []),
            configuration=data.get("configuration", {})
        )

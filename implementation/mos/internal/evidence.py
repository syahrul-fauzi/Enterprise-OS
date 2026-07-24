#!/usr/bin/env python3
"""
MOS Execution Evidence
Subclass of BaseEngineEvidence!
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from shared.engine.evidence import BaseEngineEvidence


@dataclass
class ExecutionEvidence(BaseEngineEvidence):
    """Evidence of MOS mission execution."""
    execution_id: Optional[str] = None
    mission_ids: List[str] = field(default_factory=list)
    execution_trace: List[Dict[str, Any]] = field(default_factory=list)
    configuration: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "execution_id": self.execution_id,
            "mission_ids": self.mission_ids,
            "execution_trace": self.execution_trace,
            "configuration": self.configuration,
            "notes": self.notes
        })
        return base_dict

    @classmethod
    def from_dict(cls, data: dict) -> "ExecutionEvidence":
        base = BaseEngineEvidence.from_dict(data)
        return cls(
            started_at=base.started_at,
            finished_at=base.finished_at,
            configuration_hash=base.configuration_hash,
            input_artifact_hash=base.input_artifact_hash,
            items=base.items,
            execution_id=data.get("execution_id"),
            mission_ids=data.get("mission_ids", []),
            execution_trace=data.get("execution_trace", []),
            configuration=data.get("configuration", {}),
            notes=data.get("notes")
        )

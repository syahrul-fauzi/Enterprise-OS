#!/usr/bin/env python3
"""
Enterprise Architecture Orchestration Evidence
Subclass of BaseEngineEvidence!
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from shared.engine.evidence import BaseEngineEvidence


@dataclass
class MissionEvidence(BaseEngineEvidence):
    """
    Evidence of EAEO analysis
    """
    execution_id: Optional[str] = None
    mission_ids: List[str] = field(default_factory=list)
    objective_ids: List[str] = field(default_factory=list)
    configuration: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "execution_id": self.execution_id,
            "mission_ids": self.mission_ids,
            "objective_ids": self.objective_ids,
            "configuration": self.configuration,
            "notes": self.notes
        })
        return base_dict

    @classmethod
    def from_dict(cls, data: dict) -> "MissionEvidence":
        base = BaseEngineEvidence.from_dict(data)
        return cls(
            started_at=base.started_at,
            finished_at=base.finished_at,
            configuration_hash=base.configuration_hash,
            input_artifact_hash=base.input_artifact_hash,
            items=base.items,
            execution_id=data.get("execution_id"),
            mission_ids=data.get("mission_ids", []),
            objective_ids=data.get("objective_ids", []),
            configuration=data.get("configuration", {}),
            notes=data.get("notes")
        )

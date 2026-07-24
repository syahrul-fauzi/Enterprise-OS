#!/usr/bin/env python3
"""
Enterprise Intelligence Engine — Analysis Evidence
Subclass of BaseEngineEvidence!
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from shared.engine.evidence import BaseEngineEvidence


@dataclass
class AnalysisEvidence(BaseEngineEvidence):
    """
    Evidence of analysis execution for replay and audit.
    """
    execution_id: Optional[str] = None  # Reference to ExecutionManifest.execution.execution_id
    analyzer_ids: List[str] = field(default_factory=list)
    finding_ids: List[str] = field(default_factory=list)
    insight_ids: List[str] = field(default_factory=list)
    recommendation_ids: List[str] = field(default_factory=list)
    configuration: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "execution_id": self.execution_id,
            "analyzer_ids": self.analyzer_ids,
            "finding_ids": self.finding_ids,
            "insight_ids": self.insight_ids,
            "recommendation_ids": self.recommendation_ids,
            "configuration": self.configuration,
            "notes": self.notes
        })
        return base_dict

    @classmethod
    def from_dict(cls, data: dict) -> "AnalysisEvidence":
        base = BaseEngineEvidence.from_dict(data)
        return cls(
            started_at=base.started_at,
            finished_at=base.finished_at,
            configuration_hash=base.configuration_hash,
            input_artifact_hash=base.input_artifact_hash,
            items=base.items,
            execution_id=data.get("execution_id"),
            analyzer_ids=data.get("analyzer_ids", []),
            finding_ids=data.get("finding_ids", []),
            insight_ids=data.get("insight_ids", []),
            recommendation_ids=data.get("recommendation_ids", []),
            configuration=data.get("configuration", {}),
            notes=data.get("notes")
        )

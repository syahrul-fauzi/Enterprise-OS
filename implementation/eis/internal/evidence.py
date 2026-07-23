#!/usr/bin/env python3
"""
Enterprise Intelligence Engine — Analysis Evidence
Symmetric to EKE's Evidence!
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any
from datetime import datetime


@dataclass
class AnalysisEvidence:
    """
    Evidence of analysis execution for replay and audit.
    Symmetric to EKE's Evidence.
    """
    analyzer_ids: List[str] = field(default_factory=list)
    finding_ids: List[str] = field(default_factory=list)
    insight_ids: List[str] = field(default_factory=list)
    recommendation_ids: List[str] = field(default_factory=list)
    configuration: Dict[str, Any] = field(default_factory=dict)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "analyzer_ids": self.analyzer_ids,
            "finding_ids": self.finding_ids,
            "insight_ids": self.insight_ids,
            "recommendation_ids": self.recommendation_ids,
            "configuration": self.configuration,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes
        }

    @classmethod
    def from_dict(cls, data: dict) -> AnalysisEvidence:
        return cls(
            analyzer_ids=data.get("analyzer_ids", []),
            finding_ids=data.get("finding_ids", []),
            insight_ids=data.get("insight_ids", []),
            recommendation_ids=data.get("recommendation_ids", []),
            configuration=data.get("configuration", {}),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
            notes=data.get("notes")
        )

#!/usr/bin/env python3
"""
EAEO API Result Types
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from eaeo.contracts.mission_contract import MissionContract
from eaeo.internal.evidence import MissionEvidence
from eaeo.internal.diagnostics import MissionDiagnostic


class Status(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


@dataclass
class Metrics:
    duration_seconds: float = 0.0
    num_missions: int = 0
    num_objectives: int = 0
    num_tasks: int = 0


@dataclass
class EvidenceBundle:
    evidence_id: Optional[str] = None
    mission_evidence: Optional[MissionEvidence] = None


@dataclass
class AnalysisResult:
    status: Status
    mission_contract: Optional[MissionContract] = None
    diagnostics: List[MissionDiagnostic] = field(default_factory=list)
    metrics: Optional[Metrics] = None
    evidence: Optional[EvidenceBundle] = None
    duration: float = 0.0

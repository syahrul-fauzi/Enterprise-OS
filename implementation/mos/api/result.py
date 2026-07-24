#!/usr/bin/env python3
"""
MOS API Result Types
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from mos.contracts.execution_ledger import ExecutionLedger
from mos.internal.evidence import ExecutionEvidence
from mos.internal.diagnostics import ExecutionDiagnostic


class Status(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


@dataclass
class Metrics:
    duration_seconds: float = 0.0
    num_execution_records: int = 0
    overall_status: Optional[str] = None


@dataclass
class EvidenceBundle:
    evidence_id: Optional[str] = None
    execution_evidence: Optional[ExecutionEvidence] = None


@dataclass
class ExecutionResult:
    status: Status
    execution_ledger: Optional[ExecutionLedger] = None
    diagnostics: List[ExecutionDiagnostic] = field(default_factory=list)
    metrics: Optional[Metrics] = None
    evidence: Optional[EvidenceBundle] = None
    duration: float = 0.0

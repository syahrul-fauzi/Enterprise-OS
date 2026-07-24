#!/usr/bin/env python3
"""
CEOS API Result Types
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from ceos.contracts.authorization_decision import AuthorizationDecision
from ceos.internal.evidence import AuthorizationEvidence
from ceos.internal.diagnostics import AuthorizationDiagnostic


class Status(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


@dataclass
class Metrics:
    duration_seconds: float = 0.0
    num_policies: int = 0
    overall_decision: Optional[str] = None


@dataclass
class EvidenceBundle:
    evidence_id: Optional[str] = None
    authorization_evidence: Optional[AuthorizationEvidence] = None


@dataclass
class AuthorizationResult:
    status: Status
    authorization_decision: Optional[AuthorizationDecision] = None
    diagnostics: List[AuthorizationDiagnostic] = field(default_factory=list)
    metrics: Optional[Metrics] = None
    evidence: Optional[EvidenceBundle] = None
    duration: float = 0.0

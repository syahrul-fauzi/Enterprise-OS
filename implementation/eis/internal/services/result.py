"""
Service result, richer than RuleResult with events, diagnostics, etc.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, List, Dict, Optional

from ..knowledge import Finding, Metric, Recommendation
from ..artifacts import Artifact


@dataclass
class ServiceExecution:
    """Execution record from service engine, exportable."""
    results: Dict[str, "ServiceResult"] = field(default_factory=dict)
    artifacts: List[Artifact] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0.0
    errors: List[str] = field(default_factory=list)


@dataclass
class ServiceResult:
    """Result produced by a knowledge service, richer than RuleResult."""
    findings: List[Finding] = field(default_factory=list)
    metrics: List[Metric] = field(default_factory=list)
    recommendations: List[Recommendation] = field(default_factory=list)
    artifacts: List[Artifact] = field(default_factory=list)
    events: List[Dict[str, Any]] = field(default_factory=list)
    audit_records: List[Dict[str, Any]] = field(default_factory=list)
    diagnostics: Dict[str, Any] = field(default_factory=dict)
    execution_metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

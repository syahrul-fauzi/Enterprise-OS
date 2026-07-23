# EIS Operation Result Hierarchy (symmetric to EKE!)
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime
from eis.contracts.intelligence_package import EnterpriseIntelligencePackage
from eis.internal.evidence import AnalysisEvidence


class Status(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


@dataclass
class Metrics:
    """Intelligence operation metrics."""
    duration_seconds: float
    findings_count: int = 0
    insights_count: int = 0
    recommendations_count: int = 0
    decision_options_count: int = 0
    portfolio_items_count: int = 0
    roadmap_items_count: int = 0
    additional: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceBundle:
    """Evidence bundle for audit."""
    evidence_id: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    analysis_evidence: Optional[AnalysisEvidence] = None
    items: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class OperationResult:
    """Base class for all EIS operation results (symmetric to EKE!)."""
    status: Status
    metadata: Dict[str, Any] = field(default_factory=dict)
    diagnostics: List[Any] = field(default_factory=list)  # Will use AnalysisDiagnostic
    metrics: Optional[Metrics] = None
    evidence: Optional[EvidenceBundle] = None
    duration: float = 0.0
    artifacts: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalysisResult(OperationResult):
    """Result of full analyze() execution."""
    intelligence_package: Optional[EnterpriseIntelligencePackage] = None

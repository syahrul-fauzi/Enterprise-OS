# Operation Result Hierarchy
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime


class Status(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


@dataclass
class Diagnostic:
    """Diagnostic information (warnings, errors, info)"""
    level: str  # "error", "warning", "info"
    message: str
    source: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None


@dataclass
class Metrics:
    """Operation metrics"""
    duration_seconds: float
    artifacts_count: int = 0
    warnings_count: int = 0
    errors_count: int = 0
    additional: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceBundle:
    """Evidence bundle for audit"""
    evidence_id: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    items: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class OperationResult:
    """Base class for all operation results"""
    status: Status
    metadata: Dict[str, Any] = field(default_factory=dict)
    diagnostics: List[Diagnostic] = field(default_factory=list)
    metrics: Optional[Metrics] = None
    evidence: Optional[EvidenceBundle] = None
    duration: float = 0.0
    artifacts: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CompileResult(OperationResult):
    """Result of compile operation"""
    pass


@dataclass
class ValidateResult(OperationResult):
    """Result of validate operation"""
    pass


@dataclass
class GraphResult(OperationResult):
    """Result of build_graph operation"""
    pass


@dataclass
class PackageResult(OperationResult):
    """Result of package operation"""
    knowledge_package: Optional[Any] = None


@dataclass
class ProjectionResult(OperationResult):
    """Result of project operation"""
    projection_output: Optional[str] = None
    projection_type: Optional[str] = None

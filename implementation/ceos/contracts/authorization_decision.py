# AuthorizationDecision Contract
from dataclasses import dataclass, field
from typing import Any, List, Dict
from enum import Enum


class AuthorizationStatus(Enum):
    ALLOWED = "allowed"
    DENIED = "denied"
    CONDITIONAL = "conditional"


@dataclass
class AuthorizationDecision:
    """
    Public contract for AuthorizationDecision output from CEOS
    """
    decision_id: str = ""
    status: AuthorizationStatus = AuthorizationStatus.DENIED
    policy_evaluations: List[Dict[str, Any]] = field(default_factory=list)
    constitution_evaluations: List[Dict[str, Any]] = field(default_factory=list)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "status": self.status.value,
            "policy_evaluations": self.policy_evaluations,
            "constitution_evaluations": self.constitution_evaluations,
            "evidence": self.evidence,
            "metadata": self.metadata
        }

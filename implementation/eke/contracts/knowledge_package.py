# KnowledgePackage Contract
from dataclasses import dataclass, field
from typing import Any, List, Dict


@dataclass
class KnowledgePackage:
    """
    Public contract for KnowledgePackage output from EKE
    """
    inferred_relationships: List[Dict[str, Any]] = field(default_factory=list)
    findings: List[Dict[str, Any]] = field(default_factory=list)
    metrics: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    provenance: Dict[str, Any] = field(default_factory=dict)
    execution_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inferred_relationships": self.inferred_relationships,
            "findings": self.findings,
            "metrics": self.metrics,
            "recommendations": self.recommendations,
            "provenance": self.provenance,
            "execution_metadata": self.execution_metadata
        }

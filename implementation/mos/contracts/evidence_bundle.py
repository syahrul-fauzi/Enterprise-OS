# EvidenceBundle Contract
from dataclasses import dataclass, field
from typing import Any, List, Dict


@dataclass
class EvidenceBundle:
    """
    Public contract for EvidenceBundle output from MOS
    """
    bundle_id: str = ""
    evidence_items: List[Dict[str, Any]] = field(default_factory=list)
    assessments: List[Dict[str, Any]] = field(default_factory=list)
    decisions: List[Dict[str, Any]] = field(default_factory=list)
    certifications: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bundle_id": self.bundle_id,
            "evidence_items": self.evidence_items,
            "assessments": self.assessments,
            "decisions": self.decisions,
            "certifications": self.certifications,
            "metadata": self.metadata
        }

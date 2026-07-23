#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Finding
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from enum import Enum
from .provenance import Provenance
from .evidence import Evidence
from .base import KnowledgeElement


class FindingSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class FindingCategory(Enum):
    ORPHAN = "orphan"
    OWNERSHIP = "ownership"
    COVERAGE = "coverage"
    COMPLIANCE = "compliance"
    GOVERNANCE = "governance"
    ARCHITECTURE = "architecture"
    RISK = "risk"
    LIFECYCLE = "lifecycle"
    PLANNING = "planning"


@dataclass(kw_only=True)
class Finding(KnowledgeElement):
    category: FindingCategory
    severity: FindingSeverity
    rule_id: str
    rule_version: str
    message: str
    subject: Optional[str] = None
    related_objects: List[str] = field(default_factory=list)
    recommendation_ids: List[str] = field(default_factory=list)
    evidence: Optional[Evidence] = None

    def to_dict(self) -> dict:
        base_dict = super().to_dict()
        base_dict.update({
            "category": self.category.value,
            "severity": self.severity.value,
            "rule_id": self.rule_id,
            "rule_version": self.rule_version,
            "message": self.message,
            "subject": self.subject,
            "related_objects": self.related_objects,
            "recommendation_ids": self.recommendation_ids,
            "evidence": self.evidence.to_dict() if self.evidence else None
        })
        return base_dict

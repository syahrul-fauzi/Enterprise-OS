#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Provenance
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class Provenance:
    rule_id: str
    rule_version: str
    sources: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    confidence: float = 1.0
    explanation: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id,
            "rule_version": self.rule_version,
            "sources": self.sources,
            "timestamp": self.timestamp.isoformat(),
            "confidence": self.confidence,
            "explanation": self.explanation
        }

#!/usr/bin/env python3
"""
EAEO Diagnostics
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class MissionDiagnostic:
    code: str
    severity: str
    message: str
    source: Optional[str] = None
    details: Optional[dict] = None

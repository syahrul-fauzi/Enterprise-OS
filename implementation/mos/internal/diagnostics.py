#!/usr/bin/env python3
"""
MOS Diagnostics
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class ExecutionDiagnostic:
    code: str
    severity: str
    message: str
    source: Optional[str] = None
    details: Optional[dict] = None

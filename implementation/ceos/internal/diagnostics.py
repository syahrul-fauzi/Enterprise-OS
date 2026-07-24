#!/usr/bin/env python3
"""
CEOS Diagnostics
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class AuthorizationDiagnostic:
    code: str
    severity: str
    message: str
    source: Optional[str] = None
    details: Optional[dict] = None

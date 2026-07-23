#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Diagnostics System
Provides structured error, warning, and info reporting for compiler passes.
"""
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class DiagnosticSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class Diagnostic:
    code: str
    severity: DiagnosticSeverity
    message: str
    object_id: Optional[str] = None
    relationship_id: Optional[str] = None
    details: Optional[str] = None

    def __str__(self) -> str:
        lines = [
            f"{self.severity.value.upper()} {self.code}",
            f"  {self.message}"
        ]
        if self.object_id:
            lines.append(f"  Object: {self.object_id}")
        if self.relationship_id:
            lines.append(f"  Relationship: {self.relationship_id}")
        if self.details:
            lines.append(f"  Reason: {self.details}")
        return "\n".join(lines)


class DiagnosticEngine:
    def __init__(self):
        self.diagnostics: List[Diagnostic] = []

    def add(self, diagnostic: Diagnostic):
        self.diagnostics.append(diagnostic)

    def error(self, code: str, message: str, **kwargs):
        self.add(Diagnostic(code, DiagnosticSeverity.ERROR, message, **kwargs))

    def warning(self, code: str, message: str, **kwargs):
        self.add(Diagnostic(code, DiagnosticSeverity.WARNING, message, **kwargs))

    def info(self, code: str, message: str, **kwargs):
        self.add(Diagnostic(code, DiagnosticSeverity.INFO, message, **kwargs))

    @property
    def has_errors(self) -> bool:
        return any(d.severity == DiagnosticSeverity.ERROR for d in self.diagnostics)

    def report(self):
        for diagnostic in self.diagnostics:
            print(diagnostic)
            print()  # Add a blank line between diagnostics

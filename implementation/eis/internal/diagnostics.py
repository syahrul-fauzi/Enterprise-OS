#!/usr/bin/env python3
"""
Enterprise Intelligence Engine (EIS) — Diagnostics System
Provides structured error, warning, and info reporting for analysis pipeline.
"""
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class AnalysisDiagnosticSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class AnalysisDiagnostic:
    code: str
    severity: AnalysisDiagnosticSeverity
    message: str
    analyzer_id: Optional[str] = None
    details: Optional[str] = None

    def __str__(self) -> str:
        lines = [
            f"{self.severity.value.upper()} {self.code}",
            f"  {self.message}"
        ]
        if self.analyzer_id:
            lines.append(f"  Analyzer: {self.analyzer_id}")
        if self.details:
            lines.append(f"  Reason: {self.details}")
        return "\n".join(lines)


class AnalysisDiagnosticEngine:
    def __init__(self):
        self.diagnostics: List[AnalysisDiagnostic] = []

    def add(self, diagnostic: AnalysisDiagnostic):
        self.diagnostics.append(diagnostic)

    def error(self, code: str, message: str, **kwargs):
        self.add(AnalysisDiagnostic(code, AnalysisDiagnosticSeverity.ERROR, message, **kwargs))

    def warning(self, code: str, message: str, **kwargs):
        self.add(AnalysisDiagnostic(code, AnalysisDiagnosticSeverity.WARNING, message, **kwargs))

    def info(self, code: str, message: str, **kwargs):
        self.add(AnalysisDiagnostic(code, AnalysisDiagnosticSeverity.INFO, message, **kwargs))

    @property
    def has_errors(self) -> bool:
        return any(d.severity == AnalysisDiagnosticSeverity.ERROR for d in self.diagnostics)

    def report(self):
        for diagnostic in self.diagnostics:
            print(diagnostic)
            print()  # Add blank line between diagnostics

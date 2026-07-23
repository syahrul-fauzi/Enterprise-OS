# Base Engine Diagnostics
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class EngineDiagnosticSeverity(Enum):
    """Shared diagnostic severity levels for all engines!"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class EngineDiagnostic:
    """Base diagnostic dataclass!"""
    code: str
    severity: EngineDiagnosticSeverity
    message: str
    source: Optional[str] = None
    details: Optional[str] = None

    def __str__(self) -> str:
        parts = [f"[{self.severity.value.upper()}] {self.code}: {self.message}"]
        if self.source:
            parts.append(f"  Source: {self.source}")
        if self.details:
            parts.append(f"  Details: {self.details}")
        return "\n".join(parts)


class EngineDiagnosticEngine:
    """Base diagnostic engine that all EOS engines use!"""

    def __init__(self):
        self.diagnostics: List[EngineDiagnostic] = []

    def add(self, diagnostic: EngineDiagnostic):
        self.diagnostics.append(diagnostic)

    def error(self, code: str, message: str, **kwargs):
        self.add(EngineDiagnostic(
            code=code,
            severity=EngineDiagnosticSeverity.ERROR,
            message=message,
            **kwargs
        ))

    def warning(self, code: str, message: str, **kwargs):
        self.add(EngineDiagnostic(
            code=code,
            severity=EngineDiagnosticSeverity.WARNING,
            message=message,
            **kwargs
        ))

    def info(self, code: str, message: str, **kwargs):
        self.add(EngineDiagnostic(
            code=code,
            severity=EngineDiagnosticSeverity.INFO,
            message=message,
            **kwargs
        ))

    def critical(self, code: str, message: str, **kwargs):
        self.add(EngineDiagnostic(
            code=code,
            severity=EngineDiagnosticSeverity.CRITICAL,
            message=message,
            **kwargs
        ))

    @property
    def has_errors(self) -> bool:
        return any(
            d.severity in [EngineDiagnosticSeverity.ERROR, EngineDiagnosticSeverity.CRITICAL]
            for d in self.diagnostics
        )

    def report(self):
        for diagnostic in self.diagnostics:
            print(diagnostic)

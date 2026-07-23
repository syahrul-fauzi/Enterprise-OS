#!/usr/bin/env python3
"""
Enterprise Intelligence Engine (EIS) — Base Classes
Base classes and interfaces for the EIS analysis pipeline.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
from eis.internal.diagnostics import AnalysisDiagnosticEngine
from eke.contracts.knowledge_package import KnowledgePackage


@dataclass
class AnalysisContext:
    """
    Single shared context object for the entire EIS analysis pipeline.

    Attributes:
        diagnostics: Diagnostic engine for errors/warnings/info
        knowledge_package: Input KnowledgePackage to analyze
        configuration: Configuration for analysis
        started_at: When the analysis started
        analyzer_executions: Track individual analyzer executions
    """
    diagnostics: AnalysisDiagnosticEngine = field(default_factory=AnalysisDiagnosticEngine)
    knowledge_package: Optional[KnowledgePackage] = None
    configuration: Dict[str, Any] = field(default_factory=dict)
    started_at: datetime = field(default_factory=datetime.utcnow)
    analyzer_executions: Dict[str, Any] = field(default_factory=dict)

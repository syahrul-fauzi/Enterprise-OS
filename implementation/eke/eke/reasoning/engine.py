#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Reasoning Engine
Orchestrates reasoning modules to derive new knowledge
"""
from __future__ import annotations
import time
from typing import List
from eke.ir import EnterpriseIR
from eke.reasoning.base import ReasoningRule, ReasoningResult, ReasoningRegistry
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.rules import ExecutionEngine


class ReasoningEngine(ExecutionEngine[ReasoningRule, ReasoningResult]):
    def __init__(self, ir: EnterpriseIR, registry: ReasoningRegistry = None):
        if registry is None:
            from eke.reasoning import default_reasoning_registry
            registry = default_reasoning_registry()
        super().__init__(registry)
        self.ir = ir

    def run_all(self) -> List[ReasoningResult]:
        """
        Run all registered reasoning modules and return results
        """
        view = EnterpriseIRView(self.ir)

        def run(rule: ReasoningRule, context) -> ReasoningResult:
            start_time = time.time()
            inferred_rels = rule.execute(view)
            analysis_data = None
            from eke.reasoning.base import AnalysisRule
            if isinstance(rule, AnalysisRule):
                analysis_data = rule.analyze(view)
            end_time = time.time()
            execution_time_ms = (end_time - start_time) * 1000.0
            return ReasoningResult(
                rule_id=rule.metadata.id,
                rule_name=rule.metadata.name,
                rule_version=rule.metadata.version,
                inferred_relationships=inferred_rels,
                execution_time_ms=execution_time_ms,
                analysis_data=analysis_data
            )
        return self.execute(None, run)

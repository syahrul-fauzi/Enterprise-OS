#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Reasoning Engine
Orchestrates reasoning modules to derive new knowledge
"""
from __future__ import annotations
import time
from typing import List
from eke.ir import EnterpriseIR
from eke.reasoning.base import (
    ReasoningRule, ReasoningResult, ReasoningRegistry, InferenceRule, AnalysisRule
)
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
        Run reasoning in two stages:
        1. Inference: Mutate the graph by adding inferred relationships
        2. Assessment: Derive knowledge elements from the complete graph
        """
        all_results: List[ReasoningResult] = []

        # Stage 1: Inference Rules
        inference_rules = [
            rule for rule in self.registry.all()
            if isinstance(rule, InferenceRule)
        ]
        # Sort inference rules topologically
        sorted_inference = self._topological_sort(inference_rules)
        for rule in sorted_inference:
            start_time = time.time()
            view = EnterpriseIRView(self.ir)
            inferred_rels = rule.execute(view)
            # Add inferred relationships to the IR
            for rel in inferred_rels:
                self.ir.add_relationship(rel)
            end_time = time.time()
            execution_time_ms = (end_time - start_time) * 1000.0
            all_results.append(ReasoningResult(
                rule_id=rule.metadata.id,
                rule_name=rule.metadata.name,
                rule_version=rule.metadata.version,
                inferred_relationships=inferred_rels,
                execution_time_ms=execution_time_ms
            ))

        # Stage 2: Analysis Rules
        analysis_rules = [
            rule for rule in self.registry.all()
            if isinstance(rule, AnalysisRule)
        ]
        # Sort analysis rules topologically
        sorted_analysis = self._topological_sort(analysis_rules)
        for rule in sorted_analysis:
            start_time = time.time()
            view = EnterpriseIRView(self.ir)
            analysis_data = rule.analyze(view)
            end_time = time.time()
            execution_time_ms = (end_time - start_time) * 1000.0
            all_results.append(ReasoningResult(
                rule_id=rule.metadata.id,
                rule_name=rule.metadata.name,
                rule_version=rule.metadata.version,
                inferred_relationships=[],
                execution_time_ms=execution_time_ms,
                analysis_data=analysis_data
            ))

        return all_results

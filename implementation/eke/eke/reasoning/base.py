#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Reasoning Base
Base classes for reasoning rules
"""
from __future__ import annotations
from abc import abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from eke.rules import Rule, Registry, RuleMetadata
from eke.ir import IRRelationship
from eke.ir.views.enterprise_ir_view import EnterpriseIRView


@dataclass
class ReasoningResult:
    rule_id: str
    rule_name: str
    rule_version: str
    inferred_relationships: List[IRRelationship]
    execution_time_ms: float
    analysis_data: Optional[Dict[str, Any]] = None


class ReasoningRule(Rule):
    @abstractmethod
    def execute(self, view: EnterpriseIRView) -> List[IRRelationship]:
        pass


class InferenceRule(ReasoningRule):
    """Rule that infers new relationships"""
    pass


class AnalysisRule(ReasoningRule):
    """Rule that produces analysis data without inferring relationships"""
    @abstractmethod
    def analyze(self, view: EnterpriseIRView) -> Dict[str, Any]:
        pass

    def execute(self, view: EnterpriseIRView) -> List[IRRelationship]:
        # Analysis rules don't infer relationships
        return []


class ReasoningRegistry(Registry[ReasoningRule]):
    pass

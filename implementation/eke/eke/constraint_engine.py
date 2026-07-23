#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Constraint Engine
Evaluates constraints against a model and collects violations.
"""
import time
from typing import List, Optional
from eke.constraints.base import Constraint, ConstraintViolation, ConstraintEvaluationResult
from eke.constraints.registry import ConstraintRegistry
from eke.bound_model import BoundModel
from eke.rules import ExecutionEngine


class ConstraintEngine(ExecutionEngine[Constraint, ConstraintEvaluationResult]):
    def __init__(self, registry: Optional[ConstraintRegistry] = None):
        super().__init__(registry or ConstraintRegistry())

    def evaluate(self, bound_model: BoundModel) -> List[ConstraintEvaluationResult]:
        def run(constraint: Constraint, context) -> ConstraintEvaluationResult:
            start_time = time.time()
            violations = constraint.evaluate(context)
            end_time = time.time()
            execution_time_ms = (end_time - start_time) * 1000.0
            return ConstraintEvaluationResult(
                constraint_id=constraint.metadata.id,
                constraint_name=constraint.metadata.name,
                constraint_description=constraint.metadata.description,
                constraint_version=constraint.metadata.version,
                passed=len(violations) == 0,
                violations=violations,
                execution_time_ms=execution_time_ms
            )
        return self.execute(bound_model, run)


#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Constraint Base Classes
Base abstractions for constraint definitions and violations.
"""
from __future__ import annotations
from abc import abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional
from eke.rules import Rule, Registry, RuleMetadata


class ConstraintSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ConstraintViolation:
    constraint_id: str
    message: str
    severity: ConstraintSeverity
    object_id: Optional[str] = None
    relationship_id: Optional[str] = None


@dataclass
class ConstraintEvaluationResult:
    constraint_id: str
    constraint_name: str
    constraint_description: str
    constraint_version: str
    passed: bool
    violations: List[ConstraintViolation]
    execution_time_ms: float


class Constraint(Rule):
    severity: ConstraintSeverity = ConstraintSeverity.ERROR
    applies_to: List[str] = None

    @abstractmethod
    def evaluate(self, model) -> List[ConstraintViolation]:
        """
        Evaluate the constraint against the given model and return any violations.

        :param model: The model to evaluate the constraint against (usually a BoundModel)
        :return: List of ConstraintViolation objects (empty if no violations)
        """
        pass


class ConstraintRegistry(Registry[Constraint]):
    pass


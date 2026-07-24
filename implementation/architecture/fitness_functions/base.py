#!/usr/bin/env python3
"""
Base for fitness function results
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class FitnessStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"


@dataclass
class Violation:
    rule_id: str
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None


@dataclass
class FitnessResult:
    fitness_function_name: str
    status: FitnessStatus
    violations: List[Violation] = field(default_factory=list)
    duration_seconds: float = 0.0

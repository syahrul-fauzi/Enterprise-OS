#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Rules Core
Generic base classes for rules, registries, and execution engines
"""
from __future__ import annotations
from abc import ABC, abstractmethod
import time
from dataclasses import dataclass, field
from typing import List, Generic, TypeVar, Any, Callable, Optional


T = TypeVar("T")
R = TypeVar("R")


@dataclass
class RuleMetadata:
    id: str
    name: str
    description: str = ""
    version: str = "1.0.0"
    category: str = ""
    severity: str = "info"
    tags: List[str] = field(default_factory=list)
    author: Optional[str] = None
    since: Optional[str] = None
    deprecated: bool = False


class Rule(ABC):
    metadata: RuleMetadata


class Registry(Generic[T]):
    def __init__(self):
        self._items: List[T] = []

    def register(self, item: T):
        self._items.append(item)

    def all(self) -> List[T]:
        return list(self._items)


class ExecutionEngine(Generic[T, R]):
    def __init__(self, registry: Registry[T]):
        self.registry = registry

    def execute(
        self,
        context: Any,
        executor: Callable[[T, Any], R]
    ) -> List[R]:
        results: List[R] = []
        for rule in self.registry.all():
            start_time = time.time()
            result = executor(rule, context)
            end_time = time.time()
            results.append(result)
        return results

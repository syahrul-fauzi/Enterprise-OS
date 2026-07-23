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
    depends_on: List[str] = field(default_factory=list)
    domain: str = ""
    type: str = "assessment"  # "inference" or "assessment" or "planning"
    produces: List[str] = field(default_factory=list)


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

    def _topological_sort(self, rules: List[Rule]) -> List[Rule]:
        """Perform topological sort on rules based on depends_on metadata"""
        # Build rule map: rule.id → rule
        rule_map = {rule.metadata.id: rule for rule in rules}
        # Build adjacency list: node → [nodes that depend on it]
        adjacency = {rule.metadata.id: [] for rule in rules}
        # Build in-degree map
        in_degree = {rule.metadata.id: 0 for rule in rules}
        
        for rule in rules:
            for dep_id in rule.metadata.depends_on:
                if dep_id in rule_map:  # Only consider dependencies we actually have
                    adjacency[dep_id].append(rule.metadata.id)
                    in_degree[rule.metadata.id] += 1
        
        # Kahn's algorithm for topological sort
        queue = [rule_id for rule_id in in_degree if in_degree[rule_id] == 0]
        result = []
        
        while queue:
            current_id = queue.pop(0)
            result.append(rule_map[current_id])
            for neighbor_id in adjacency[current_id]:
                in_degree[neighbor_id] -= 1
                if in_degree[neighbor_id] == 0:
                    queue.append(neighbor_id)
        
        if len(result) != len(rules):
            # If there are cycles, just return the original order (but log warning?)
            return rules
        
        return result

    def execute(
        self,
        context: Any,
        executor: Callable[[T, Any], R]
    ) -> List[R]:
        results: List[R] = []
        # Sort rules topologically
        sorted_rules = self._topological_sort(self.registry.all())
        for rule in sorted_rules:
            start_time = time.time()
            result = executor(rule, context)
            end_time = time.time()
            results.append(result)
        return results

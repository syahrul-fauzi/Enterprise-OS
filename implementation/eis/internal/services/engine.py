"""
Service execution engine returning ServiceExecution object.
"""
from __future__ import annotations
import time
import logging
from typing import List, Dict, Optional
from datetime import datetime

from .base import KnowledgeService
from .context import ServiceContext
from .registry import ServiceRegistry, service_registry
from .result import ServiceResult, ServiceExecution


class ServiceEngine:
    """Engine for executing enterprise intelligence services."""

    def __init__(self, registry: ServiceRegistry = None):
        self.registry = registry or service_registry
        self.logger = logging.getLogger(__name__)

    def _topological_sort(self, services: List[KnowledgeService]) -> List[KnowledgeService]:
        """Perform topological sort on services based on depends_on metadata."""
        # Build service map: service.id → service
        service_map = {s.metadata.id: s for s in services}
        # Build adjacency list: node → [nodes that depend on it]
        adjacency = {s.metadata.id: [] for s in services}
        # Build in-degree map
        in_degree = {s.metadata.id: 0 for s in services}

        for service in services:
            for dep_id in service.metadata.depends_on:
                if dep_id in service_map:
                    adjacency[dep_id].append(service.metadata.id)
                    in_degree[service.metadata.id] += 1

        # Kahn's algorithm for topological sort
        queue = [s_id for s_id in in_degree if in_degree[s_id] == 0]
        result = []

        while queue:
            current_id = queue.pop(0)
            result.append(service_map[current_id])
            for neighbor_id in adjacency[current_id]:
                in_degree[neighbor_id] -= 1
                if in_degree[neighbor_id] == 0:
                    queue.append(neighbor_id)

        if len(result) != len(services):
            self.logger.warning("Cycle detected in service dependencies; using original order")
            return services

        return result

    def execute(
        self,
        context: ServiceContext,
        service_ids: Optional[List[str]] = None,
        domains: Optional[List[str]] = None,
        categories: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
    ) -> ServiceExecution:
        """
        Execute services and return ServiceExecution object.
        """
        start_time = time.time()

        # Determine which services to run
        services = self.registry.all()
        if service_ids:
            services = [s for s in services if s.metadata.id in service_ids]
        if domains:
            services = [s for s in services if s.metadata.domain in domains]
        if categories:
            services = [s for s in services if s.metadata.category in categories]
        if tags:
            services = [
                s for s in services
                if any(tag in s.metadata.tags for tag in tags)
            ]

        # Sort services topologically
        sorted_services = self._topological_sort(services)

        # Execute services
        execution = ServiceExecution()
        for service in sorted_services:
            service_start = time.time()
            try:
                result = service.execute(context)
                result.execution_metadata["duration_ms"] = (
                    (time.time() - service_start) * 1000
                )
                execution.results[service.metadata.id] = result

                # Collect artifacts
                execution.artifacts.extend(result.artifacts)

            except Exception as e:
                error_msg = f"Service {service.metadata.id} failed: {str(e)}"
                self.logger.error(error_msg, exc_info=True)
                execution.errors.append(error_msg)
                execution.results[service.metadata.id] = ServiceResult(
                    error=str(e),
                    execution_metadata={
                        "duration_ms": (time.time() - service_start) * 1000,
                    },
                )

        # Calculate total duration
        execution.duration_ms = (time.time() - start_time) * 1000

        return execution

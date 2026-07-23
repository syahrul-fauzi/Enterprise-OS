"""
Service registry with metadata-driven indexes for search.
"""
from __future__ import annotations
from typing import Dict, List, Optional
from collections import defaultdict

from .base import KnowledgeService
from .metadata import ServiceMetadata


class ServiceRegistry:
    """Registry for enterprise intelligence services with search indexes."""

    def __init__(self):
        self._services: Dict[str, KnowledgeService] = {}
        self._by_domain: Dict[str, List[KnowledgeService]] = defaultdict(list)
        self._by_category: Dict[str, List[KnowledgeService]] = defaultdict(list)
        self._by_tag: Dict[str, List[KnowledgeService]] = defaultdict(list)

    def register(self, service: KnowledgeService) -> None:
        """Register a service and build indexes."""
        metadata: ServiceMetadata = service.metadata
        self._services[metadata.id] = service

        # Build indexes
        if metadata.domain:
            self._by_domain[metadata.domain].append(service)
        if metadata.category:
            self._by_category[metadata.category].append(service)
        for tag in metadata.tags:
            self._by_tag[tag].append(service)

    def get(self, service_id: str) -> Optional[KnowledgeService]:
        """Get a service by ID."""
        return self._services.get(service_id)

    def all(self) -> List[KnowledgeService]:
        """Get all registered services."""
        return list(self._services.values())

    def by_domain(self, domain: str) -> List[KnowledgeService]:
        """Get services by domain."""
        return list(self._by_domain.get(domain, []))

    def by_category(self, category: str) -> List[KnowledgeService]:
        """Get services by category."""
        return list(self._by_category.get(category, []))

    def by_tag(self, tag: str) -> List[KnowledgeService]:
        """Get services by tag."""
        return list(self._by_tag.get(tag, []))


# Global registry instance
service_registry = ServiceRegistry()

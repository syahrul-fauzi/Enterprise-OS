"""
Base abstract class for knowledge services.
"""
from abc import ABC, abstractmethod

from .metadata import ServiceMetadata
from .context import ServiceContext
from .result import ServiceResult


class KnowledgeService(ABC):
    """Abstract base class for enterprise intelligence services."""
    metadata: ServiceMetadata

    @abstractmethod
    def execute(self, context: ServiceContext) -> ServiceResult:
        """Execute the service and return results."""
        pass

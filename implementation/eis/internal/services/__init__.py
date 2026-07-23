"""
Enterprise Intelligence Services — plugin system for extending EKE.
"""
from .metadata import ServiceMetadata
from .result import ServiceResult, ServiceExecution
from .context import ServiceContext
from .base import KnowledgeService
from .registry import ServiceRegistry, service_registry
from .engine import ServiceEngine

__all__ = [
    "ServiceMetadata",
    "ServiceResult",
    "ServiceExecution",
    "ServiceContext",
    "KnowledgeService",
    "ServiceRegistry",
    "service_registry",
    "ServiceEngine",
]

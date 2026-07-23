"""
Service context, providing only immutable stable artifacts, decoupled from compiler internals.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict
import logging
from datetime import datetime

from eke.knowledge_graph import KnowledgeGraph
from eke.artifacts import KnowledgePackage, ArtifactRegistry


@dataclass
class ServiceContext:
    """Context for service execution, exposing only stable, immutable artifacts."""
    knowledge_graph: KnowledgeGraph
    knowledge_package: KnowledgePackage
    artifacts: ArtifactRegistry
    configuration: Dict[str, Any]
    clock: datetime
    logger: logging.Logger

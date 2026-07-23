"""
Service metadata, mirroring RuleMetadata for architectural symmetry.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ServiceMetadata:
    id: str
    name: str
    description: str = ""
    version: str = "1.0.0"
    domain: str = ""
    category: str = ""
    depends_on: List[str] = field(default_factory=list)
    produces: List[str] = field(default_factory=list)
    author: Optional[str] = None
    since: Optional[str] = None
    deprecated: bool = False
    tags: List[str] = field(default_factory=list)

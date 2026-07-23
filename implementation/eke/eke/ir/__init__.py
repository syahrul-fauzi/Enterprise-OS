#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — IR Package
Enterprise Intermediate Representation
"""
from .core import (
    Provenance,
    IRObject,
    IRRelationship,
    EnterpriseIR,
    build_ir_from_graph
)

__all__ = [
    "Provenance",
    "IRObject",
    "IRRelationship",
    "EnterpriseIR",
    "build_ir_from_graph"
]

#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Bound Model
Represents enterprise objects and relationships with resolved references.
"""
from __future__ import annotations
from typing import Dict, Any, Optional
from eke.symbol_table import Symbol


class BoundObject:
    """Represents an enterprise object with resolved symbol."""
    def __init__(self, symbol: Symbol):
        self.symbol = symbol
        self.id = symbol.id
        self.type = symbol.type
        self.data = symbol.data

    def __repr__(self):
        return f"BoundObject({self.id}, type={self.type})"


class BoundRelationship:
    """Represents an enterprise relationship with resolved source/target references."""
    def __init__(
        self,
        data: Dict[str, Any],
        source: Optional[BoundObject] = None,
        target: Optional[BoundObject] = None
    ):
        self.data = data
        self.id = data.get("relationship", {}).get("id") or data.get("metadata", {}).get("id")
        self.type = data.get("relationship", {}).get("type")
        self.source_id = data.get("relationship", {}).get("source")
        self.target_id = data.get("relationship", {}).get("target")
        self.source = source
        self.target = target

    def __repr__(self):
        return f"BoundRelationship({self.id}, type={self.type}, source={self.source_id}, target={self.target_id})"


class BoundModel:
    """The bound enterprise model, containing all objects and relationships with resolved references."""
    def __init__(self):
        self.objects: Dict[str, BoundObject] = {}
        self.relationships: Dict[str, BoundRelationship] = {}

    def add_object(self, obj: BoundObject):
        if obj.id:
            self.objects[obj.id] = obj

    def add_relationship(self, rel: BoundRelationship):
        if rel.id:
            self.relationships[rel.id] = rel

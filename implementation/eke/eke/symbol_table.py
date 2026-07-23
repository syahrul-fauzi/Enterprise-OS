#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Symbol Table
Manages symbol resolution for EKL objects and relationships
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Symbol:
    """Represents a symbol in the symbol table"""
    id: str
    type: str
    data: Dict[str, Any]


class SymbolTable:
    """Symbol table for EKL compiler"""
    def __init__(self):
        self.symbols_by_id: Dict[str, Symbol] = {}

    def define(self, symbol: Symbol) -> None:
        """Define a new symbol in the table"""
        self.symbols_by_id[symbol.id] = symbol

    def resolve(self, symbol_id: str) -> Optional[Symbol]:
        """Resolve a symbol by its ID"""
        return self.symbols_by_id.get(symbol_id)

    def has_symbol(self, symbol_id: str) -> bool:
        """Check if a symbol exists in the table"""
        return symbol_id in self.symbols_by_id

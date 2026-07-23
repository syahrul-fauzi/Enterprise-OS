#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Symbol Resolution Pass
Builds symbol table and resolves references
"""
from typing import Dict, Any
from eke.passes import CompilerPass, CompilerContext
from eke.symbol_table import SymbolTable, Symbol
from eke.semantic_validation_pass import get_object_type, get_relationship_source, get_relationship_target


class SymbolResolutionPass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Running symbol resolution...")
        objects = context.objects
        relationships = context.relationships

        # Step 1: Build symbol table
        symbol_table = SymbolTable()
        for obj_id, obj_data in objects.items():
            obj_type = get_object_type(obj_data)
            symbol_table.define(Symbol(
                id=obj_id,
                type=obj_type,
                data=obj_data
            ))

        # Step 2: Store symbol table in context
        context.symbol_table = symbol_table

        # Step 3: Verify all references are resolvable
        # (this was already partially checked in semantic validation, but re-verify here with symbol table)
        for rel_id, rel_data in relationships.items():
            source_id = get_relationship_source(rel_data)
            target_id = get_relationship_target(rel_data)

            if source_id and not symbol_table.has_symbol(source_id):
                context.diagnostics.error(
                    code="EKL-2003",
                    message="Relationship source cannot be resolved",
                    relationship_id=rel_id,
                    details=f"Symbol '{source_id}' not found"
                )
            if target_id and not symbol_table.has_symbol(target_id):
                context.diagnostics.error(
                    code="EKL-2004",
                    message="Relationship target cannot be resolved",
                    relationship_id=rel_id,
                    details=f"Symbol '{target_id}' not found"
                )

        print("  ✅ Symbol resolution complete")
        return not context.diagnostics.has_errors

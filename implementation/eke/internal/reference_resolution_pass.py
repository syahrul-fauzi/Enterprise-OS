#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Reference Resolution Pass
Takes semantic model and symbol table and produces bound model with resolved references.
"""
from eke.base import CompilerPass, CompilerContext
from eke.bound_model import BoundObject, BoundRelationship, BoundModel
from eke.symbol_table import SymbolTable


class ReferenceResolutionPass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Running reference resolution...")
        symbol_table: SymbolTable = context.symbol_table
        if not symbol_table:
            context.diagnostics.error(
                code="EKL-5001",
                message="No symbol table available for reference resolution"
            )
            return False

        bound_model = BoundModel()

        # Step 1: Bind all objects
        for symbol_id, symbol in symbol_table.symbols_by_id.items():
            bound_obj = BoundObject(symbol)
            bound_model.add_object(bound_obj)

        # Step 2: Bind all relationships with resolved source/target
        relationships_data = context.relationships
        for rel_id, rel_data in relationships_data.items():
            source_id = rel_data.get("relationship", {}).get("source")
            target_id = rel_data.get("relationship", {}).get("target")

            source_obj = bound_model.objects.get(source_id) if source_id else None
            target_obj = bound_model.objects.get(target_id) if target_id else None

            bound_rel = BoundRelationship(
                data=rel_data,
                source=source_obj,
                target=target_obj
            )
            bound_model.add_relationship(bound_rel)

        print("  ✅ Reference resolution complete")
        context.bound_model = bound_model
        return True

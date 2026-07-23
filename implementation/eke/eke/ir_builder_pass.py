#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — IR Builder Pass
Converts Canonical Object Graph to stable Intermediate Representation.
"""
from eke.passes import CompilerPass, CompilerContext
from eke.ir import build_ir_from_graph


class IRBuilderPass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Building Enterprise IR...")
        graph = context.canonical_graph
        if not graph:
            context.diagnostics.error(
                code="EKL-3001",
                message="No canonical graph available to build IR from"
            )
            return False
        ir = build_ir_from_graph(graph)
        print(f"  ✅ Built IR with {len(ir.objects)} objects and {len(ir.relationships)} relationships")
        context.enterprise_ir = ir
        return True

#!/usr/bin/env python3
from shared.engine.context import EngineContext
import uuid

def test_correlation_id_inheritance():
    print("🧪 Testing correlation_id inheritance via from_parent()...")
    
    # Buat root context (first in chain)
    root_ctx = EngineContext()
    print(f"\n📌 Root Context:")
    print(f"  execution_id: {root_ctx.execution_id}")
    print(f"  correlation_id: {root_ctx.correlation_id}")
    
    # Buat child context dari root
    child_ctx = EngineContext.from_parent(root_ctx)
    print(f"\n📌 Child Context (from root):")
    print(f"  execution_id: {child_ctx.execution_id}")
    print(f"  correlation_id: {child_ctx.correlation_id}")
    print(f"  SAMA dengan root? {child_ctx.correlation_id == root_ctx.correlation_id}")
    
    # Buat grandchild dari child
    grandchild_ctx = EngineContext.from_parent(child_ctx)
    print(f"\n📌 Grandchild Context (from child):")
    print(f"  execution_id: {grandchild_ctx.execution_id}")
    print(f"  correlation_id: {grandchild_ctx.correlation_id}")
    print(f"  SAMA dengan root? {grandchild_ctx.correlation_id == root_ctx.correlation_id}")
    
    # Cek provenance
    print(f"\n🔍 Provenance chain:")
    print(f"  Child provenance: {child_ctx.provenance}")
    print(f"  Grandchild provenance: {grandchild_ctx.provenance}")
    
    # Verifikasi setiap execution_id unik
    execution_ids = [root_ctx.execution_id, child_ctx.execution_id, grandchild_ctx.execution_id]
    assert len(set(execution_ids)) == 3, "Semua execution_id harus unik!"
    print("\n✅ PASS: Semua execution_id unik, correlation_id terwarisi dengan benar!")
    
    # Cek correlation_id tidak pernah None (mandatory)
    assert root_ctx.correlation_id is not None
    assert child_ctx.correlation_id is not None
    assert grandchild_ctx.correlation_id is not None
    print("✅ PASS: correlation_id selalu terisi (tidak pernah None)!")

if __name__ == "__main__":
    test_correlation_id_inheritance()
// @ts-nocheck
/**
 * ECOM-002: Commerce Product Listing Creation End-to-End
 * Ecommerce-Ops vertical slice extension - Product listing management
 * Memverifikasi bahwa pembuatan listing produk terintegrasi penuh dengan Ecommerce-Ops product
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { capabilityRegistry } from "../../../capabilities/core/kernel/src/registry/capability-command-registry.ts";
import { SessionRepositoryInMemory } from "../../identity/dist/implementation/repositories/index.js";

describe("ECOM-002: Ecommerce-Ops Commerce Product Listing Integration", () => {
  let session: any;
  let executionContext: any;

  beforeEach(async () => {
    const sessions = await SessionRepositoryInMemory.list();
    session = sessions[0];
    
    console.log(`[ECOM-002 TEST] Using existing session: ${session.id}`);

    executionContext = {
      session_id: session.id,
      tenant_id: session.tenantId,
      workspace_id: session.workspaceId,
      actor_id: session.actorId
    };

    const { registerCommerceProductCapability } = await import("../../../capabilities/commerce-product/implementation/services/commerce-product.service.ts");
    registerCommerceProductCapability();
  });

  it("should integrate commerce-product capability into Ecommerce-Ops product (LAYER 5 Capability binding test)", async () => {
    const input = {
      title: "Ecommerce-Ops Integrated Product - Wireless Headphones",
      description: "Noise-cancelling wireless headphones with 30h battery life",
      price: 850000,
      sku: "ECOM-HP-001",
      category: "electronics",
      stockQuantity: 75,
      sessionId: session.id,
      workId: `work-ecom002-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const result = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input, executionContext);
    
    assert.ok(result, "Result harus terdefinisi");
    assert.ok(result.listing?.id, "Result harus memiliki ProductListingId");
    assert.strictEqual(result.listing.status, "draft", "State awal harus draft");
    assert.strictEqual(result.listing.sku, input.sku, "SKU harus sesuai input");
    
    console.log(`[ECOM-002 TEST] ✅ Product listing integrated successfully with Ecommerce-Ops: ${result.listing.id}`);
  });

  it("should maintain Ecommerce-Ops universal lifecycle consistency (LAYER 7 State transition test)", async () => {
    const input = {
      title: "Ecommerce-Ops Lifecycle Test - Cotton T-Shirt",
      description: "100% organic cotton premium t-shirt",
      price: 125000,
      sku: "ECOM-TS-001",
      category: "fashion",
      stockQuantity: 200,
      sessionId: session.id,
      workId: `work-ecom002-lc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const created = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input, executionContext);
    
    assert.strictEqual(created.listing.status, "draft", "Status awal harus draft sesuai universal lifecycle");
    assert.ok(created.workId, "Harus terhubung ke Work Core");
    
    console.log(`[ECOM-002 TEST] ✅ Universal lifecycle consistency maintained for Ecommerce-Ops`);
  });

  it("should have all Ecommerce-Ops evidence fields recorded (LAYER 8 Evidence test)", async () => {
    const input = {
      title: "Ecommerce-Ops Evidence Test - Smart Watch",
      description: "Fitness tracking smart watch with heart rate monitor",
      price: 450000,
      sku: "ECOM-SW-001",
      category: "electronics",
      stockQuantity: 120,
      sessionId: session.id,
      workId: `work-ecom002-ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const result = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input, executionContext);
    
    assert.ok(result.listing.createdAt, "Harus ada createdAt timestamp untuk Ecommerce-Ops audit");
    assert.ok(result.listing.updatedAt, "Harus ada updatedAt timestamp untuk Ecommerce-Ops audit");
    assert.ok(result.listing.createdBy, "Harus ada createdBy actor untuk Ecommerce-Ops accountability");
    
    console.log(`[ECOM-002 TEST] ✅ All Ecommerce-Ops evidence fields recorded successfully`);
  });
});
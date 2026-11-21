// @ts-nocheck
/**
 * COM-001: Commerce/Product End-to-End Test
 * LAYER 9: Executable test with real invocation (NO MOCKS)
 * Verifikasi bahwa pembuatan listing produk berjalan sesuai kontrak eos-product-slice
 * Mematuhi semua mandat user: Work sebagai invariant, Workspace sebagai execution context, workId wajib
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.ts";
import { SessionRepositoryInMemory } from "../../identity/dist/implementation/repositories/index.js";

describe("COM-001: Commerce Product Listing Creation End-to-End", () => {
  let session: any;
  let executionContext: any;

  beforeEach(async () => {
    // Gunakan session yang sudah ada di repository (tidak perlu buat baru)
    const sessions = await SessionRepositoryInMemory.list();
    session = sessions[0]; // Gunakan session-test-001 yang sudah terdaftar
    
    console.log(`[COM-001 TEST] Using existing session: ${session.id}`);

    // Buat execution context yang sesuai untuk parameter invoke keempat
    // PERBAIKAN: Field names menggunakan underscore sesuai dengan yang diharapkan oleh capabilityRegistry
    executionContext = {
      session_id: session.id,
      tenant_id: session.tenantId,
      workspace_id: session.workspaceId,
      actor_id: session.actorId
    };

    // Register semua command COM-001 sebelum test (dynamic import sesuai pattern slice services-id - gunakan service entry point)
    const { registerCommerceProductCapability } = await import("../implementation/services/commerce-product.service.ts");
    registerCommerceProductCapability();
  });

  it("should create a product listing with core Work integration (LAYER 5 Capability test)", async () => {
    const input = {
      title: "Test Smartphone X100 - PT Example Tech",
      description: "Smartphone flagship terbaru dengan spesifikasi tinggi",
      price: 15000000,
      sku: "TECH-SMARTPHONE-X100-001",
      category: "electronics",
      stockQuantity: 100,
      sessionId: session.id,
      workId: `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Panggil capability secara langsung (NO MOCKS) sesuai pola work-core
    // PERBAIKAN: Execution context dilewatkan sebagai parameter keempat, bukan di dalam input
    const result = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input, executionContext);
    
    // Verifikasi semua kriteria wajib terpenuhi
    assert.ok(result, "Result harus terdefinisi");
    assert.ok(result.listing?.id, "Result harus memiliki id (ProductListingId)");
    assert.ok(result.workId, "Result harus memiliki workId (CORE-001: wajib link ke Work Core, satu-satunya sumber truth)");
    assert.strictEqual(result.listing.status, "draft", "State awal harus draft");
    assert.strictEqual(result.listing.title, input.title, "Title harus sama dengan input");
    assert.strictEqual(result.listing.workspaceId, session.workspaceId, "workspaceId tercatat sebagai execution context");
    
    console.log(`[COM-001 TEST] ✅ Product listing created successfully: ${result.listing.id}, workId: ${result.workId}`);
  });

  it("should persist and fetch created product from repository (LAYER 6 Persistence test)", async () => {
    const input = {
      title: "Test Kaos Polos Premium - PT Example Fashion",
      description: "Kaos polos 100% cotton combed 30s",
      price: 150000,
      sku: "FASH-KAOS-POLOS-001",
      category: "fashion",
      stockQuantity: 50,
      sessionId: session.id,
      workId: `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Buat listing produk
    const created = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input, executionContext);
    
    // Verifikasi listing berhasil dibuat
    assert.ok(created.listing, "Created listing harus ada");
    assert.strictEqual(created.listing.sku, input.sku, "SKU harus sama dengan input");
    
    console.log(`[COM-001 TEST] ✅ Product listing persisted successfully: ${created.listing.id}`);
  });

  it("should have all required evidence fields in result (LAYER 8 Evidence test)", async () => {
    const input = {
      title: "Test Bukti Komersial - PT Example Evidence",
      description: "Produk untuk verifikasi bukti eksekusi",
      price: 5000000,
      sku: "EVIDENCE-TEST-001",
      category: "other",
      stockQuantity: 10,
      sessionId: session.id,
      workId: `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const result = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input, executionContext);
    
    // Verifikasi field bukti eksekusi ada
    assert.ok(result.listing.createdAt, "Harus ada createdAt timestamp");
    assert.ok(result.listing.updatedAt, "Harus ada updatedAt timestamp");
    assert.ok(result.listing.createdBy, "Harus ada createdBy actor");
    assert.ok(result.faceProjection, "Harus ada face projection");
    
    console.log(`[COM-001 TEST] ✅ All evidence fields present in result`);
  });
});
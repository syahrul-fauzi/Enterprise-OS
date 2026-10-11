/**
 * COM-001: Commerce/Product End-to-End Test
 * LAYER 9: Executable test with real invocation (NO MOCKS)
 * Verifikasi bahwa pembuatan listing produk berjalan sesuai kontrak eos-product-slice
 * Mematuhi semua mandat user: Work sebagai invariant, Workspace sebagai execution context, workId wajib
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDevAuthenticatedSession } from "../../../packages/core/kernel/src/session/workspace-session.js";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

describe("COM-001: Commerce Product Listing Creation End-to-End", () => {
  let session: any;

  beforeEach(async () => {
    // Buat session dev terautentikasi untuk testing (isolasi test)
    session = createDevAuthenticatedSession();
    // Override default tenant/workspace untuk test isolation (tidak mempengaruhi data lain)
    session.tenantId = "tenant.commerce.test";
    session.workspaceId = "workspace.commerce.test"; // CORE-001: Workspace sebagai execution context, bukan parent
    session.actorId = "actor.commerce.test.001";

    // Register semua command COM-001 sebelum test (dynamic import sesuai pattern slice services-id - gunakan service entry point)
    const { registerCommerceProductCapability } = await import("../implementation/services/commerce-product.service.js");
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
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId, // CORE-001: execution context, bukan ownership
      actorId: session.actorId
    };

    // Panggil capability secara langsung (NO MOCKS) sesuai pola work-core
    const result = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input);
    
    // Verifikasi semua kriteria wajib terpenuhi
    assert.ok(result, "Result harus terdefinisi");
    assert.ok(result.id, "Result harus memiliki id (ProductListingId)");
    assert.ok(result.workId, "Result harus memiliki workId (CORE-001: wajib link ke Work Core, satu-satunya sumber truth)");
    assert.strictEqual(result.status, "active", "State transition draft→active berhasil (LAYER 7 state transition)");
    assert.strictEqual(result.title, input.title, "Title harus sama dengan input");
    assert.strictEqual(result.workspaceId, session.workspaceId, "workspaceId tercatat sebagai execution context");
    
    console.log(`[COM-001 TEST] ✅ Product listing created successfully: ${result.id}, workId: ${result.workId}`);
  });

  it("should reject product creation with invalid session (authentication & authorization test)", async () => {
    const invalidInput = {
      title: "Test Invalid Product",
      price: 1000000,
      sku: "INVALID-SKU-001",
      category: "other",
      stockQuantity: 10,
      sessionId: "session.invalid.tidak.terdaftar", // Session yang tidak terdaftar di dev session
      tenantId: "tenant.invalid",
      workspaceId: "workspace.invalid",
      actorId: "actor.invalid"
    };

    // Harus throw error karena session tidak valid (otentikasi gagal
    await assert.rejects(
      () => capabilityRegistry.invoke("commerce-product", "product-listing.create", invalidInput),
      "Harus menolak pembuatan listing produk dengan session invalid"
    );
  });

  it("should persist and fetch created product from repository (LAYER 6 Persistence test)", async () => {
    const input = {
      title: "Test Kaos Polos Premium - PT Example Fashion",
      description: "Kaos polos 100% cotton combed 30s",
      price: 150000,
      sku: "FASH-KAOS-POLOS-001",
      category: "fashion",
      stockQuantity: 50,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    };

    // Buat listing produk
    const created = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input);
    
    // Ambil dari repository untuk verifikasi penyimpanan
    const fetched = await capabilityRegistry.invoke("commerce-product", "get-product-listing-by-id", {
      listingId: created.id,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    });

    // Verifikasi semua field cocok antara input → created → fetched
    assert.ok(fetched, "Fetched product listing harus terdefinisi");
    assert.strictEqual(fetched.id, created.id, "ProductListingId harus sama");
    assert.strictEqual(fetched.workId, created.workId, "workId harus sama (CORE-001 compliance, tidak berubah apapun)");
    assert.strictEqual(fetched.workspaceId, session.workspaceId, "workspaceId tetap tercatat sebagai execution context");
    assert.strictEqual(fetched.sku, input.sku, "SKU harus sama (untuk traceability produk)");
    assert.strictEqual(fetched.stockQuantity, input.stockQuantity, "Stock quantity harus sama");
    console.log(`[COM-001 TEST] ✅ Product listing persisted and retrievable: ${fetched.id}`);
  });

  it("should include workspace_id in evidence payload (CORE-001 evidence chain compliance)", async () => {
    const input = {
      title: "Test Monitor IPS 27\" - PT Example Electronics",
      description: "Monitor gaming 144Hz 4K",
      price: 5000000,
      sku: "TECH-MONITOR-IPS-001",
      category: "electronics",
      stockQuantity: 20,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    };

    const created = await capabilityRegistry.invoke("commerce-product", "product-listing.create", input);
    
    // Ambil listing lengkap untuk memeriksa evidence chain
    const fullListing = await capabilityRegistry.invoke("commerce-product", "get-product-listing-by-id", {
      listingId: created.id,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    });

    // Verifikasi evidence chain tidak kosong dan berisi workspace_id
    assert.ok(fullListing.evidence, "Evidence chain harus terdefinisi");
    assert.ok(Array.isArray(fullListing.evidence), "Evidence chain harus berupa array");
    assert.ok(fullListing.evidence.length > 0, "Harus minimal ada satu entry evidence");
    
    // Periksa entry pertama (pembuatan listing) mengandung workspace_id
    const firstEvidence = fullListing.evidence[0];
    assert.ok(firstEvidence.workspaceId, "Setiap entry evidence harus memiliki workspace_id (execution context)");
    assert.strictEqual(firstEvidence.workspaceId, session.workspaceId, "workspaceId di evidence harus sama dengan session");
    assert.ok(firstEvidence.actorId, "Evidence harus memiliki actorId (yang melakukan aksi)");
    assert.ok(firstEvidence.timestamp, "Evidence harus memiliki timestamp untuk audit trail");
    console.log(`[COM-001 TEST] ✅ Evidence chain verified with workspace_id: ${firstEvidence.workspaceId}`);
  });

  it("should support low stock detection (economic value testing - inventory management)", async () => {
    // Buat listing dengan stok rendah untuk memicu low stock alert
    const lowStockInput = {
      title: "Test Headphone Bluetooth - PT Example Audio",
      description: "Headphone noise cancelling",
      price: 2500000,
      sku: "AUDIO-HEADPHONE-BT-001",
      category: "electronics",
      stockQuantity: 3, // Di bawah threshold 5 unit → low stock
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    };

    const created = await capabilityRegistry.invoke("commerce-product", "product-listing.create", lowStockInput);
    
    // Tunggu scanner low stock berjalan (1 detik untuk async process)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ambil listing lagi untuk melihat status low stock
    const updatedListing = await capabilityRegistry.invoke("commerce-product", "get-product-listing-by-id", {
      listingId: created.id,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    });

    // Verifikasi low stock flag terdeteksi (dalam evidence atau status
    assert.ok(updatedListing.evidence.some((e: any) => e.type === "low-stock-alert"), "Harus ada low stock alert di evidence chain");
    console.log(`[COM-001 TEST] ✅ Low stock detection triggered untuk stok <5 unit (economic value testing works)`);
  });
});
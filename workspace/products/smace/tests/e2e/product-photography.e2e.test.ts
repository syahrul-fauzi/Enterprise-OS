// @ts-nocheck
// SMACE AI Product Photography E2E Test - verifikasi 8-step vertical slice end-to-end
// Menjalankan full workflow dari customer brief sampai commercial reconciliation

import { executeCreativeProductionWorkflow, completeWorkflowAfterApproval } from "../../runtime/execution-workflow.js";
import type { CreativeBrief } from "../../contracts/creative-brief.contract.js";

describe("SMACE AI Product Photography End-to-End Workflow", () => {
  // Test brief dasar untuk produk fashion di Tokopedia
  const testBrief: CreativeBrief = {
    id: "test-brief-001",
    productType: "fashion",
    targetMarketplace: "tokopedia",
    numberOfAssets: 5,
    brandGuidelines: {
      primaryColor: "#0066FF",
      logoRequired: true,
      allowedFonts: ["Inter", "Roboto"]
    },
    tenantId: "tenant-001", // Derived from context - sesuai requirement dynamic tenantId
    workspaceId: "workspace-001",
    requiredProviderType: "comfyui",
    productImages: ["base-product-image.jpg"]
  };

  const testActorId = "actor-001";
  const testSessionId = "session-valid-001";
  const testReviewerId = "reviewer-001";

  it("should complete full 8-step workflow from brief to reconciliation", async () => {
    // Step 1: Execute production workflow sampai quality check
    const executionResult = await executeCreativeProductionWorkflow(
      testBrief,
      testActorId,
      testSessionId
    );

    // Verifikasi step 1-5 berhasil: budget dipotong, produksi selesai, quality lulus
    expect(executionResult.budgetDeducted).toBe(true);
    expect(executionResult.productionCompleted).toBe(true);
    expect(executionResult.qualityPassed).toBe(true);
    expect(executionResult.workflowContext).toBeDefined();

    // Step 2: Proses human approval dengan status APPROVED
    const approvalResult = await completeWorkflowAfterApproval(
      executionResult.workflowContext,
      "APPROVED",
      testReviewerId,
      "Semua aset sesuai spesifikasi dan brand guidelines",
      {
        providerCost: 150000, // IDR 150rb
        reviewCost: 50000,   // IDR 50rb
        storageCost: 25000,  // IDR 25rb
        revenue: 500000      // IDR 500rb
      }
    );

    // Verifikasi step 6-8 berhasil: disetujui, dipaketkan, dikirim, dan direkonsiliasi
    expect(approvalResult.humanApproved).toBe(true);
    expect(approvalResult.packageDelivered).toBe(true);
    expect(approvalResult.c2paManifest).toBeDefined();
    expect(approvalResult.reconciliationCompleted).toBe(true);
    expect(approvalResult.costBreakdown).toBeDefined();
    expect(approvalResult.deliveryUrl).toBeDefined();

    // Verifikasi breakdown komersial sesuai ekspektasi
    expect(approvalResult.costBreakdown.contributionMargin).toBe(275000); // 500rb - 225rb total cost
    expect(approvalResult.costBreakdown.marginPercentage).toBe(55); // 275000 / 500000 * 100

    console.log("✅ Full E2E workflow passed! All 8 steps completed successfully.");
    console.log("📦 Delivery URL:", approvalResult.deliveryUrl);
    console.log("💰 Contribution margin:", approvalResult.costBreakdown.contributionMargin);
    console.log("📄 C2PA manifest generated:", !!approvalResult.c2paManifest);
  });

  it("should handle rejection workflow correctly", async () => {
    const rejectionBrief = { ...testBrief, id: "test-brief-002" };
    
    const executionResult = await executeCreativeProductionWorkflow(
      rejectionBrief,
      testActorId,
      testSessionId
    );

    const rejectionResult = await completeWorkflowAfterApproval(
      executionResult.workflowContext,
      "REJECTED",
      testReviewerId,
      "Aset tidak memenuhi spesifikasi resolusi yang diminta"
    );

    expect(rejectionResult.humanApproved).toBe(false);
    expect(rejectionResult.packageDelivered).toBe(false);
    expect(rejectionResult.reconciliationCompleted).toBe(false);

    console.log("✅ Rejection workflow handled correctly.");
  });

  it("should handle revision request workflow correctly", async () => {
    const revisionBrief = { ...testBrief, id: "test-brief-003" };
    
    const executionResult = await executeCreativeProductionWorkflow(
      revisionBrief,
      testActorId,
      testSessionId
    );

    const revisionResult = await completeWorkflowAfterApproval(
      executionResult.workflowContext,
      "REVISION_REQUESTED",
      testReviewerId,
      "Mohon perbaiki background menjadi transparan sesuai brief"
    );

    expect(revisionResult.humanApproved).toBe(false);
    expect(revisionResult.packageDelivered).toBe(false);
    expect(revisionResult.reconciliationCompleted).toBe(false);

    console.log("✅ Revision request workflow handled correctly.");
  });
});
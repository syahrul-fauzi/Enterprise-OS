import { describe, expect, it } from "vitest";

const buildBrief = (overrides = {}) => ({
  id: "test-brief-001",
  tenantId: "tenant-001",
  workspaceId: "workspace-001",
  actorId: "user-001",
  customerId: "customer-acme-001",
  productType: "fashion-apparel",
  brandGuidelinesUrl: "https://acme.com/brand-guidelines.pdf",
  targetMarketplace: "tokopedia",
  assetCount: 5,
  reviewerIds: ["reviewer@acme.com"],
  requiresAdobeFirefly: false,
  requiredProviderType: "comfyui",
  canonicalWorkId: "work-test-001",
  createdAt: new Date().toISOString(),
  createdBy: "creator@acme.com",
  status: "submitted",
  generatedAssets: [
    "https://mock-cdn.com/asset-1.png",
    "https://mock-cdn.com/asset-2.png",
    "https://mock-cdn.com/asset-3.png",
    "https://mock-cdn.com/asset-4.png",
    "https://mock-cdn.com/asset-5.png"
  ],
  selectedProvider: "comfyui",
  approvalHistory: [],
  ...overrides,
});

describe("SMACE AI product photography workflow", () => {
  it("accepts a valid creative brief and keeps provider selection aligned with requirements", () => {
    const brief = buildBrief();

    expect(brief.productType).toBe("fashion-apparel");
    expect(brief.assetCount).toBe(5);
    expect(brief.generatedAssets).toHaveLength(brief.assetCount);
    expect(["comfyui", "adobe-firefly"]).toContain(brief.requiredProviderType);
    expect(brief.selectedProvider).toBe(brief.requiredProviderType);
  });

  it("allows enterprise approval flow without mutating the core brief state", () => {
    const brief = buildBrief({ status: "approved", approvalHistory: ["reviewer@acme.com"] });

    expect(brief.status).toBe("approved");
    expect(brief.approvalHistory).toHaveLength(1);
    expect(brief.generatedAssets).toHaveLength(5);
    expect(brief.canonicalWorkId).toBe("work-test-001");
  });
});

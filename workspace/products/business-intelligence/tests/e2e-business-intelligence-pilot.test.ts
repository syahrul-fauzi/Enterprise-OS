import { describe, it, expect } from "vitest";
import { BUSINESS_INTELLIGENCE_WORKFLOW } from "../runtime/workflow-definition.js";
import { provideBusinessIntelligenceContext } from "../runtime/product-context-provider.js";

describe("Business Intelligence Pilot - UMKM Batik Jaya", () => {
  it("should provide valid product context", () => {
    const context = provideBusinessIntelligenceContext();
    expect(context.productId).toBe("business-intelligence");
    expect(context.displayName).toBe("Business Intelligence");
    expect(context.lifecycleStages).toHaveLength(6);
  });

  it("should have valid workflow definition", () => {
    expect(BUSINESS_INTELLIGENCE_WORKFLOW).toBeDefined();
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.id).toBe("business-intelligence-workflow");
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.stages).toHaveLength(6);
  });

  it("should include all required bounded contexts", () => {
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.boundedContexts).toBeDefined();
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.boundedContexts.identityBoundary).toBeDefined();
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.boundedContexts.semanticBoundary).toBeDefined();
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.boundedContexts.authorityBoundary).toBeDefined();
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.boundedContexts.executionBoundary).toBeDefined();
    expect(BUSINESS_INTELLIGENCE_WORKFLOW.boundedContexts.presentationBoundary).toBeDefined();
  });

  it("should use existing capabilities without new primitives", () => {
    const reusedCapabilities = BUSINESS_INTELLIGENCE_WORKFLOW.usesCapabilities;
    expect(reusedCapabilities).toContain("state-intelligence");
    expect(reusedCapabilities).toContain("observability");
    expect(reusedCapabilities).toContain("strategy-agent");
    expect(reusedCapabilities).toContain("evidence-registry");
  });
});
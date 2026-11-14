// @ts-nocheck
export interface AgenticWorkProductContext {
  readonly productId: "agentic-work";
  readonly displayName: "Agentic Work";
  readonly domain: "collab.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#059669"; // Emerald green for AI collaboration theme
    readonly logoPath: "/products/agentic-work/assets/logo.svg";
  };
  readonly features: {
    readonly aiAgentExecution: boolean;
    readonly capabilityMatching: boolean;
    readonly economicTracking: boolean;
    readonly crossProviderCollaboration: boolean;
  };
}

export function provideAgenticWorkContext(): AgenticWorkProductContext {
  return {
    productId: "agentic-work",
    displayName: "Agentic Work",
    domain: "collab.enterprise-os.com",
    branding: {
      primaryColor: "#059669",
      logoPath: "/products/agentic-work/assets/logo.svg",
    },
    features: {
      aiAgentExecution: true,
      capabilityMatching: true,
      economicTracking: true,
      crossProviderCollaboration: true,
    },
  };
}

// Backward compatibility for existing tests referencing old name
export const provideHumanAICollabContext = provideAgenticWorkContext;
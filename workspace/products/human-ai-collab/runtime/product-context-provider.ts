export interface HumanAICollabProductContext {
  readonly productId: "human-ai-collab";
  readonly displayName: "Human+AI Work Organization";
  readonly domain: "collab.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#059669"; // Emerald green for AI collaboration theme
    readonly logoPath: "/products/human-ai-collab/assets/logo.svg";
  };
  readonly features: {
    readonly aiAgentExecution: boolean;
    readonly capabilityMatching: boolean;
    readonly economicTracking: boolean;
    readonly crossProviderCollaboration: boolean;
  };
}

export function provideHumanAICollabContext(): HumanAICollabProductContext {
  return {
    productId: "human-ai-collab",
    displayName: "Human+AI Work Organization",
    domain: "collab.enterprise-os.com",
    branding: {
      primaryColor: "#059669",
      logoPath: "/products/human-ai-collab/assets/logo.svg",
    },
    features: {
      aiAgentExecution: true,
      capabilityMatching: true,
      economicTracking: true,
      crossProviderCollaboration: true,
    },
  };
}
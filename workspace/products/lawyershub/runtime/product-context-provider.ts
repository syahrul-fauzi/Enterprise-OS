/**
 * Product Runtime minimal untuk LawyersHub:
 * Hanya menyediakan product-specific context yang akan dikonsumsi oleh experience surface (apps/web)
 * TIDAK mengandung execution logic atau capability apapun — semua tetap shared
 */

export interface LawyersHubProductContext {
  readonly productId: "lawyershub";
  readonly displayName: "LawyersHub";
  readonly domain: "lawyershub.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#1e40af";
    readonly logoPath: "/products/lawyershub/assets/logo.svg";
  };
  readonly features: {
    readonly contractManagement: boolean;
    readonly eSignIntegration: boolean;
    readonly caseTracking: boolean;
  };
}

export function provideLawyersHubContext(): LawyersHubProductContext {
  return {
    productId: "lawyershub",
    displayName: "LawyersHub",
    domain: "lawyershub.enterprise-os.com",
    branding: {
      primaryColor: "#1e40af",
      logoPath: "/products/lawyershub/assets/logo.svg",
    },
    features: {
      contractManagement: true,
      eSignIntegration: true,
      caseTracking: true,
    },
  };
}
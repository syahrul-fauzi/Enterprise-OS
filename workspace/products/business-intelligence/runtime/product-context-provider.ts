// @ts-nocheck
export interface BusinessIntelligenceProductContext {
  readonly productId: "business-intelligence";
  readonly displayName: "Business Intelligence & Strategy Domain";
  readonly domain: "business-intelligence.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#2ecc71";
    readonly logoPath: "/products/business-intelligence/assets/logo.svg";
  };
  readonly features: {
    readonly businessContext: boolean;
    readonly businessIntelligence: boolean;
    readonly marketIntelligence: boolean;
    readonly businessAnalytics: boolean;
    readonly strategicIntelligence: boolean;
    readonly decisionIntelligence: boolean;
  };
  readonly supportedBusinessTypes: readonly ["UMKM", "Retail", "Manufacturing", "Services", "E-commerce"];
  readonly intelligenceSources: readonly ["internal-data", "market-data", "competitor-data", "industry-trends"];
}

export function provideBusinessIntelligenceContext(): BusinessIntelligenceProductContext {
  return {
    productId: "business-intelligence",
    displayName: "Business Intelligence & Strategy Domain",
    domain: "business-intelligence.enterprise-os.com",
    branding: {
      primaryColor: "#2ecc71",
      logoPath: "/products/business-intelligence/assets/logo.svg",
    },
    features: {
      businessContext: true,
      businessIntelligence: true,
      marketIntelligence: true,
      businessAnalytics: true,
      strategicIntelligence: true,
      decisionIntelligence: true
    },
    supportedBusinessTypes: ["UMKM", "Retail", "Manufacturing", "Services", "E-commerce"],
    intelligenceSources: ["internal-data", "market-data", "competitor-data", "industry-trends"]
  };
}
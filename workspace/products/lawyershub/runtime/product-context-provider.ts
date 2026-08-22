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
    readonly logoPath: string;
  };
  readonly features: {
    readonly contractManagement: boolean;
    readonly eSignIntegration: boolean;
    readonly caseTracking: boolean;
  };
}

export function provideLawyersHubContext(requestHeaders?: Headers): LawyersHubProductContext {
  // Override branding jika white label header ada
  const isWhiteLabel = requestHeaders?.get("X-EOS-Is-White-Label") === "true";
  const tenantBrandName = requestHeaders?.get("X-EOS-Tenant-Brand-Name");
  
  return {
    productId: "lawyershub",
    displayName: (isWhiteLabel && tenantBrandName) ? tenantBrandName as any : "LawyersHub",
    domain: "lawyershub.enterprise-os.com",
    branding: {
      primaryColor: "#1e40af",
      logoPath: isWhiteLabel ? "/branding/tenant-logo.svg" : "/products/lawyershub/assets/logo.svg",
    },
    features: {
      contractManagement: true,
      eSignIntegration: true,
      caseTracking: true,
    },
  };
}
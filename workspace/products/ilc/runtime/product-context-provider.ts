/**
 * Product Runtime minimal untuk ILC:
 * Hanya menyediakan product-specific context yang akan dikonsumsi oleh experience surface (apps/web)
 * TIDAK mengandung execution logic atau capability apapun — semua tetap shared
 */

export interface ILCProductContext {
  readonly productId: "ilc";
  readonly displayName: "ILC";
  readonly domain: "ilc.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#065f46";
    readonly logoPath: string;
  };
  readonly features: {
    readonly institutionalCoordination: boolean;
    readonly departmentalApproval: boolean;
    readonly executiveAuthorization: boolean;
  };
}

export function provideILCContext(requestHeaders?: Headers): ILCProductContext {
  // Override branding jika white label header ada
  const isWhiteLabel = requestHeaders?.get("X-EOS-Is-White-Label") === "true";
  const tenantBrandName = requestHeaders?.get("X-EOS-Tenant-Brand-Name");
  
  return {
    productId: "ilc",
    displayName: (isWhiteLabel && tenantBrandName) ? tenantBrandName as any : "ILC",
    domain: "ilc.enterprise-os.com",
    branding: {
      primaryColor: "#065f46",
      logoPath: isWhiteLabel ? "/branding/tenant-logo.svg" : "/products/ilc/assets/logo.svg",
    },
    features: {
      institutionalCoordination: true,
      departmentalApproval: true,
      executiveAuthorization: true,
    },
  };
}
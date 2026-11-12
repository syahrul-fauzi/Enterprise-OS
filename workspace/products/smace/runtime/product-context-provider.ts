/**
 * Product Runtime minimal untuk SMACE:
 * Hanya menyediakan product-specific context yang akan dikonsumsi oleh experience surface (apps/web)
 * TIDAK mengandung execution logic atau capability apapun — semua tetap shared
 * Menambahkan role configuration untuk SMACE tanpa modifikasi core EOS files
 */

export interface SMACEProductContext {
  readonly productId: "smace";
  readonly displayName: "SMACE";
  readonly domain: "smace.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#f59e0b";
    readonly logoPath: string;
  };
  readonly features: {
    readonly aiProductPhotography: boolean;
    readonly c2paProvenance: boolean;
    readonly budgetValidation: boolean;
    readonly multiStakeholderApproval: boolean;
  };
  readonly roleConfiguration: {
    readonly roles: Array<"customer" | "creative-operator" | "qa-inspector" | "finance-agent" | "provider-agent" | "system">;
    readonly approvalRequiredRoles: Array<"customer" | "qa-inspector">;
    readonly proposeAllowedRoles: Array<"customer" | "creative-operator">;
    readonly executeAllowedRoles: Array<"creative-operator" | "provider-agent" | "finance-agent">;
    readonly budgetThresholds: {
      maxAutoApprovedBudget: number;
      requireManualApprovalAbove: boolean;
    };
  };
}

export function provideSMACEContext(requestHeaders?: Headers): SMACEProductContext {
  // Override branding jika white label header ada
  const isWhiteLabel = requestHeaders?.get("X-EOS-Is-White-Label") === "true";
  const tenantBrandName = requestHeaders?.get("X-EOS-Tenant-Brand-Name");
  
  return {
    productId: "smace",
    displayName: (isWhiteLabel && tenantBrandName) ? tenantBrandName as any : "SMACE",
    domain: "smace.enterprise-os.com",
    branding: {
      primaryColor: "#f59e0b",
      logoPath: isWhiteLabel ? "/branding/tenant-logo.svg" : "/products/smace/assets/logo.svg",
    },
    features: {
      aiProductPhotography: true,
      c2paProvenance: true,
      budgetValidation: true,
      multiStakeholderApproval: true,
    },
    // SMACE Role Configuration - tanpa modifikasi core policy engine
    // Semua konfigurasi role disimpan di product context, sesuai pattern LawyersHub
    roleConfiguration: {
      roles: ["customer", "creative-operator", "qa-inspector", "finance-agent", "provider-agent", "system"],
      approvalRequiredRoles: ["customer", "qa-inspector"],
      proposeAllowedRoles: ["customer", "creative-operator"],
      executeAllowedRoles: ["creative-operator", "provider-agent", "finance-agent"],
      budgetThresholds: {
        maxAutoApprovedBudget: 50000000,
        requireManualApprovalAbove: true,
      },
    },
  };
}
export interface ValueMeteringProductContext {
  readonly productId: "value-metering";
  readonly displayName: "Operational Economics & Value Measurement";
  readonly domain: "valuemetering.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#16a34a";
    readonly logoPath: "/products/value-metering/assets/logo.svg";
  };
  readonly features: {
    readonly usageMetering: boolean;
    readonly costAttribution: boolean;
    readonly marginVisibility: boolean;
    readonly entitlementManagement: boolean;
  };
}

export function provideValueMeteringContext(): ValueMeteringProductContext {
  return {
    productId: "value-metering",
    displayName: "Operational Economics & Value Measurement",
    domain: "valuemetering.enterprise-os.com",
    branding: {
      primaryColor: "#16a34a",
      logoPath: "/products/value-metering/assets/logo.svg",
    },
    features: {
      usageMetering: true,
      costAttribution: true,
      marginVisibility: true,
      entitlementManagement: true,
    },
  };
}
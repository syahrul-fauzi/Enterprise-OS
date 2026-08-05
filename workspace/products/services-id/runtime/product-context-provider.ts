export interface ServicesIDProductContext {
  readonly productId: "services-id";
  readonly displayName: "Services.ID";
  readonly domain: "services-id.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#0f172a";
    readonly logoPath: "/products/services-id/assets/logo.svg";
  };
  readonly features: {
    readonly identityVerification: boolean;
    readonly accessManagement: boolean;
    readonly ssoIntegration: boolean;
  };
}

export function provideServicesIDContext(): ServicesIDProductContext {
  return {
    productId: "services-id",
    displayName: "Services.ID",
    domain: "services-id.enterprise-os.com",
    branding: {
      primaryColor: "#0f172a",
      logoPath: "/products/services-id/assets/logo.svg",
    },
    features: {
      identityVerification: true,
      accessManagement: true,
      ssoIntegration: true,
    },
  };
}
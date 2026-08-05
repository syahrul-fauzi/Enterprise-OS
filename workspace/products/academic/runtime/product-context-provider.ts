export interface AcademicProductContext {
  readonly productId: "academic";
  readonly displayName: "Academic Community";
  readonly domain: "academic.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#047857";
    readonly logoPath: "/products/academic/assets/logo.svg";
  };
  readonly features: {
    readonly researchPublishing: boolean;
    readonly collaborationTools: boolean;
    readonly citationManagement: boolean;
  };
}

export function provideAcademicContext(): AcademicProductContext {
  return {
    productId: "academic",
    displayName: "Academic Community",
    domain: "academic.enterprise-os.com",
    branding: {
      primaryColor: "#047857",
      logoPath: "/products/academic/assets/logo.svg",
    },
    features: {
      researchPublishing: true,
      collaborationTools: true,
      citationManagement: true,
    },
  };
}
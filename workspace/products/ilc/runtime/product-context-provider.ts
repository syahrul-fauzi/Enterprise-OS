export interface ILCProductContext {
  readonly productId: "ilc";
  readonly displayName: "Indonesia Lawyers Club";
  readonly domain: "ilc.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#b91c1c";
    readonly logoPath: "/products/ilc/assets/logo.svg";
  };
  readonly features: {
    readonly legalAidMatching: boolean;
    readonly caseDatabase: boolean;
    readonly communityForums: boolean;
  };
}

export function provideILCContext(): ILCProductContext {
  return {
    productId: "ilc",
    displayName: "Indonesia Lawyers Club",
    domain: "ilc.enterprise-os.com",
    branding: {
      primaryColor: "#b91c1c",
      logoPath: "/products/ilc/assets/logo.svg",
    },
    features: {
      legalAidMatching: true,
      caseDatabase: true,
      communityForums: true,
    },
  };
}
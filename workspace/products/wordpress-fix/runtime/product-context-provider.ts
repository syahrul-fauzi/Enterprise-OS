export interface WordPressProductContext {
  readonly productId: "wordpress-fix";
  readonly displayName: "WordPress/Website Fix";
  readonly domain: "wordpress.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#21759b";
    readonly logoPath: "/products/wordpress-fix/assets/logo.svg";
  };
  readonly features: {
    readonly coreUpdateSupport: boolean;
    readonly pluginTroubleshooting: boolean;
    readonly themeCompatibility: boolean;
    readonly hostingMigration: boolean;
    readonly securityPatch: boolean;
  };
  readonly supportedPlatforms: readonly ["WordPress", "Shopify", "Static HTML", "Jekyll", "Next.js"];
}

export function provideWordPressContext(): WordPressProductContext {
  return {
    productId: "wordpress-fix",
    displayName: "WordPress/Website Fix",
    domain: "wordpress.enterprise-os.com",
    branding: {
      primaryColor: "#21759b",
      logoPath: "/products/wordpress-fix/assets/logo.svg",
    },
    features: {
      coreUpdateSupport: true,
      pluginTroubleshooting: true,
      themeCompatibility: true,
      hostingMigration: true,
      securityPatch: true,
    },
    supportedPlatforms: ["WordPress", "Shopify", "Static HTML", "Jekyll", "Next.js"]
  };
}
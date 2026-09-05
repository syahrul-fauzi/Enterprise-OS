export interface EcommerceProductContext {
  readonly productId: "ecommerce-ops";
  readonly displayName: "E-commerce Ops";
  readonly domain: "ecommerce.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#8c52ff";
    readonly logoPath: "/products/ecommerce-ops/assets/logo.svg";
  };
  readonly features: {
    readonly multichannelSync: boolean;
    readonly paymentReconciliation: boolean;
    readonly inventoryManagement: boolean;
    readonly fraudDetection: boolean;
    readonly marketplaceConnector: boolean;
  };
  readonly supportedMarketplaces: readonly ["Shopee", "Tokopedia", "Lazada", "TikTok Shop", "WooCommerce"];
  readonly supportedPaymentGateways: readonly ["Midtrans", "Xendit", "ShopeePay", "GoPay", "DANA"];
}

export function provideEcommerceContext(): EcommerceProductContext {
  return {
    productId: "ecommerce-ops",
    displayName: "E-commerce Ops",
    domain: "ecommerce.enterprise-os.com",
    branding: {
      primaryColor: "#8c52ff",
      logoPath: "/products/ecommerce-ops/assets/logo.svg",
    },
    features: {
      multichannelSync: true,
      paymentReconciliation: true,
      inventoryManagement: true,
      fraudDetection: true,
      marketplaceConnector: true
    },
    supportedMarketplaces: ["Shopee", "Tokopedia", "Lazada", "TikTok Shop", "WooCommerce"],
    supportedPaymentGateways: ["Midtrans", "Xendit", "ShopeePay", "GoPay", "DANA"]
  };
}
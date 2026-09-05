export interface AdminSupportProductContext {
  readonly productId: "admin-support";
  readonly displayName: "Admin & Support";
  readonly domain: "admin.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#10b981";
    readonly logoPath: "/products/admin-support/assets/logo.svg";
  };
  readonly features: {
    readonly zendeskSync: boolean;
    readonly intercomSync: boolean;
    readonly ticketClassification: boolean;
    readonly teamRouting: boolean;
    readonly slaTracking: boolean;
  };
  readonly supportedTicketingPlatforms: readonly ["Zendesk", "Intercom", "Freshdesk", "HubSpot Service Hub", "Internal Ticketing"];
  readonly supportedCategories: readonly ["IT Support", "HR Admin", "Finance Admin", "General Inquiry"];
}

export function provideAdminSupportContext(): AdminSupportProductContext {
  return {
    productId: "admin-support",
    displayName: "Admin & Support",
    domain: "admin.enterprise-os.com",
    branding: {
      primaryColor: "#10b981",
      logoPath: "/products/admin-support/assets/logo.svg",
    },
    features: {
      zendeskSync: true,
      intercomSync: true,
      ticketClassification: true,
      teamRouting: true,
      slaTracking: true
    },
    supportedTicketingPlatforms: ["Zendesk", "Intercom", "Freshdesk", "HubSpot Service Hub", "Internal Ticketing"],
    supportedCategories: ["IT Support", "HR Admin", "Finance Admin", "General Inquiry"]
  };
}
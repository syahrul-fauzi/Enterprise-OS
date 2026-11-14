// @ts-nocheck
export interface DealCoordinatorProductContext {
  readonly productId: "deal-coordinator";
  readonly displayName: "Commercial Agreement & Fulfillment Coordination";
  readonly domain: "dealcoordinator.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#10b981";
    readonly logoPath: "/products/deal-coordinator/assets/logo.svg";
  };
  readonly features: {
    readonly serviceRequestManagement: boolean;
    readonly quotationApprovalFlow: boolean;
    readonly agreementTracking: boolean;
    readonly fulfillmentMonitoring: boolean;
    readonly invoiceReconciliation: boolean;
  };
  readonly supportedAgreementTypes: readonly ["Service Request", "Vendor Offer", "Commercial Contract", "Budget Commitment"];
  readonly supportedStakeholders: readonly ["Internal Team", "Vendor", "Customer", "Partner"];
}

export function provideDealCoordinatorContext(): DealCoordinatorProductContext {
  return {
    productId: "deal-coordinator",
    displayName: "Commercial Agreement & Fulfillment Coordination",
    domain: "dealcoordinator.enterprise-os.com",
    branding: {
      primaryColor: "#10b981",
      logoPath: "/products/deal-coordinator/assets/logo.svg",
    },
    features: {
      serviceRequestManagement: true,
      quotationApprovalFlow: true,
      agreementTracking: true,
      fulfillmentMonitoring: true,
      invoiceReconciliation: true
    },
    supportedAgreementTypes: ["Service Request", "Vendor Offer", "Commercial Contract", "Budget Commitment"],
    supportedStakeholders: ["Internal Team", "Vendor", "Customer", "Partner"]
  };
}
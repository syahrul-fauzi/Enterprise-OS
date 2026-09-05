export interface DataOpsProductContext {
  readonly productId: "dataops";
  readonly displayName: "Data/Ops Work";
  readonly domain: "dataops.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#16a34a";
    readonly logoPath: "/products/dataops/assets/logo.svg";
  };
  readonly features: {
    readonly dataValidation: boolean;
    readonly pipelineMonitoring: boolean;
    readonly automatedScaling: boolean;
  };
}

export function provideDataOpsContext(): DataOpsProductContext {
  return {
    productId: "dataops",
    displayName: "Data/Ops Work",
    domain: "dataops.enterprise-os.com",
    branding: {
      primaryColor: "#16a34a",
      logoPath: "/products/dataops/assets/logo.svg",
    },
    features: {
      dataValidation: true,
      pipelineMonitoring: true,
      automatedScaling: true,
    },
  };
}
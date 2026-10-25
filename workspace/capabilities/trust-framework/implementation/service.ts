export type {
  TrustFramework,
  TrustFrameworkCatalog,
  TrustFrameworkProvider,
  TrustSignatureProviderSPI,
  TrustSignatureReference,
  TrustSignatureProvider,
  TrustVerificationResult,
  TrustVerificationProfile,
} from "./contracts/index.js";

export {
  LocalTrustSignatureProviderService,
  TrustFrameworkService,
  localTrustSignatureProvider,
  trustFrameworkService,
} from "./services/trust-framework.service.js";

export {
  registerTrustFrameworkCapability,
  trustFrameworkCommands
} from "./commands/index.js";
// @ts-nocheck
/**
 * SMACE Product Runtime Barrel File
 * Expose product-specific context providers for import in core experience layer
 * Follows LawyersHub pattern for product-boundary isolation
 */
export { provideSMACEContext, type SMACEProductContext } from "./product-context-provider.js";
export { SMACE_AI_PRODUCT_PHOTOGRAPHY_WORKFLOW } from "./workflow-catalog.js";
// Export MCP adapter functions dan capability invokers untuk EOS-360 compliance
export { mapMcpPayloadToExecutionEnvelope, invokeCapability, invokeWorkCoreCommand } from "./capability-invokers.js";
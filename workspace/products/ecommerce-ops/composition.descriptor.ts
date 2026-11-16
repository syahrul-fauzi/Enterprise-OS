// @ts-nocheck
/**
 * Ecommerce Operations Product Composition Descriptor
 * EOS Core compliant capability registry for ecommerce-ops product
 * Integrates Genesis Business Domain capability as primary business semantics provider
 * Follows frozen core principles: no new core primitives, reuse existing EOS capabilities
 */

import { StaticRegistry } from "@repo/capability-registry/src/index";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/capability-registry/src/types";

// Reuse existing EOS Core capabilities (FROZEN - no changes to original implementations)
import { workCore } from "@capabilities/work-core/implementation/index";
import { identity } from "@capabilities/identity/implementation/index";
import { evidenceRegistry } from "@capabilities/evidence-registry/implementation/index";
import { observabilityService } from "@capabilities/observability/implementation/services/observability.service";
const observability = observabilityService;
import { atomicCompositionService } from "@capabilities/atomic-composition/implementation/services/composition.service";
const atomicComposition = atomicCompositionService;
import { agentOrchestrationService } from "@capabilities/agent-orchestration/implementation/services/agent-orchestration.service";
const agentOrchestration = agentOrchestrationService;
import { connectorEcosystemService } from "../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service.js";
const connectorEcosystem = connectorEcosystemService;

// Import Genesis Business Domain capability as primary business semantics provider
import { genesisService } from "@capabilities/genesis/implementation/index";
const genesis = genesisService;

const ecommerceOpsImplementation: CapabilityImplementation = {
  commands: {},
  queries: {},
  repositories: {},
  services: {},
  entry: {},
};

const ecommerceOps: CapabilityDescriptor = Object.freeze({
  id: "ecommerce-ops",
  version: "1.0.0",
  name: "Ecommerce Operations",
  description: "Universal E-commerce Operations Work category binding onto canonical EOS Work Runtime",
  experience: {
    customerJourney: [
      "discover",
      "create",
      "execute",
      "progress",
      "evidence",
      "complete"
    ],
    allowedTransitions: {
      "discover": ["create"],
      "create": ["execute"],
      "execute": ["progress"],
      "progress": ["evidence"],
      "evidence": ["complete"]
    },
    roleBasedAccess: {
      "shop-owner": ["order-management", "product-catalog", "financial-overview"],
      "operations-manager": ["order-fulfillment", "shipping", "returns"],
      "customer-service": ["customer-messages", "dispute-resolution", "refund-management"],
      "finance": ["payment-reconciliation", "tax-reporting", "revenue-tracking"]
    }
  },
  implementation: ecommerceOpsImplementation,
});

const orderFulfillment: CapabilityDescriptor = Object.freeze({
  id: "order-fulfillment",
  version: "1.0.0",
  name: "Order Fulfillment",
  description: "End-to-end order processing from capture to delivery",
  capabilities: ["genesis", "atomic-composition", "payment-processing", "shipping-provider"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const productCatalog: CapabilityDescriptor = Object.freeze({
  id: "product-catalog",
  version: "1.0.0",
  name: "Product Catalog",
  description: "Product listing, inventory, and pricing management",
  capabilities: ["genesis", "atomic-composition"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const paymentReconciliation: CapabilityDescriptor = Object.freeze({
  id: "payment-reconciliation",
  version: "1.0.0",
  name: "Payment Reconciliation",
  description: "Automated payment matching and financial reconciliation",
  capabilities: ["genesis", "budget-engine", "evidence-registry"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const customerEngagement: CapabilityDescriptor = Object.freeze({
  id: "customer-engagement",
  version: "1.0.0",
  name: "Customer Engagement",
  description: "Customer communication, feedback, and retention",
  capabilities: ["genesis", "communication", "evidence-registry"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

export const registry = new StaticRegistry({
  entries: {
    "work-core": workCore,
    "identity": identity,
    "evidence-registry": evidenceRegistry,
    "observability": observability,
    "atomic-composition": atomicComposition,
    "agent-orchestration": agentOrchestration,
    "connector-ecosystem": connectorEcosystem,
    "genesis": genesis,
    "ecommerce-ops": ecommerceOps,
    "order-fulfillment": orderFulfillment,
    "product-catalog": productCatalog,
    "payment-reconciliation": paymentReconciliation,
    "customer-engagement": customerEngagement,
  },
} satisfies StaticRegistryConfig);

export const compositionPackage = {
  id: "ecommerce-ops",
  name: "Ecommerce Operations",
  extends: ["workspace-standard"],
  patterns: ["order-fulfillment-pattern", "product-catalog-pattern"],
  capabilities: ["genesis", "atomic-composition", "observability", "agent-orchestration"],
  surfaces: ["order-dashboard", "product-management", "financial-report"],
  schemas: ["WorkflowDefinitionSchema", "OrderSchema", "ProductSchema"]
} as const;
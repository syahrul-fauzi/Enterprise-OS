// @ts-nocheck
/**
 * LawyersHub Product Composition Descriptor
 * EOS Core compliant capability registry for lawyershub product
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

const lawyersHubImplementation: CapabilityImplementation = {
  commands: {},
  queries: {},
  repositories: {},
  services: {},
  entry: {},
};

const lawyersHub: CapabilityDescriptor = Object.freeze({
  id: "lawyershub",
  version: "1.0.0",
  name: "LawyersHub",
  description: "Legal-service client journey management platform",
  experience: {
    customerJourney: [
      "consultation",
      "assessment",
      "agreement",
      "execution",
      "documentation",
      "closure"
    ],
    allowedTransitions: {
      "consultation": ["assessment"],
      "assessment": ["agreement"],
      "agreement": ["execution"],
      "execution": ["documentation"],
      "documentation": ["closure"]
    },
    roleBasedAccess: {
      "client": ["case-overview", "document-access", "communication"],
      "lawyer": ["case-management", "document-preparation", "client-communication"],
      "paralegal": ["document-review", "scheduling", "case-followup"],
      "finance": ["invoice-management", "payment-tracking", "reconciliation"]
    }
  },
  implementation: lawyersHubImplementation,
});

const caseManagement: CapabilityDescriptor = Object.freeze({
  id: "case-management",
  version: "1.0.0",
  name: "Case Management",
  description: "Legal case tracking, timeline, and evidence management",
  capabilities: ["genesis", "atomic-composition", "evidence-registry"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const documentPreparation: CapabilityDescriptor = Object.freeze({
  id: "document-preparation",
  version: "1.0.0",
  name: "Document Preparation",
  description: "Legal document generation, review, and versioning",
  capabilities: ["genesis", "atomic-composition", "evidence-registry"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const clientEngagement: CapabilityDescriptor = Object.freeze({
  id: "client-engagement",
  version: "1.0.0",
  name: "Client Engagement",
  description: "Client consultation, communication, and relationship management",
  capabilities: ["genesis", "communication", "evidence-registry"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const legalBilling: CapabilityDescriptor = Object.freeze({
  id: "legal-billing",
  version: "1.0.0",
  name: "Legal Billing",
  description: "Time tracking, invoicing, and payment reconciliation for legal services",
  capabilities: ["genesis", "budget-engine", "evidence-registry"],
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
    "lawyershub": lawyersHub,
    "case-management": caseManagement,
    "document-preparation": documentPreparation,
    "client-engagement": clientEngagement,
    "legal-billing": legalBilling,
  },
} satisfies StaticRegistryConfig);

export const compositionPackage = {
  id: "lawyershub",
  name: "LawyersHub",
  extends: ["workspace-standard"],
  patterns: ["case-management-pattern", "legal-document-pattern"],
  capabilities: ["genesis", "atomic-composition", "observability", "agent-orchestration"],
  surfaces: ["case-dashboard", "document-management", "client-portal"],
  schemas: ["WorkflowDefinitionSchema", "CaseSchema", "DocumentSchema"]
} as const;
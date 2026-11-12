/**
 * Digital Operations Product Composition Descriptor
 * EOS Core compliant capability registry for digital-operations product
 * Follows workspace.manifest.ts pattern from apps/web with frozen capability descriptors
 * Aligns with EOS Core boundaries: no Work authority changes, reuse existing capabilities
 */

// Gunakan path alias @repo dan @capabilities dari tsconfig.json untuk module resolution
// Sesuai instruksi EOS: tidak mengubah struktur core, hanya memanfaatkan alias yang sudah didefinisikan
import { StaticRegistry } from "@repo/capability-registry/src/index";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/capability-registry/src/types";

// Reuse existing EOS Core capabilities (FROZEN - tidak ada perubahan pada implementasi asli)
// Semua import menggunakan path alias untuk menghindari masalah 3-level relative import
import { workCore } from "@capabilities/work-core/implementation/index";
import { identity } from "@capabilities/identity/implementation/index";
import { evidenceRegistry } from "@capabilities/evidence-registry/implementation/index";
// Import observability singleton dari service yang sudah teruji
import { observabilityService } from "@capabilities/observability/implementation/services/observability.service";
const observability = observabilityService;
// Import atomicComposition dari file service langsung untuk menghindari rootDir TypeScript error
import { atomicCompositionService } from "@capabilities/atomic-composition/implementation/services/composition.service";
const atomicComposition = atomicCompositionService;
// Import agentOrchestration singleton dari service yang sudah diekspor sebagai agentOrchestrationService
import { agentOrchestrationService } from "@capabilities/agent-orchestration/implementation/services/agent-orchestration.service";
const agentOrchestration = agentOrchestrationService;
// Import connectorEcosystem dari capability yang sudah teruji (memperbaiki gap EOS-360-002 untuk Digital Operations)
// Gunakan path relatif yang sama dengan implementasi di smace (teruji dan berjalan)
import { connectorEcosystemService } from "../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service.js";
const connectorEcosystem = connectorEcosystemService;
// Reuse universal adapter pattern dari ACaaS pilot - tidak ada perubahan core

// Digital Operations product-specific implementation (frozen per EOS Core requirements)
const digitalOperationsImplementation: CapabilityImplementation = {
  commands: {},
  queries: {},
  repositories: {},
  services: {},
  entry: {},
};

const digitalOperations: CapabilityDescriptor = Object.freeze({
  id: "digital-operations",
  version: "1.0.0",
  name: "Managed Digital Business Operations",
  description: "Layanan operasi digital terkelola untuk UKM e-commerce Indonesia",
  experience: {
    customerJourney: [
      "onboard",
      "assess",
      "activate", 
      "operate",
      "report",
      "renew",
      "operate" // Enforce renew→operate transition untuk Work Continuity (tidak ada terminal state)
    ],
    allowedTransitions: {
      "renew": ["operate"], // Renewal menghasilkan siklus operasional berikutnya tanpa menggandakan Work
      "report": ["renew", "operate"],
      "operate": ["report", "renew"]
    },
    roleBasedAccess: {
      "business-owner": ["business-health", "my-services", "business-review"],
      "operations-manager": ["active-operations", "incidents", "approvals", "timeline"],
      "technical-contact": ["integrations", "security", "deployment", "diagnostics"],
      "finance-contact": ["subscription", "invoices", "payments", "usage"]
    }
  },
  implementation: digitalOperationsImplementation,
});

// 5 service domains as capability groups (not new bounded contexts, reuse existing capabilities)
const digitalFoundation: CapabilityDescriptor = Object.freeze({
  id: "digital-foundation",
  version: "1.0.0",
  name: "Digital Foundation",
  description: "Menjaga aset digital tetap tersedia, aman, cepat, dan dapat dipulihkan",
  capabilities: ["observability", "incident-management", "atomic-composition", "backup-restore"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const businessConnectivity: CapabilityDescriptor = Object.freeze({
  id: "business-connectivity",
  version: "1.0.0",
  name: "Business Connectivity",
  description: "Menghubungkan sistem bisnis agar data dan transaksi mengalir dengan benar",
  capabilities: ["atomic-composition", "data-synchronization", "webhook-management"], // Reuse atomic-composition for integration logic
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const businessProcessOperations: CapabilityDescriptor = Object.freeze({
  id: "business-process-operations",
  version: "1.0.0",
  name: "Business Process Operations",
  description: "Mengoperasikan proses berulang, bukan hanya mengotomatisasi satu langkah",
  capabilities: ["atomic-composition", "agent-orchestration", "order-fulfillment", "payment-reconciliation", "recurring-reporting", "exception-handling"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const trustAndResilience: CapabilityDescriptor = Object.freeze({
  id: "trust-and-resilience",
  version: "1.0.0",
  name: "Trust & Resilience",
  description: "Menjaga operasi aman, dapat diaudit, dan dapat dipulihkan",
  capabilities: ["evidence-registry", "incident-management", "access-governance", "backup-testing", "risk-management"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});

const operationalIntelligence: CapabilityDescriptor = Object.freeze({
  id: "operational-intelligence",
  version: "1.0.0",
  name: "Operational Intelligence",
  description: "Mengubah data operasi menjadi keputusan dan perbaikan yang terukur",
  capabilities: ["observability", "agent-orchestration", "health-assessment", "anomaly-detection", "cost-optimization", "continuous-improvement"],
  implementation: {
    commands: {},
    queries: {},
    repositories: {},
    services: {},
    entry: {},
  }
});
  
  // Export static registry with all capabilities (frozen, no dynamic changes)
  export const registry = new StaticRegistry({
  entries: {
    // Reused EOS Core capabilities (aliased for backward compatibility)
    "work-core": workCore,
    "identity": identity,
    "evidence-registry": evidenceRegistry,
    "observability": observability,
    "atomic-composition": atomicComposition,
    "agent-orchestration": agentOrchestration,
    "connector-ecosystem": connectorEcosystem, // EOS-360-002: Integrasikan connector-ecosystem untuk MCP access
    // Backward compatibility aliases for existing references
    "work-formation": atomicComposition,
    "ai-agent-execution": agentOrchestration,
    
    // Digital Operations product-specific capabilities (aligned with 5 service domains)
    "digital-operations": digitalOperations,
    "digital-foundation": digitalFoundation,
    "business-connectivity": businessConnectivity,
    "business-process-operations": businessProcessOperations,
    "trust-and-resilience": trustAndResilience,
    "operational-intelligence": operationalIntelligence,
  },
} satisfies StaticRegistryConfig);

// Export the composition package required by validate-composition-package.ts
export const compositionPackage = {
  id: "digital-operations",
  name: "Managed Digital Business Operations",
  serviceCatalogPath: "./definition/service-catalog.yaml",
  extends: ["workspace-standard"],
  patterns: ["subscription-management-pattern", "service-delivery-pattern"],
  capabilities: ["atomic-composition", "observability", "agent-orchestration"],
  surfaces: ["business-health-dashboard", "operations-timeline", "business-review"],
  schemas: ["ServiceCatalogSchema", "ServiceLevelSchema", "WorkflowDefinitionSchema"]
} as const;
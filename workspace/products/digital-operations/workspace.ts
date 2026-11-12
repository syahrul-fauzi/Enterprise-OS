/**
 * Digital Operations Workspace Configuration
 * Required by validate-composition-package.ts
 * Aligns with EOS Core requirements: single product identity, no new Work authority
 */

import { registry, compositionPackage } from "./composition.descriptor";

// Re-export the composition package as required by the validator
export { compositionPackage } from "./composition.descriptor";

// Required describeComposition function for validate-composition-package.ts
export function describeComposition() {
  return {
    id: compositionPackage.id,
    name: compositionPackage.name,
    serviceCatalogPath: compositionPackage.serviceCatalogPath,
    capabilityCount: registry.list().length, // Use public list() method instead of private entries
    workspaceConfig: workspaceConfig
  };
}

// Workspace configuration aligned with eos.yaml
export const workspaceConfig = Object.freeze({
  id: "digital-operations",
  name: "digital-operations",
  displayName: "Managed Digital Business Operations",
  description: "Layanan operasi digital terkelola untuk UKM e-commerce Indonesia",
  registry,
  productManifestPath: "./manifest.yaml",
  productMetadataPath: "./metadata.yaml",
  serviceCatalogPath: "./definition/service-catalog.yaml",
  serviceLevelsPath: "./definition/service-levels.yaml",
  workflowPath: "./runtime/workflow-definition.ts",
  lifecycle: {
    phases: [
      { name: "onboard", terminal: false },
      { name: "assess", terminal: false },
      { name: "activate", terminal: false },
      { name: "operate", terminal: false },
      { name: "report", terminal: false },
      { name: "renew", terminal: false } // Renew transitions back to operate, not terminal
    ],
    currentPhase: "activate",
    status: "ACTIVE"
  },
  // EOS Core alignment - reuse existing authorities
  eosCoreDependencies: [
    "work-core",
    "identity", 
    "evidence-registry",
    "observability",
    "incident-management",
    "connector-ecosystem",
    "agent-orchestration"
  ],
  // External provider bindings (replaceable per EOS boundary requirements)
  providerBindings: {
    cms: ["wordpress", "woocommerce", "nextjs", "static-html"],
    payment: ["midtrans", "xendit"],
    hosting: ["aws", "googlecloud", "local"],
    crm: ["hubspot", "zoho"],
    marketplace: ["tokopedia", "shopee", "lazada"],
    aiModels: ["openai", "anthropic", "local"]
  },
  // Evidence requirements aligned with REQUIRED_PRODUCT_EVIDENCE
  evidenceRequirements: [
    "uptime-report",
    "incident-log",
    "maintenance-log",
    "business-outcome-report",
    "continuous-improvement-log",
    "functional-test-report.json",
    "workflow-conformance-report.json"
  ],
  // Managed Outcome Loop implementation mappings
  managedOutcomeLoop: {
    SENSE: "observability.collect-signals",
    UNDERSTAND: "ai-agent-execution.assess-impact",
    DECIDE: "governance.evaluate-authorization",
    ACT: "connector-ecosystem.execute-action",
    VERIFY_OUTCOME: "evidence-registry.record-result",
    LEARN: "operational-intelligence.analyze-outcomes",
    IMPROVE: "continuous-implementation.generate-recommendations"
  }
});

// Validate workspace configuration on import (development only)
if (process.env.NODE_ENV === "development") {
  const requiredFiles = [
    "./manifest.yaml",
    "./metadata.yaml",
    "./composition.descriptor.ts",
    "./definition/service-catalog.yaml",
    "./definition/service-levels.yaml",
    "./runtime/workflow-definition.ts"
  ];

  const fs = require("fs");
  const path = require("path");
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[digital-operations] Missing required file: ${filePath}`);
    }
  }

  console.log(`[digital-operations] Workspace initialized successfully`);
  console.log(`[digital-operations] Registered capabilities: ${registry.list().join(", ")}`);
}
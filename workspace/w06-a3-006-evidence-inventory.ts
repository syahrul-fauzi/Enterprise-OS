// @ts-nocheck
import { evidenceRegistryService } from "./capabilities/evidence-registry/implementation/index.js";
import { observabilityService } from "./capabilities/observability/implementation/index.js";

async function collectOperationalEvidenceInventory() {
  console.log("=== W06-A3-006 Operational Evidence Inventory Collection ===");
  console.log("Timestamp:", new Date().toISOString());
  
  const inventory = {
    collection_timestamp: new Date().toISOString(),
    evidence_registry: {},
    observability: {},
    work_scope: "ACaaS vertical business slice"
  };
  
  // 1. Search all evidence records
  console.log("\n[1] Searching all evidence records...");
  const allEvidence = await evidenceRegistryService.searchEvidenceRegistry({
    query: "",
    limit: 1000
  });
  inventory.evidence_registry.all_records = {
    total: allEvidence.summary.totalRecords,
    kind_breakdown: allEvidence.summary.kindBreakdown,
    records: allEvidence.items
  };
  console.log("Total evidence records found:", allEvidence.summary.totalRecords);
  
  // 2. Search operational evidence specifically
  console.log("\n[2] Searching operational evidence records...");
  const operationalEvidence = await evidenceRegistryService.searchEvidenceRegistry({
    query: "operational execution runtime invocation",
    limit: 500
  });
  inventory.evidence_registry.operational_records = {
    total: operationalEvidence.items.length,
    records: operationalEvidence.items
  };
  console.log("Operational evidence records found:", operationalEvidence.items.length);
  
  // 3. Get observability logs
  console.log("\n[3] Getting observability logs...");
  const observabilityLogs = await observabilityService.getLogs({
    limit: 1000,
    offset: 0
  });
  inventory.observability.logs = {
    total: observabilityLogs.logs.length,
    logs: observabilityLogs.logs.slice(0, 100) // First 100 logs for inventory
  };
  console.log("Observability logs found:", observabilityLogs.logs.length);
  
  // 4. Save inventory to file
  console.log("\n[4] Saving evidence inventory...");
  const fs = require('fs');
  const inventoryPath = "/root/Enterprise-OS/workspace/.eos-state/verification/W06-A3-006_evidence_inventory.json";
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
  console.log("Evidence inventory saved to:", inventoryPath);
  
  console.log("\n=== Inventory Collection Complete ===");
  return inventory;
}

collectOperationalEvidenceInventory().catch(err => {
  console.error("Error collecting evidence inventory:", err);
  process.exit(1);
});
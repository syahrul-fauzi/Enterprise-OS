import { evidenceRegistryService } from "../capabilities/evidence-registry/implementation/service";

const result = evidenceRegistryService.searchEvidenceRegistry({
  requirementRef: "REQ-011",
  limit: 100
});

console.log("Search result for REQ-011:", JSON.stringify(result, null, 2));

// Also search all evidence to see what's available
const allResult = evidenceRegistryService.searchEvidenceRegistry({
  limit: 100
});

console.log("\nAll evidence found:", allResult.items.map(item => ({
  id: item.id,
  path: item.path,
  requirementRefs: item.requirementRefs
})));
export const compositionPackage = {
  id: "pt-establishment",
  extends: ["workspace-standard", "legal-workspace"],
  patterns: [
    "approval-pattern",
    "discovery-pattern",
    "execution-pattern",
    "monitoring-pattern",
    "government-registration-pattern",
    "document-signing-pattern",
    "escalation-pattern", // Ditambahkan untuk W-SVC-002 customer support dispute workflow
  ],
  capabilities: ["workflow", "knowledge", "ai", "document", "consultation", "service-directory", "legal-case", "customer-portal", "escalation-engine"], // Reused for W-SVC-002
  surfaces: ["dashboard", "inbox", "explorer", "registration-tracker", "document-portal", "dispute-submission-form", "support-tracker", "resolution-center"], // W-SVC-002 surfaces
} as const;

export function describeComposition() {
  return {
    id: compositionPackage.id,
    patternCount: compositionPackage.patterns.length,
    capabilityCount: compositionPackage.capabilities.length,
    surfaceCount: compositionPackage.surfaces.length,
  };
}
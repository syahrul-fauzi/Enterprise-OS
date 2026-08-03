export const compositionPackage = {
  id: "legal-workspace",
  extends: ["workspace-standard"],
  patterns: [
    "approval-pattern",
    "discovery-pattern",
    "execution-pattern",
    "monitoring-pattern",
  ],
  capabilities: ["workflow", "knowledge", "ai", "document"],
  surfaces: ["dashboard", "inbox", "explorer"],
} as const;

export function describeComposition() {
  return {
    id: compositionPackage.id,
    patternCount: compositionPackage.patterns.length,
    capabilityCount: compositionPackage.capabilities.length,
    surfaceCount: compositionPackage.surfaces.length,
  };
}

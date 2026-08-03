import { defineWorkspace } from "@repo/core-capability-registry";

export const LAWYERSHUB_CAPABILITY_IDS = [
  "legal-case",
  "legal-document",
  "requirement-management",
] as const;

export const workspace = defineWorkspace({
  id: "lawyershub",
  capabilities: [...LAWYERSHUB_CAPABILITY_IDS],
});

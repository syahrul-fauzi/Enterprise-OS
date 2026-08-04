import { defineWorkspace } from "@repo/core-capability-registry";

export const WEB_CAPABILITY_IDS = ["requirement-management"] as const;

export const workspace = defineWorkspace({
  id: "web",
  capabilities: [...WEB_CAPABILITY_IDS],
});

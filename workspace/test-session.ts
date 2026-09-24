import { encodeWorkspaceSession, decodeWorkspaceSession, WorkspaceSession } from "@repo/core-kernel/session/workspace-session";

// Coba buat session yang sama dengan login API
const testSession: WorkspaceSession = {
  sessionId: "test-session-123",
  actorId: "user-123",
  actorLabel: "Test User",
  tenantId: "tenant-123",
  workspaceId: "workspace-123",
  productId: "lawyershub",
  issuedAt: new Date().toISOString(),
  userCapabilities: ["work.read", "work.write"],
};

console.log("Test session:", testSession);
const encoded = encodeWorkspaceSession(testSession);
console.log("Encoded:", encoded);
const decoded = decodeWorkspaceSession(encoded);
console.log("Decoded:", decoded);
console.log("Decode success?", !!decoded);
if (!decoded) {
  console.error("DECODE FAILED - check schema!");
} else {
  console.log("DECODE SUCCESS!");
}
import { createWorkspaceFlow } from './capabilities/identity/implementation/commands/create-workspace-flow.command';
import { capabilityRegistry } from '@repo/core-kernel';

async function runDebug() {
  console.log("=== DEBUGGING createWorkspaceFlow ===");
  
  try {
    // Register capability first (simplified)
    // @ts-ignore
    capabilityRegistry.register("identity", {
      "createWorkspaceFlow": createWorkspaceFlow,
      "createWorkspace": { kind: "command", execute: async () => ({ output: { workspaceId: "test-123", tenantId: "tenant-123", name: "Test", productId: "lawyershub" } }) },
      "createMembership": { kind: "command", execute: async () => ({ output: { membershipId: "mem-123", userId: "user-123", tenantId: "tenant-123", workspaceId: "work-123", role: "owner" } }) },
    });
    
    const result = await createWorkspaceFlow.execute({
      name: "Test Law Firm",
      productId: "lawyershub",
      tenantId: "tenant-123",
      actorId: "user-123",
    });
    
    console.log("✅ SUCCESS:", result);
  } catch (err) {
    console.error("❌ FAILED:", err);
  }
}

runDebug();
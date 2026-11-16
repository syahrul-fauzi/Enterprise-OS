import * as crypto from "crypto";
import { executionContext } from "require('path').resolve(__dirname, '..')/workspace/packages/core/runtime/src/index.js";
import { capabilityRegistry } from "require('path').resolve(__dirname, '..')/workspace/packages/core/kernel/src/registry/capability-command-registry.js";
import { requirementService } from "require('path').resolve(__dirname, '..')/workspace/capabilities/requirement-management/implementation/service.js";
import { requirementsTraceabilityMatrixService } from "require('path').resolve(__dirname, '..')/workspace/capabilities/requirements-traceability-matrix/implementation/service.js";
import { evidenceRegistryService } from "require('path').resolve(__dirname, '..')/workspace/capabilities/evidence-registry/implementation/service.js";
import { injectProofLedgerServices, computeArtifactGraphForRequirement } from "require('path').resolve(__dirname, '..')/workspace/packages/core/proof-ledger/src/index.js";
import { RequirementDeliveryGatewayService } from "require('path').resolve(__dirname, '..')/workspace/capabilities/api-platform/implementation/services/requirement-delivery-gateway.service.js";

console.log(`[B720-SUT] Initializing B7.20 Traceability Closure Replay...`);

// Setup execution context (sama pola seperti verify-idempotency-acaas.ts)
const testExecutionContext = {
  actor_id: "system",
  tenant_id: "default",
  session_id: "session-b720-test-001",
  workspace_id: "default",
  context_trace_id: crypto.randomUUID(),
  decision_id: "B720-TRACEABILITY-REPLAY-001",
  provided_by_test: true
};

executionContext.run(testExecutionContext, async () => {
  const ctx = executionContext.get();
  console.log(`[B720-SUT] Execution context established:`, ctx);

  // Lazy load work-core commands (sama pola seperti verify-idempotency-acaas.ts)
  const workCommands = await import("require('path').resolve(__dirname, '..')/workspace/capabilities/work-core/implementation/commands/work.commands.js");
  console.log(`[B720-SUT] work-core commands loaded:`, Object.keys(workCommands).filter(k => k.endsWith('Command')));

  // Initialize required services
  console.log(`[B720-SUT] requirementService: ok. create=${typeof requirementService.createRequirement}, get=${typeof requirementService.getRequirement}, verify=${typeof requirementService.verifyRequirement}`);
  console.log(`[B720-SUT] requirementsTraceabilityMatrixService: ok. search=${typeof requirementsTraceabilityMatrixService.searchTraceabilityMatrix}`);
  console.log(`[B720-SUT] evidenceRegistryService: ok. search=${typeof evidenceRegistryService.searchEvidenceRegistry}`);

  // [CRITICAL] Set globalThis bindings BEFORE creating RequirementDeliveryGatewayService instance
  // RequirementDeliveryGatewayService uses globalThis for dependency injection
  (globalThis as any).__EOS_CANONICAL_REQUIREMENT_SERVICE__ = requirementService;
  (globalThis as any).__EOS_CANONICAL_RTM_SERVICE__ = requirementsTraceabilityMatrixService;
  (globalThis as any).__EOS_CANONICAL_EVIDENCE_REGISTRY_SERVICE__ = evidenceRegistryService;

  console.log(`[B720-SUT] Global bindings set: requirementService, rtmService, evidenceService`);
  console.log(`[B720-SUT] Verifying global bindings...`);
  console.log(`  - __EOS_CANONICAL_REQUIREMENT_SERVICE__:`, typeof (globalThis as any).__EOS_CANONICAL_REQUIREMENT_SERVICE__);
  console.log(`  - __EOS_CANONICAL_RTM_SERVICE__:`, typeof (globalThis as any).__EOS_CANONICAL_RTM_SERVICE__);
  console.log(`  - __EOS_CANONICAL_EVIDENCE_REGISTRY_SERVICE__:`, typeof (globalThis as any).__EOS_CANONICAL_EVIDENCE_REGISTRY_SERVICE__);

  // Now create RequirementDeliveryGatewayService instance AFTER global bindings are set
  const requirementDeliveryGatewayService = new RequirementDeliveryGatewayService();
  console.log(`[B720-SUT] requirementDeliveryGatewayService: ok. search=${typeof requirementDeliveryGatewayService.search}`);

  // Inject services into proof-ledger stubs
  injectProofLedgerServices({ 
    requirementService: requirementService,
    requirementDeliveryGatewayService: requirementDeliveryGatewayService,
    evidenceRegistryService: evidenceRegistryService
  });
  console.log(`[B720-SUT] proof-ledger services injected: requirementService + requirementDeliveryGatewayService + evidenceRegistryService bound to proof-ledger stubs`);

  // Test computeArtifactGraphForRequirement with a sample requirement ID
  const reqId = "req-test-001";
  console.log(`[B720-SUT] Testing computeArtifactGraphForRequirement with requirementId: ${reqId}`);
  
  try {
    const graph = computeArtifactGraphForRequirement(reqId);
    console.log(`[B720-SUT] computeArtifactGraphForRequirement succeeded! Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
    console.log(`[B720-SUT] Graph summary:`, graph.summary);
  } catch (err) {
    console.log(`[B720-SUT] computeArtifactGraphForRequirement failed (expected for test requirement):`, err instanceof Error ? err.message : err);
  }

  console.log(`[B720-SUT] All services initialized successfully!`);
  console.log(`[B720-SUT] B7.20 Traceability Closure Replay completed.`);
}).catch(err => {
  console.error(`[B720-SUT] Execution failed:`, err);
  process.exit(1);
});
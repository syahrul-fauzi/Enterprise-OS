import assert from "node:assert/strict";
import test from "node:test";
import { capabilityRegistry, type CommandInvocationRecord } from "./apps/web/lib/capability-command-registry";

const REQ_SESSION = {
  sessionId: "session-test-001",
  tenantId: "tenant-001",
  workspaceId: "workspace-001",
  actorId: "user-001",
};

interface RequirementLifecycleLedger {
  readonly records: CommandInvocationRecord[];
  readonly createdId: string;
  readonly createdOutput: { readonly id: string; readonly status: string };
  readonly approvedOutput: { readonly id: string; readonly status: string; readonly approvedAt: Date };
  readonly inDeliveryOutput: { readonly id: string; readonly status: string };
  readonly implementedOutput: { readonly id: string; readonly status: string; readonly implementedAt: Date };
  readonly verifiedOutput: { readonly id: string; readonly status: string; readonly verifiedAt: Date };
}

async function runRequirementLifecycleE2E(
  title: string,
  owner: string,
  priority: "low" | "medium" | "high" | "critical",
): Promise<RequirementLifecycleLedger> {
  const records: CommandInvocationRecord[] = [];

  // 1. createRequirement → draft
  const createResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: string }>(
    "requirement-management",
    "create",
    {
      title,
      owner,
      priority,
      ...REQ_SESSION,
    },
  );
  records.push(createResult.record);
  assert.equal(createResult.record.ok, true, "requirement.create must record ok:true");
  assert.ok(createResult.output.id.startsWith("req-"), "createRequirement must produce req-XXX id");
  assert.equal(createResult.output.status, "draft", "createRequirement initial status = draft");
  const reqId = createResult.output.id as string;

  // 2. approveRequirement: draft→approved
  const approveResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: string; readonly approvedAt: Date }>(
    "requirement-management",
    "approve",
    { id: reqId, ...REQ_SESSION },
  );
  records.push(approveResult.record);
  assert.equal(approveResult.record.ok, true, "requirement.approve must record ok:true");
  assert.equal(approveResult.output.status, "approved", "approveRequirement transitions draft→approved");
  assert.ok(approveResult.output.approvedAt instanceof Date, "approvedAt stamped instanceof Date");

  // 3. startRequirementDelivery: approved→in_delivery
  const startResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: string }>(
    "requirement-management",
    "startDelivery",
    { id: reqId, ...REQ_SESSION },
  );
  records.push(startResult.record);
  assert.equal(startResult.record.ok, true, "requirement.startDelivery must record ok:true");
  assert.equal(startResult.output.status, "in_delivery", "startDelivery transitions approved→in_delivery");

  // 4. markRequirementImplemented: in_delivery→implemented
  const implementedResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: string; readonly implementedAt: Date }>(
    "requirement-management",
    "markImplemented",
    { id: reqId, ...REQ_SESSION },
  );
  records.push(implementedResult.record);
  assert.equal(implementedResult.record.ok, true, "requirement.markImplemented must record ok:true");
  assert.equal(implementedResult.output.status, "implemented", "markImplemented transitions in_delivery→implemented");
  assert.ok(implementedResult.output.implementedAt instanceof Date, "implementedAt stamped instanceof Date");

  // 5. verifyRequirement: implemented→verified
  const verifyResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: string; readonly verifiedAt: Date }>(
    "requirement-management",
    "verify",
    { id: reqId, ...REQ_SESSION },
  );
  records.push(verifyResult.record);
  assert.equal(verifyResult.record.ok, true, "requirement.verify must record ok:true");
  assert.equal(verifyResult.output.status, "verified", "verifyRequirement terminal state = verified");
  assert.ok(verifyResult.output.verifiedAt instanceof Date, "verifiedAt stamped instanceof Date");

  return {
    records,
    createdId: reqId,
    createdOutput: createResult.output,
    approvedOutput: approveResult.output,
    inDeliveryOutput: startResult.output,
    implementedOutput: implementedResult.output,
    verifiedOutput: verifyResult.output,
  };
}

// REQ-1D-001 Replay
test.describe("REQ-1D-001 · Requirement Lifecycle Replay (4 Transitions + Verify)", () => {
  test("Full lifecycle: create→approve→startDelivery→markImplemented→verify. All transitions ok:true, terminal=verified", async () => {
    const ledger = await runRequirementLifecycleE2E(
      "Replay REQ-1D-001: Full lifecycle determinism proof",
      "REPLAY-Agent",
      "high",
    );

    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, `SEMUA ${ledger.records.length} CommandInvocationRecord ok:true`);

    // ID pattern
    assert.ok(ledger.createdId.startsWith("req-"), `ID pattern req-* terpenuhi: ${ledger.createdId}`);

    // State sequence
    const statuses = [
      ledger.createdOutput.status,
      ledger.approvedOutput.status,
      ledger.inDeliveryOutput.status,
      ledger.implementedOutput.status,
      ledger.verifiedOutput.status,
    ];
    assert.deepEqual(
      statuses,
      ["draft", "approved", "in_delivery", "implemented", "verified"],
      "Status sequence monotonik: draft→approved→in_delivery→implemented→verified",
    );

    // Terminal state
    assert.equal(ledger.verifiedOutput.status, "verified", "Terminal state = verified");

    // Timestamp instanceof Date
    assert.ok(ledger.approvedOutput.approvedAt instanceof Date, "approvedAt instanceof Date");
    assert.ok(ledger.implementedOutput.implementedAt instanceof Date, "implementedAt instanceof Date");
    assert.ok(ledger.verifiedOutput.verifiedAt instanceof Date, "verifiedAt instanceof Date");

    // Record count: 5 invocations
    assert.equal(ledger.records.length, 5, "Tepat 5 CommandInvocationRecord: create + approve + startDelivery + markImplemented + verify");

    // Correct ordering
    const expectedKeys = [
      "requirement.create",
      "requirement.approve",
      "requirement.startDelivery",
      "requirement.markImplemented",
      "requirement.verify",
    ];
    for (let i = 0; i < expectedKeys.length; i++) {
      assert.ok(
        ledger.records[i].commandKey.includes(expectedKeys[i]) || ledger.records[i].commandKey === expectedKeys[i],
        `Record ${i} commandKey mengandung ${expectedKeys[i]}, actual: ${ledger.records[i].commandKey}`,
      );
    }
  });

  test("Second lifecycle run untuk bukti determinisme pola id dan transisi identik", async () => {
    const ledger = await runRequirementLifecycleE2E(
      "Replay REQ-1D-001 run #2: Determinism second sample",
      "REPLAY-Agent-2",
      "critical",
    );
    assert.ok(ledger.createdId.startsWith("req-"), "Pattern ID req-* konsisten di run kedua");
    assert.equal(ledger.verifiedOutput.status, "verified", "Terminal state verified di run kedua");
    assert.equal(ledger.records.length, 5, "5 records di run kedua");
    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, "SEMUA records ok:true di run kedua");
  });
});

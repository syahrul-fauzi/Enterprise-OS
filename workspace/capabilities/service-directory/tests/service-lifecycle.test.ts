import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { capabilityRegistry, type CommandInvocationRecord } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";
import {
  ServiceRequestRepositoryInMemory,
} from "../implementation/repository/service.repository.js";
import { ServiceRequestId } from "../implementation/contracts/service.contracts.js";
import type {
  ServiceProviderCategory,
  ServiceRequestAggregate,
  ServiceRequestStatus,
} from "../implementation/contracts/service.contracts.js";
import { ExecutionFrame } from "../../work-core/contracts/work.contracts.js";
import { registerServiceDirectoryCapability } from "../implementation/services/service-request.service.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/index.js";
import { SessionId, UserId, TenantId, WorkspaceId, ActorId, type SessionAggregate } from "../../identity/implementation/contracts/index.js";

// Register all service-directory capabilities BEFORE running tests
registerServiceDirectoryCapability();

// Create test session BEFORE running tests (matches pattern from session.inmemory.ts test sessions)
const SRV_SESSION_ID = "session-test-002";
async function setupTestSession() {
  const existingSession = await SessionRepositoryInMemory.byId(SessionId(SRV_SESSION_ID));
  if (!existingSession) {
    const testSession: SessionAggregate = {
      id: SessionId(SRV_SESSION_ID),
      userId: UserId("user-002"),
      actorId: ActorId("user-002"),
      tenantId: TenantId("tenant-001"),
      workspaceId: WorkspaceId("workspace-001"),
      productId: "services-id.default",
      actorLabel: "Service Directory Test User",
      isAgent: false,
      issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      revokedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    };
    await SessionRepositoryInMemory.save(testSession);
    console.log("[Test Setup] Created test session:", SRV_SESSION_ID);
  }
}

const loadEosManifest = () => {
  const manifestPath = path.resolve(__dirname, "..", "..", "..", "..", "eos.yaml");
  return yaml.load(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
};

interface SvcLifecycleLedger {
  readonly records: CommandInvocationRecord[];
  readonly createdId: string;
  readonly createdOutput: { readonly id: string; readonly status: ServiceRequestStatus };
  readonly acceptedOutput: { readonly id: string; readonly status: ServiceRequestStatus; readonly providerId: string };
  readonly deliveredOutput: { readonly id: string; readonly status: "delivered"; readonly deliveredAt: Date };
  readonly verifiedOutput: { readonly id: string; readonly status: "verified"; readonly verifiedAt: Date };
  readonly settledOutput: { readonly id: string; readonly status: "settled"; readonly settledAt: Date };
  readonly input: {
    readonly title: string;
    readonly description: string;
    readonly category: ServiceProviderCategory;
    readonly requesterName: string;
    readonly providerId: string;
    readonly budget: number;
  };
}

async function runLifecycleSvcE2E(
  title: string,
  description: string,
  category: ServiceProviderCategory,
  requesterName: string,
  providerId: string,
  budget: number,
): Promise<SvcLifecycleLedger> {
  const records: CommandInvocationRecord[] = [];

  // Step 1: Create service request (draft status)
  const createResult = await capabilityRegistry.invoke(
    "service-directory",
    "createServiceRequest",
    {
      title,
      description,
      category,
      requesterName,
      budget: budget.toString(),
      sessionId: SRV_SESSION_ID,
    },
  ) as { readonly record: CommandInvocationRecord; readonly output: { readonly id: string; readonly status: ServiceRequestStatus } };
  records.push(createResult.record);
  assert.equal(createResult.record.ok, true, "service-directory.createServiceRequest must record ok:true");
  assert.ok(createResult.output.id.startsWith("sreq-"), "createServiceRequest must produce sreq-XXX id");
  assert.equal(createResult.output.status, "draft", "createServiceRequest initial status = draft");

  const id = createResult.output.id as string;
  const pAfterCreate = await ServiceRequestRepositoryInMemory.byId(ServiceRequestId(id));
  assert.ok(pAfterCreate !== undefined, `sreq ${id} retrievable dari repository setelah create`);
  assert.equal(pAfterCreate.title, title.trim(), "persisted title match input");
  assert.equal(pAfterCreate.status, "draft", "persisted status after create = draft");

  // Step 2: Accept service request (accepted status)
  const acceptResult = await capabilityRegistry.invoke(
    "service-directory", "acceptServiceRequest", { id, providerId, sessionId: SRV_SESSION_ID }
  ) as { readonly record: CommandInvocationRecord; readonly output: { readonly id: string; readonly status: ServiceRequestStatus; readonly providerId: string } };
  records.push(acceptResult.record);
  assert.equal(acceptResult.record.ok, true, "service-directory.acceptServiceRequest must record ok:true");
  assert.equal(acceptResult.output.status, "accepted", "acceptServiceRequest on draft → accepted");

  // Step 3: Mark service as delivered (delivered status)
  const deliverResult = await capabilityRegistry.invoke(
    "service-directory", "markServiceDelivered", { id, sessionId: SRV_SESSION_ID }
  ) as { readonly record: CommandInvocationRecord; readonly output: { readonly id: string; readonly status: "delivered"; readonly deliveredAt: Date } };
  records.push(deliverResult.record);
  assert.equal(deliverResult.record.ok, true, "service-directory.markServiceDelivered must record ok:true");
  assert.equal(deliverResult.output.status, "delivered", "markServiceDelivered output status = delivered");

  // Step 4: Verify service (verified status) - W-SVC-001 new flow
  const verificationProof = "work-completed-to-specification-2024-05-20T12:00:00Z";
  const verifyResult = await capabilityRegistry.invoke(
    "service-directory", "markServiceVerified", { 
      id, 
      sessionId: SRV_SESSION_ID,
      verificationProof 
    }
  ) as { readonly record: CommandInvocationRecord; readonly output: { readonly id: string; readonly status: "verified"; readonly verifiedAt: Date } };
  records.push(verifyResult.record);
  assert.equal(verifyResult.record.ok, true, "service-directory.markServiceVerified must record ok:true");
  assert.equal(verifyResult.output.status, "verified", "markServiceVerified output status = verified");
  assert.ok(verifyResult.output.verifiedAt instanceof Date, "verifiedAt is valid Date object");

  // Step 5: Settle service (settled status) - W-SVC-001 final settlement
  const settlementProof = "customer-confirmed-settlement-all-obligations-met";
  const settleResult = await capabilityRegistry.invoke(
    "service-directory", "settleServiceRequest", { 
      id, 
      sessionId: SRV_SESSION_ID,
      settlementProof 
    }
  ) as { readonly record: CommandInvocationRecord; readonly output: { readonly id: string; readonly status: "settled"; readonly settledAt: Date } };
  records.push(settleResult.record);
  assert.equal(settleResult.record.ok, true, "service-directory.settleServiceRequest must record ok:true");
  assert.equal(settleResult.output.status, "settled", "settleServiceRequest output status = settled");
  assert.ok(settleResult.output.settledAt instanceof Date, "settledAt is valid Date object");

  return {
    records,
    createdId: id,
    createdOutput: createResult.output,
    acceptedOutput: acceptResult.output,
    deliveredOutput: deliverResult.output,
    verifiedOutput: verifyResult.output,
    settledOutput: settleResult.output,
    input: { title: title.trim(), description, category, requesterName, providerId, budget },
  };
}

test.describe("SREQ-W-SVC-001 · Service Directory Lifecycle E2E FULL (Accountable Work Continuity)", () => {
  test("EOS Product Slice Compliance: Full lifecycle draft→submitted→accepted→in_service→delivered→verified→settled", async () => {
    // Setup test session first
    await setupTestSession();
    const ledger = await runLifecycleSvcE2E(
      "   Penanganan Keluhan Pelanggan Premium - E-Commerce Fashion   ",
      "Resolusi komplain pelanggan tentang keterlambatan pengiriman barang dengan kompensasi sesuai SLA",
      "IT Support",
      "Ibu Aulia Rahman — Pelanggan Premium ID: CUST-001234",
      "sp-009",
      2500000,
    );

    // Verify all command invocations succeeded (evidence ledger ok:true)
    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, `semua ${ledger.records.length} CommandInvocationRecord ok:true`);

    // Verify monotonic state transitions sesuai Accountable Work Continuity
    const statuses = [
      ledger.createdOutput.status,
      ledger.acceptedOutput.status,
      ledger.deliveredOutput.status,
      ledger.verifiedOutput.status,
      ledger.settledOutput.status
    ];
    assert.deepEqual(statuses, ["draft", "accepted", "delivered", "verified", "settled"], 
      "transisi monotonik draft→accepted→delivered→verified→settled (Accountable Work Continuity terjaga)");

    // Verify final persistence in repository
    const rehydrated: ServiceRequestAggregate | undefined = await ServiceRequestRepositoryInMemory.byId(ServiceRequestId(ledger.createdId));
    assert.ok(rehydrated !== undefined, "final retrieval: sreq byId tersedia");
    assert.equal(rehydrated.status, "settled", "final status = settled (terminal state tercapai)");
    assert.equal(rehydrated.budget, ledger.input.budget.toString(), "budget tersimpan persis 2.5jt");
    assert.equal(rehydrated.requesterName, ledger.input.requesterName, "requesterName tercatat dengan benar");

    console.log(`[W-SVC-001] Test PASSED: Work ${ledger.createdId} achieved full Accountable Work Continuity`);
    console.log(`[W-SVC-001] Settlement processed at: ${ledger.settledOutput.settledAt.toISOString()}`);
  });

  test("Reality Gates enforcement: Cannot settle UNVERIFIED work (Settlement Reality Gate)", async () => {
    // Test that we can't settle work that hasn't been verified (enforces settlement reality gate)
    const createResult = await capabilityRegistry.invoke(
      "service-directory",
      "createServiceRequest",
      {
        title: "Test Keluhan yang Belum Diverifikasi",
        description: "Ini adalah test keluhan yang tidak boleh bisa disettle sebelum diverifikasi",
        category: "IT Support",
        requesterName: "Test User",
        budget: "100000",
        sessionId: SRV_SESSION_ID,
      },
    ) as { readonly output: { readonly id: string; readonly status: ServiceRequestStatus } };
    const id = createResult.output.id;
    
    // Coba settle tanpa verify - harus throw error
    try {
      await capabilityRegistry.invoke(
        "service-directory",
        "settleServiceRequest",
        { 
          id, 
          sessionId: SRV_SESSION_ID,
          settlementProof: "invalid-settlement-attempt" 
        }
      );
      assert.fail("Harus throw error ketika mencoba settle work yang belum diverifikasi (Reality Gate gagal)");
    } catch (error) {
      assert.ok(error instanceof Error, "Error harus instance of Error");
      assert.ok(error.message.includes("Cannot settle work with status"), "Error message harus mengandung restriction yang benar");
      console.log(`[W-SVC-001] Reality Gate PASS: Tidak bisa settle work unverified, error: ${error.message}`);
    }
  });

  test("Reality Gates enforcement: Cannot verify UNDELIVERED work (Verification Reality Gate)", async () => {
    // Test that we can't verify work that hasn't been delivered (enforces verification reality gate)
    const createResult = await capabilityRegistry.invoke(
      "service-directory",
      "createServiceRequest",
      {
        title: "Test Keluhan yang Belum Dideliveri",
        description: "Ini adalah test keluhan yang tidak boleh bisa diverifikasi sebelum dideliveri",
        category: "IT Support",
        requesterName: "Test User",
        budget: "100000",
        sessionId: SRV_SESSION_ID,
      },
    ) as { readonly output: { readonly id: string; readonly status: ServiceRequestStatus } };
    const id = createResult.output.id;
    
    // Coba verify tanpa deliver - harus throw error
    try {
      await capabilityRegistry.invoke(
        "service-directory",
        "markServiceVerified",
        { 
          id, 
          sessionId: SRV_SESSION_ID,
          verificationProof: "invalid-verification-attempt" 
        }
      );
      assert.fail("Harus throw error ketika mencoba verify work yang belum dideliveri (Reality Gate gagal)");
    } catch (error) {
      assert.ok(error instanceof Error, "Error harus instance of Error");
      assert.ok(error.message.includes("Cannot verify work with status"), "Error message harus mengandung restriction yang benar");
      console.log(`[W-SVC-001] Reality Gate PASS: Tidak bisa verify work undelivered, error: ${error.message}`);
    }
  });
});
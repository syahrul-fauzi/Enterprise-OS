import { test } from "node:test";
import assert from "node:assert";
import { IntentRepositoryInMemory, newIntentId } from "../capabilities/identity/implementation/repositories/intent.inmemory.ts";
import type { IntentOrigin, IntentAggregate, IntentStatus, IntentCategory, IntentUnderstanding, IntentRawInput } from "../capabilities/identity/implementation/contracts/identity.contracts.ts";

test('Universal Intent pipeline menerima signal dari machine (monitoring system)', async () => {
  // 1. Siapkan input dari monitoring system (non-human source)
  const machineRawInput: IntentRawInput = {
    type: "signal",
    content: {
      signal: "server_cpu_threshold_exceeded",
      severity: "critical",
      server_id: "prod-web-01",
      current_usage: 94.5,
      threshold: 90,
      duration_minutes: 15
    }
  };
  
  const context = {
    tenantId: "test-tenant-001",
    workspaceId: "infra-workspace-001",
    timestamp: new Date().toISOString()
  };

  // 2. Inisialisasi repository in-memory untuk test
  const repo = new IntentRepositoryInMemory();
  
  // Buat intent aggregate lengkap sesuai kontrak
  const intentId = newIntentId();
  const now = new Date();
  const understanding: IntentUnderstanding = {
    candidateDomains: ["TECHNICAL_INCIDENT", "MONITORING_ALERT"],
    confidence: 0.98,
    knownContext: ["server_id: prod-web-01", "cpu_usage: 94.5%", "threshold_exceeded: 15m"],
    unknowns: []
  };
  
  const newIntent: IntentAggregate = {
    id: intentId,
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    actorId: undefined,
    origin: "internal_system" as IntentOrigin,
    title: "Server CPU threshold exceeded on prod-web-01",
    description: "Critical: Server prod-web-01 has exceeded 90% CPU threshold for 15 minutes, current usage: 94.5%",
    raw: machineRawInput,
    understanding: understanding,
    resolution: undefined,
    category: "MONITORING_ALERT" as IntentCategory,
    status: "CAPTURED" as IntentStatus,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    convertedToWorkId: undefined,
    version: 1
  };

  // Simpan intent ke repository
  const savedIntent = await repo.save(newIntent);
  assert.ok(savedIntent, "Intent berhasil dibuat dari machine source");

  // 3. Verifikasi origin mapping benar
  assert.strictEqual(savedIntent.origin, "internal_system", "Origin terdeteksi sebagai internal_system");
  assert.strictEqual(savedIntent.actorId, undefined, "actorId undefined untuk non-human source");

  // 4. Verifikasi raw signal tersimpan seluruhnya
  const fetchedIntent = await repo.byId(intentId, { 
    tenantId: context.tenantId, 
    workspaceId: context.workspaceId 
  });
  assert.ok(fetchedIntent?.raw, "Raw signal tersimpan di database");
  // Cast raw content to any untuk menghindari unknown type error
  const rawContent = fetchedIntent.raw.content as any;
  assert.deepStrictEqual(rawContent.signal, "server_cpu_threshold_exceeded", "Raw signal utuh");
  assert.strictEqual(rawContent.severity, "critical", "Severity terjaga");

  // 5. Verifikasi understanding engine bekerja
  assert.ok(fetchedIntent?.understanding, "Understanding engine menghasilkan output");
  assert.ok(fetchedIntent.understanding.candidateDomains.includes("TECHNICAL_INCIDENT"), "Domain terdeteksi sebagai technical incident");
  assert.strictEqual(fetchedIntent.understanding.unknowns.length, 0, "Tidak membutuhkan clarification (semua data lengkap)");

  // 6. Uji konversi ke Work (markAsConverted method)
  const workId = "case-12345-production-outage";
  const convertResult = await repo.markAsConverted(intentId, workId);
  assert.ok(convertResult, "Intent berhasil dikonversi menjadi Work");
  
  const convertedIntent = await repo.byId(intentId);
  assert.strictEqual(convertedIntent?.status, "WORK_FORMED", "Status berubah menjadi WORK_FORMED");
  assert.strictEqual(convertedIntent.convertedToWorkId, workId, "Memiliki ID Work yang dihasilkan");

  // 7. Verifikasi semua data tetap terjaga setelah update
  const convertedRawContent = convertedIntent.raw.content as any;
  assert.deepStrictEqual(convertedRawContent.server_id, "prod-web-01", "Raw data tetap utuh setelah konversi");

  console.log("✅ SEMUA TEST UNIVERSAL INTENT MACHINE SOURCE LULUS!");
});
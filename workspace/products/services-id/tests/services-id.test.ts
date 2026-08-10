import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { capabilityRegistry, type CommandInvocationRecord } from "../../../apps/web/lib/capability-command-registry";
import {
  ServiceProviderRepositoryInMemory,
  ServiceRequestRepositoryInMemory,
} from "../../../capabilities/service-directory/implementation/repository/service.repository";
import type {
  ServiceProviderCategory,
  ServiceRequestAggregate,
  ServiceRequestStatus,
} from "../../../capabilities/service-directory/implementation/contracts/service.contracts";

const loadEosManifest = () => {
  const manifestPath = path.resolve(__dirname, "..", "eos.yaml");
  return yaml.load(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
};

interface SvcLifecycleLedger {
  readonly records: CommandInvocationRecord[];
  readonly createdId: string;
  readonly createdOutput: { readonly id: string; readonly status: ServiceRequestStatus };
  readonly acceptedOutput: { readonly id: string; readonly status: ServiceRequestStatus; readonly providerId: string };
  readonly deliveredOutput: { readonly id: string; readonly status: "delivered"; readonly deliveredAt: Date };
  readonly input: {
    readonly title: string;
    readonly description: string;
    readonly category: ServiceProviderCategory;
    readonly requesterName: string;
    readonly providerId: string;
    readonly budget: number;
  };
}

function runLifecycleSvcE2E(
  title: string,
  description: string,
  category: ServiceProviderCategory,
  requesterName: string,
  providerId: string,
  budget: number,
): SvcLifecycleLedger {
  const records: CommandInvocationRecord[] = [];

  const createResult = capabilityRegistry.invoke<{ readonly id: string; readonly status: ServiceRequestStatus }>(
    "services-id",
    "createServiceRequest",
    { title, description, category, requesterName, providerId, budget },
  );
  records.push(createResult.record);
  assert.equal(createResult.record.ok, true, "service-directory.createServiceRequest must record ok:true");
  assert.ok(createResult.output.id.startsWith("sreq-"), "createServiceRequest must produce sreq-XXX id");
  assert.equal(createResult.output.status, "draft", "createServiceRequest initial status = draft");

  const id = createResult.output.id as string;
  const pAfterCreate = ServiceRequestRepositoryInMemory.byId(id);
  assert.ok(pAfterCreate !== undefined, `sreq ${id} retrievable dari repository setelah create`);
  assert.equal(pAfterCreate.title, title.trim(), "persisted title match input");
  assert.equal(pAfterCreate.status, "draft", "persisted status after create = draft");
  assert.equal(pAfterCreate.category, category, "persisted category match");
  assert.equal(pAfterCreate.requesterName, requesterName, "persisted requesterName match");
  assert.equal(pAfterCreate.budget, budget, "persisted budget match");

  const acceptResult = capabilityRegistry.invoke<{
    readonly id: string;
    readonly status: ServiceRequestStatus;
    readonly providerId: string;
  }>("services-id", "acceptServiceRequest", { id, providerId });
  records.push(acceptResult.record);
  assert.equal(acceptResult.record.ok, true, "service-directory.acceptServiceRequest must record ok:true");
  assert.equal(acceptResult.output.status, "accepted", "acceptServiceRequest on draft → accepted");
  assert.equal(acceptResult.output.providerId, providerId, "accept echo providerId");

  const pAfterAccept = ServiceRequestRepositoryInMemory.byId(id);
  assert.equal(pAfterAccept?.status, "accepted", "repo status after accept = accepted");
  assert.equal(pAfterAccept?.providerId, providerId, "repo providerId match assigned");

  const deliverResult = capabilityRegistry.invoke<{
    readonly id: string;
    readonly status: "delivered";
    readonly deliveredAt: Date;
  }>("services-id", "markServiceDelivered", { id });
  records.push(deliverResult.record);
  assert.equal(deliverResult.record.ok, true, "service-directory.markServiceDelivered must record ok:true");
  assert.equal(deliverResult.output.status, "delivered", "markServiceDelivered terminal = delivered");
  assert.ok(deliverResult.output.deliveredAt instanceof Date, "delivered output stamps deliveredAt");

  const pAfterDeliver = ServiceRequestRepositoryInMemory.byId(id);
  assert.equal(pAfterDeliver?.status, "delivered", "repo terminal status = delivered");
  assert.ok(pAfterDeliver?.deliveredAt instanceof Date, "repo deliveredAt stamped");

  return {
    records,
    createdId: id,
    createdOutput: createResult.output,
    acceptedOutput: acceptResult.output,
    deliveredOutput: deliverResult.output,
    input: { title: title.trim(), description, category, requesterName, providerId, budget },
  };
}

test.describe("SREQ-001 · Services.ID Lifecycle E2E (capabilityRegistry · NO MOCKS)", () => {
  test("DISCOVER: list Cybersecurity providers yang verified tersedia di repository", () => {
    const all = ServiceProviderRepositoryInMemory.list();
    const cyber = all.filter((p) => p.category === "Cybersecurity");
    assert.ok(all.length >= 4, `total providers cukup, got ${all.length}`);
    assert.ok(cyber.length >= 1, `harus ada minimal 1 Cybersecurity provider, got ${cyber.length}`);
    const verifiedCyber = cyber.filter((p) => p.verified === true);
    assert.ok(verifiedCyber.length >= 1, "minimal 1 provider Cybersecurity ter-verified");
  });

  test("createServiceRequest → persist → retrieved byId dengan field budget/category/requester match", () => {
    const ledger = runLifecycleSvcE2E(
      "   Penetration Testing Aplikasi Mobile dan Backend   ",
      "Blackbox + graybox pentest iOS/Android + REST API dengan evidence report lengkap",
      "Cybersecurity",
      "Bapak Rizky Pratama — CISO PT Fintek Digital Nusantara",
      "sp-003",
      85000000,
    );

    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, `semua ${ledger.records.length} CommandInvocationRecord ok:true`);

    const rehydrated: ServiceRequestAggregate | undefined = ServiceRequestRepositoryInMemory.byId(ledger.createdId);
    assert.ok(rehydrated !== undefined, "final retrieval: sreq byId tersedia");
    assert.equal(rehydrated.status, "delivered", "final status = delivered terminal");
    assert.equal(rehydrated.providerId, ledger.input.providerId, "final providerId persisten");
    assert.equal(rehydrated.budget, ledger.input.budget, "budget tersimpan persis 85000000");
    assert.equal(rehydrated.requesterName, ledger.input.requesterName, "requesterName tersimpan");
    assert.equal(rehydrated.category, "Cybersecurity", "category tersimpan Cybersecurity");
    assert.equal(rehydrated.title, "Penetration Testing Aplikasi Mobile dan Backend", "title di-trim saat persist");
  });

  test("acceptServiceRequest menghasilkan transisi draft→accepted + providerId terasosiasi persisten", () => {
    const provider = ServiceProviderRepositoryInMemory.listByCategory("IT Support")[0];
    assert.ok(provider !== undefined, "provider IT Support tersedia");
    const title = "Outsourcing Managed IT Support 12 Bulan untuk Kantor Cabang";
    const ledger = runLifecycleSvcE2E(
      title,
      "Helpdesk on-site + remote monitoring + patch management",
      "IT Support",
      "Ibu Sari Dewi — Head of Operations",
      provider.id,
      180000000,
    );
    assert.equal(ledger.acceptedOutput.status, "accepted", "accept → accepted");
    assert.equal(ledger.acceptedOutput.providerId, provider.id, "echo providerId");
    const row = ServiceRequestRepositoryInMemory.byId(ledger.createdId);
    assert.equal(row?.providerId, provider.id, "repo providerId = assigned");
    assert.equal(row?.status, "delivered", "final status delivered setelah markServiceDelivered");
  });

  test("markServiceDelivered men-stamp deliveredAt + mencapai terminal state delivered", () => {
    const ledger = runLifecycleSvcE2E(
      "Implementasi Zero Trust Network Architecture untuk Hybrid Cloud",
      "Assessment + deploy Zero Trust untuk AWS + on-prem 3 kantor",
      "Infrastructure",
      "Bapak Fahmi Hidayat — CTO PT Data Terpusat",
      "sp-005",
      325000000,
    );
    const t = ledger.deliveredOutput.deliveredAt.getTime();
    assert.ok(Number.isFinite(t), "deliveredAt adalah Date valid");
    assert.equal(ledger.deliveredOutput.status, "delivered", "status = delivered");

    const repo = ServiceRequestRepositoryInMemory.byId(ledger.createdId);
    assert.ok(repo?.deliveredAt !== undefined, "aggregate.deliveredAt tidak undefined pasca delivered");
    assert.ok(repo?.deliveredAt instanceof Date, "aggregate.deliveredAt bertipe Date");
    assert.equal(ledger.records.length, 3, "3 writes = 3 ledger records (create + accept + deliver)");
    assert.equal(repo?.budget, 325000000, "budget 325 juta tersimpan");
  });

  test("lifecycle: draft → accepted → delivered membentuk rantai transisi monotonik tanpa rollback", () => {
    const ledger = runLifecycleSvcE2E(
      "Pengembangan Sistem Informasi Manajemen Arsip Digital Perusahaan",
      "Custom web app + OCR + e-archive indexing, 6 bulan delivery",
      "Software Development",
      "Ibu Maya Anggraini — Dir. Operasional PT Arsip Terintegrasi",
      "sp-006",
      750000000,
    );
    const statuses = [ledger.createdOutput.status, ledger.acceptedOutput.status, ledger.deliveredOutput.status];
    assert.deepEqual(statuses, ["draft", "accepted", "delivered"], "transisi monotonik draft→accepted→delivered");
    assert.equal(ledger.deliveredOutput.status, "delivered", "terminasi di delivered, bukan state lebih awal");
  });

  test("Semua 3 CommandInvocationRecord memiliki invokedAt terformat ISO + commandKey yang benar", () => {
    const ledger = runLifecycleSvcE2E(
      "Jasa Audit Kepatuhan PDP/E-Commerce untuk Merchant Aggregator",
      "Gap analysis PDP UU No.27/2022 + remediation plan + sertifikasi",
      "Cybersecurity",
      "Bapak Andre Wijaya — Chief Compliance",
      "sp-003",
      125000000,
    );
    assert.equal(ledger.records.length, 3, "harus tepat 3 CommandInvocationRecord");

    const expectedKeys = ["createServiceRequest", "acceptServiceRequest", "markServiceDelivered"];
    for (let i = 0; i < ledger.records.length; i += 1) {
      const r = ledger.records[i];
      assert.equal(r.ok, true, `record ${i} ok:true`);
      assert.ok(r.commandKey.includes(expectedKeys[i]), `record ${i} commandKey mengandung ${expectedKeys[i]}`);
      assert.ok(r.invokedAt.length >= 16, `record ${i} invokedAt terformat panjang cukup`);
      assert.ok(Number.isNaN(Date.parse(r.invokedAt)) === false, `record ${i} invokedAt parseable sebagai Date`);
    }
  });
});

test.describe("Services.ID Product Health Checks", () => {
  test("eos.yaml manifest is valid and contains all required fields", () => {
    const eosManifest = loadEosManifest() as Record<string, any>;

    assert.ok(eosManifest.version, "Harus memiliki versi manifest");
    assert.ok(eosManifest.workspace?.name === "services-id", "Workspace name harus sesuai product ID");
    assert.ok(eosManifest.lifecycle?.phase === "D.1", "Harus dalam fase delivery yang benar");
    assert.ok(eosManifest.lifecycle?.status === "ACTIVE", "Product status harus ACTIVE");
    assert.ok(
      Array.isArray(eosManifest.lifecycle?.real_user_jobs) && eosManifest.lifecycle.real_user_jobs.length >= 1,
      "Harus memiliki minimal 1 real user job yang didefinisikan",
    );
  });

  test("production readiness metrics meet minimum thresholds", () => {
    const eosManifest = loadEosManifest() as Record<string, any>;
    const qualityTargets = eosManifest.quality?.targets ?? {};

    assert.ok((qualityTargets.test_coverage_min ?? 0) >= 80, "Test coverage minimum harus memenuhi standar platform");
    assert.ok(qualityTargets.evidence_required === true, "Semua artefak harus memerlukan bukti verifikasi");
  });
});

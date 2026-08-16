import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { capabilityRegistry, type CommandInvocationRecord } from "../../../apps/web/lib/capability-command-registry";
import { CaseRepositoryInMemory } from "../../../capabilities/legal-case/implementation/repository/case.repository";
import type { CaseAggregate, CaseStatus } from "../../../capabilities/legal-case/implementation/contracts/case.contracts";
import { DocumentRepositoryInMemory } from "../../../capabilities/legal-document/implementation/repository";
import type { DocumentAggregate, DocumentStatus } from "../../../capabilities/legal-document/implementation/contracts";

const loadEosManifest = () => {
  const manifestPath = path.resolve(__dirname, "..", "eos.yaml");
  return yaml.load(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
};

interface LifecycleLedger {
  readonly records: CommandInvocationRecord[];
  readonly createdCaseId: string;
  readonly createdOutput: { readonly id: string; readonly status: CaseStatus };
  readonly assignedOutput: { readonly id: string; readonly lawyerId: string; readonly status: CaseStatus };
  readonly closedOutput: { readonly id: string; readonly status: "closed"; readonly closedAt: Date };
}

const LH_SESSION_ID = "session-test-001";

async function runLifecycleE2E(title: string, priority: "low" | "medium" | "high" | "critical", lawyerId: string): Promise<LifecycleLedger> {
  const records: CommandInvocationRecord[] = [];

  const createResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: CaseStatus }>(
    "legal-case",
    "case.create",
    { title, priority, sessionId: LH_SESSION_ID },
  );
  records.push(createResult.record);
  assert.equal(createResult.record.ok, true, "case.create invocation must record ok:true");
  assert.ok(createResult.output.id.startsWith("case-"), "case.create must produce case-XXX id");
  assert.equal(createResult.output.status, "draft", "case.create initial status must = draft");

  const caseId = createResult.output.id as string;
  const persistedAfterCreate = await CaseRepositoryInMemory.byId(caseId as never);
  assert.ok(persistedAfterCreate !== undefined, `case ${caseId} must be retrievable from repository after create`);
  assert.equal(persistedAfterCreate.title, title, "persisted title must match input");
  assert.equal(persistedAfterCreate.status, "draft", "persisted status after create = draft");

  const assignResult = await capabilityRegistry.invoke<{ readonly id: string; readonly lawyerId: string; readonly status: CaseStatus }>(
    "lawyershub",
    "case.assignLawyer",
    { id: caseId, lawyerId },
  );
  records.push(assignResult.record);
  assert.equal(assignResult.record.ok, true, "case.assignLawyer invocation must record ok:true");
  assert.equal(assignResult.output.lawyerId, lawyerId, "assignLawyer output must echo lawyerId");
  assert.equal(assignResult.output.status, "open", "assignLawyer on draft transitions to open");

  const persistedAfterAssign = await CaseRepositoryInMemory.byId(caseId as never);
  assert.equal(persistedAfterAssign?.status, "open", "repository status after assign = open");
  assert.equal(persistedAfterAssign?.lawyerId, lawyerId, "repository lawyerId matches assigned lawyerId");

  const closeResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "closed"; readonly closedAt: Date }>(
    "legal-case",
    "case.close",
    { id: caseId },
  );
  records.push(closeResult.record);
  assert.equal(closeResult.record.ok, true, "case.close invocation must record ok:true");
  assert.equal(closeResult.output.status, "closed", "case.close terminal status = closed");
  assert.ok(closeResult.output.closedAt instanceof Date, "close output must stamp closedAt");

  const persistedAfterClose = await CaseRepositoryInMemory.byId(caseId as never);
  assert.equal(persistedAfterClose?.status, "closed", "repository terminal status = closed");
  assert.ok(persistedAfterClose?.closedAt instanceof Date, "repository closedAt stamped on terminal aggregate");

  return {
    records,
    createdCaseId: caseId,
    createdOutput: createResult.output,
    assignedOutput: assignResult.output,
    closedOutput: closeResult.output,
  };
}

// LH-CASE-001 — Full lifecycle via unified capability registry invocation
test.describe("LH-CASE-001 · Lifecycle E2E (capabilityRegistry invocation · NO MOCKS)", () => {
  test("case.create → persist ke repository → retrieved byId dengan field match", async () => {
    const ledger = await runLifecycleE2E(
      "Perjanjian Lisensi Perangkat Lunak Enterprise SaaS",
      "high",
      "lawyer-LHCASE001",
    );

    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, `semua ${ledger.records.length} CommandInvocationRecord ok:true`);

    const rehydrated: CaseAggregate | undefined = await CaseRepositoryInMemory.byId(ledger.createdCaseId as never);
    assert.ok(rehydrated !== undefined, "final retrieval: case byId tersedia");
    assert.equal(rehydrated.status, "closed", "final status = closed terminal");
    assert.equal(rehydrated.lawyerId, "lawyer-LHCASE001", "final lawyerId persisten");
    assert.equal(rehydrated.priority, "high", "priority tersimpan sesuai input");
  });

  test("case.assignLawyer menghasilkan transisi status draft→open + lawyerId persisten", async () => {
    const title = "Sengketa Merek Dagang Waralaba Makanan Cepat Saji";
    const lawyerId = "lawyer-warkop";
    const ledger = await runLifecycleE2E(title, "critical", lawyerId);
    assert.equal(ledger.assignedOutput.status, "open", "assign → open");
    assert.equal(ledger.assignedOutput.lawyerId, lawyerId, "echo lawyerId");
    const row = await CaseRepositoryInMemory.byId(ledger.createdCaseId as never);
    assert.equal(row?.lawyerId, lawyerId, "repo lawyerId = assigned");
    assert.equal(row?.status, "closed", "final status tetap closed setelah close");
  });

  test("case.close men-stamp closedAt + mencapai terminal state closed", async () => {
    const ledger = await runLifecycleE2E("Kepatuhan PDP Transfer Data Cross-Border Vendor", "medium", "lawyer-pdp01");
    const beforeClosed = ledger.closedOutput.closedAt.getTime();
    assert.ok(Number.isFinite(beforeClosed), "closedAt adalah Date valid");
    assert.equal(ledger.closedOutput.status, "closed", "status tertutup = closed");

    const repo = await CaseRepositoryInMemory.byId(ledger.createdCaseId as never);
    assert.ok(repo?.closedAt !== undefined, "aggregate.closedAt tidak undefined pasca close");
    assert.ok(repo?.closedAt instanceof Date, "aggregate.closedAt bertipe Date");
    assert.equal(ledger.records.length, 3, "3 writes = 3 ledger records (create + assign + close)");
  });
});

interface MatterDocCompositeLedger {
  readonly records: CommandInvocationRecord[];
  readonly caseId: string;
  readonly docId: string;
  readonly caseCreated: { readonly id: string; readonly status: CaseStatus };
  readonly caseAssigned: { readonly id: string; readonly lawyerId: string; readonly status: CaseStatus };
  readonly docCreated: { readonly id: string; readonly status: DocumentStatus; readonly createdAt: Date };
  readonly docSigned: { readonly id: string; readonly status: "signed"; readonly signedAt: Date; readonly signer?: string };
  readonly docArchived: { readonly id: string; readonly status: "archived"; readonly archivedAt: Date };
  readonly matterTitle: string;
  readonly docTitle: string;
  readonly lawyerId: string;
  readonly docAuthor: string;
}

async function runMatterDocumentCompositeE2E(
  matterTitle: string,
  priority: "low" | "medium" | "high" | "critical",
  lawyerId: string,
  docTitle: string,
  docDescription: string,
  docAuthor: string,
  docSigner: string,
): Promise<MatterDocCompositeLedger> {
  const records: CommandInvocationRecord[] = [];

  // Stage 1 — LegalCase.create → draft
  const caseCr = await capabilityRegistry.invoke<{ readonly id: string; readonly status: CaseStatus }>(
    "legal-case",
    "case.create",
    { title: matterTitle, priority, sessionId: LH_SESSION_ID },
  );
  records.push(caseCr.record);
  assert.equal(caseCr.record.ok, true, "case.create record ok:true");
  assert.equal(caseCr.output.status, "draft", "case.create → draft");
  const caseId = caseCr.output.id as string;
  const caseAfterCreate = await CaseRepositoryInMemory.byId(caseId as never);
  assert.ok(caseAfterCreate !== undefined, "case persisted after create");

  // Stage 2 — case.assignLawyer → open
  const caseAs = await capabilityRegistry.invoke<{ readonly id: string; readonly lawyerId: string; readonly status: CaseStatus }>(
    "lawyershub",
    "case.assignLawyer",
    { id: caseId, lawyerId },
  );
  records.push(caseAs.record);
  assert.equal(caseAs.record.ok, true, "case.assignLawyer record ok:true");
  assert.equal(caseAs.output.status, "open", "assignLawyer → open");
  const caseAfterAssign = await CaseRepositoryInMemory.byId(caseId as never);
  assert.equal(caseAfterAssign?.lawyerId, lawyerId, "repo lawyerId match assigned");

  // Stage 3 — LegalDocument.create({matterId:caseId}) → draft (CROSS-CAPABILITY LINK)
  const docCr = await capabilityRegistry.invoke<{ readonly id: string; readonly status: DocumentStatus; readonly createdAt: Date }>(
    "legal-document",
    "document.create",
    { title: docTitle, description: docDescription, matterId: caseId, author: docAuthor },
  );
  records.push(docCr.record);
  assert.equal(docCr.record.ok, true, "document.create record ok:true");
  assert.equal(docCr.output.status, "draft", "document.create → draft");
  const docId = docCr.output.id as string;
  const docAfterCreate = DocumentRepositoryInMemory.byId(docId);
  assert.ok(docAfterCreate !== undefined, "document persisted after create");
  assert.equal(docAfterCreate.matterId, caseId, "CRITICAL: document.matterId === case.id (native cross-capability link)");
  assert.equal(docAfterCreate.author, docAuthor, "document author persisted");

  // Stage 4 — document.sign → signed
  const docSg = await capabilityRegistry.invoke<{
    readonly id: string;
    readonly status: "signed";
    readonly signedAt: Date;
    readonly signer?: string;
  }>("legal-document", "document.sign", { id: docId, signer: docSigner });
  records.push(docSg.record);
  assert.equal(docSg.record.ok, true, "document.sign record ok:true");
  assert.equal(docSg.output.status, "signed", "sign → signed");
  assert.ok(docSg.output.signedAt instanceof Date, "sign stamps signedAt");
  const docAfterSign = DocumentRepositoryInMemory.byId(docId);
  assert.equal(docAfterSign?.status, "signed", "repo signed");
  assert.ok(docAfterSign?.signedAt instanceof Date, "repo signedAt stamped");

  // Stage 5 — document.archive → archived terminal
  const docAr = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "archived"; readonly archivedAt: Date }>(
    "legal-document",
    "document.archive",
    { id: docId },
  );
  records.push(docAr.record);
  assert.equal(docAr.record.ok, true, "document.archive record ok:true");
  assert.equal(docAr.output.status, "archived", "archive → archived terminal");
  assert.ok(docAr.output.archivedAt instanceof Date, "archive stamps archivedAt");
  const docAfterArchive = DocumentRepositoryInMemory.byId(docId);
  assert.equal(docAfterArchive?.status, "archived", "repo terminal status = archived");
  assert.ok(docAfterArchive?.archivedAt instanceof Date, "repo archivedAt stamped");
  assert.equal(docAfterArchive?.matterId, caseId, "matterId STILL PERSIS = caseId setelah archive terminal");

  return {
    records,
    caseId,
    docId,
    caseCreated: caseCr.output,
    caseAssigned: caseAs.output,
    docCreated: docCr.output,
    docSigned: docSg.output,
    docArchived: docAr.output,
    matterTitle: matterTitle.trim(),
    docTitle: docTitle.trim(),
    lawyerId,
    docAuthor,
  };
}

// LH-CASE-002 — Cross-Capability Composite: LegalCase ↔ LegalDocument native matterId linking
test.describe("LH-CASE-002 · Matter↔Document Composite E2E (legal-case + legal-document · NO MOCKS)", () => {
  test("Native cross-capability link: document.create({matterId:caseId}) → byId(doc).matterId === caseId EXACT PERSISTEN", async () => {
    const ledger = await runMatterDocumentCompositeE2E(
      "Perkara Wanprestasi Penyediaan Perangkat Jaringan Kantor Cabang",
      "high",
      "lawyer-LHCASE002-01",
      "   Perjanjian Kerja Sama Penyediaan Infrastruktur Jaringan   ",
      "Perjanjian bilateral dengan PT Network Solusi Indonesia, nilai kontrak Rp 850 juta + jadwal delivery 16 minggu.",
      "Associate. Sarah Melani, S.H.",
      "Partner. Handoko Wijaya, S.H., M.Kn.",
    );

    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, `semua ${ledger.records.length} CommandInvocationRecord ok:true`);
    assert.equal(ledger.records.length, 5, "5 writes = 5 ledger records (case.create+assign + doc.create+sign+archive)");

    const retrievedDoc: DocumentAggregate | undefined = DocumentRepositoryInMemory.byId(ledger.docId);
    assert.ok(retrievedDoc !== undefined, "final document byId dapat diambil");
    assert.equal(retrievedDoc.matterId, ledger.caseId, `PRIMARY ASSERTION: doc.matterId = "${ledger.caseId}" PERSIS SAMA DENGAN case.id`);

    const retrievedCase: CaseAggregate | undefined = await CaseRepositoryInMemory.byId(ledger.caseId as never);
    assert.ok(retrievedCase !== undefined, "case byId dapat diambil");
    assert.equal(retrievedCase.title, ledger.matterTitle, "case title persisted trimmed");
  });

  test("Document lifecycle monotonik draft→signed→archived + signedAt/archivedAt ter-stamp + matterId tetap terikat setelah terminal", async () => {
    const ledger = await runMatterDocumentCompositeE2E(
      "Sengketa Merek Dagang Waralaba Roti Khas 'Bandung Maknyus'",
      "critical",
      "lawyer-warkop-002",
      "Gugatan Perdata Atas Pelanggaran Merek Dagang No. 123/2026/PN.BDG",
      "Tuntutan ganti rugi Rp 2,3 Miliar + penarikan barang pelanggar dari 146 gerai di wilayah Jabar-Banten.",
      "Senior Associate. Bayu Pratama, S.H., LL.M.",
      "Kuasa Hukum. Prof. Dr. Sutrisno, S.H., M.Hum.",
    );
    const docStatuses = [ledger.docCreated.status, ledger.docSigned.status, ledger.docArchived.status];
    assert.deepEqual(docStatuses, ["draft", "signed", "archived"], "doc lifecycle monotonik draft→signed→archived");

    const sgT = ledger.docSigned.signedAt.getTime();
    const arT = ledger.docArchived.archivedAt.getTime();
    assert.ok(Number.isFinite(sgT) && Number.isFinite(arT), "signedAt/archivedAt Date valid");
    assert.ok(arT >= sgT, "archivedAt >= signedAt (monotonik timestamp)");

    const finalDoc = DocumentRepositoryInMemory.byId(ledger.docId);
    assert.equal(finalDoc?.status, "archived", "final doc status = archived");
    assert.equal(finalDoc?.matterId, ledger.caseId, "matterId MASIH TERIKAT BAHKAN SETELAH status archived terminal");
    assert.ok(finalDoc?.signedAt instanceof Date, "aggregate.signedAt tidak hilang di archive");
    assert.ok(finalDoc?.archivedAt instanceof Date, "aggregate.archivedAt ter-stamp permanen");
  });

  test("CommandInvocationRecord 5-step composite memiliki commandKey berurutan: case.create→assignLawyer→document.create→sign→archive", async () => {
    const ledger = await runMatterDocumentCompositeE2E(
      "Kepatuhan GDPR Schrems-II untuk Transfer Data Lintas-Atlantik Kantor Perwakilan EU",
      "high",
      "lawyer-gdpr-001",
      "Laporan Dampak Perlindungan Data (DPIA) — Transfer Data Cross-Border",
      "Assessment 42 sub-proses transfer data EU→ID dengan adequacy framework SCC terbaru 2024/1191.",
      "Privacy Associate. Gita Permatasari, S.H., CIPP/E",
      "DPO. Dr. Irfan Maulana, CIPM, FIP.",
    );
    assert.equal(ledger.records.length, 5, "tepat 5 CommandInvocationRecord untuk composite slice");

    const expectedKeyContains = ["case.create", "assignLawyer", "document.create", "document.sign", "document.archive"];
    for (let i = 0; i < ledger.records.length; i += 1) {
      const r = ledger.records[i];
      assert.equal(r.ok, true, `record ${i} ok:true`);
      assert.ok(
        r.commandKey.includes(expectedKeyContains[i]),
        `record ${i} commandKey="${r.commandKey}" mengandung "${expectedKeyContains[i]}"`,
      );
      assert.ok(r.invokedAt.length >= 16, `record ${i} invokedAt panjang cukup`);
      assert.ok(Number.isNaN(Date.parse(r.invokedAt)) === false, `record ${i} invokedAt parseable ISO`);
    }
  });
});

// Dasar kesehatan produk LawyersHub (manifest + quality thresholds)
test.describe("LawyersHub Product Health Checks", () => {
  test("eos.yaml manifest is valid and contains all required fields", () => {
    const eosManifest = loadEosManifest() as Record<string, any>;

    assert.ok(eosManifest.version, "Harus memiliki versi manifest");
    assert.ok(eosManifest.workspace?.name === "lawyershub", "Workspace name harus sesuai product ID");
    assert.ok(eosManifest.lifecycle?.phase === "D.1", "Harus dalam fase delivery yang benar");
    assert.ok(eosManifest.lifecycle?.status === "ACTIVE", "Product status harus ACTIVE");
    assert.ok(Array.isArray(eosManifest.lifecycle?.real_user_jobs) && eosManifest.lifecycle.real_user_jobs.length >= 1, "Harus memiliki minimal 1 real user job yang didefinisikan");
  });

  test("production readiness metrics meet minimum thresholds", () => {
    const eosManifest = loadEosManifest() as Record<string, any>;
    const qualityTargets = eosManifest.quality?.targets ?? {};

    assert.ok((qualityTargets.test_coverage_min ?? 0) >= 80, "Test coverage minimum harus memenuhi standar platform");
    assert.ok(qualityTargets.evidence_required === true, "Semua artefak harus memerlukan bukti verifikasi");
  });
});

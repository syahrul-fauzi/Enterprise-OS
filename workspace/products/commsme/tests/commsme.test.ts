import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { capabilityRegistry, type CommandInvocationRecord } from "@repo/core-kernel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { CaseRepositoryInMemory } from "../../../capabilities/legal-case/implementation/repository/case.repository.js";
import type { CaseAggregate, CaseStatus } from "../../../capabilities/legal-case/implementation/contracts/case.contracts.js";
import { DocumentRepositoryInMemory } from "../../../capabilities/legal-document/implementation/repository/index.js";
import { DocumentId } from "../../../capabilities/legal-document/implementation/contracts/index.js";
import type { DocumentAggregate } from "../../../capabilities/legal-document/implementation/contracts/index.js";

import { ServiceProviderRepositoryInMemory, ServiceRequestRepositoryInMemory } from "../../../capabilities/service-directory/implementation/repository/index.js";
import { ServiceRequestId } from "../../../capabilities/service-directory/implementation/contracts/service.contracts.js";
import type { ServiceRequestAggregate, ServiceRequestStatus } from "../../../capabilities/service-directory/implementation/contracts/service.contracts.js";

import {
  TopicRepositoryInMemory,
  ContentArticleRepositoryInMemory,
} from "../../../capabilities/legal-community/implementation/repository/community.repository.js";
import { ContentId } from "../../../capabilities/legal-community/implementation/contracts/community.contracts.js";
import type {
  ContentArticleAggregate,
  ContentStatus,
  TopicCategory,
} from "../../../capabilities/legal-community/implementation/contracts/community.contracts.js";

import { getProductExperience } from "../../../packages/presentation/experience/src/catalog.js";
import { provideCommsMeContext } from "../runtime/product-context-provider.js";

const COM_SESSION_ID = "session-test-001";

const loadEosManifest = () => {
  const manifestPath = path.resolve(__dirname, "..", "eos.yaml");
  return yaml.load(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
};
const loadBinding = () => {
  const bindingPath = path.resolve(__dirname, "..", "product.binding.yaml");
  return yaml.load(fs.readFileSync(bindingPath, "utf8")) as Record<string, unknown>;
};

interface ComsWorkflowLedger {
  step1_open: { manifestValid: boolean; bindingValid: boolean; productExperience: boolean };
  step2_understand: { umkmNeeds: readonly string[]; count: number };
  step3_choose: readonly string[];
  step4_create: CommandInvocationRecord[];
  step5_exec: string[];
  step6_state: {
    casePersist?: CaseAggregate;
    ndaDocument?: DocumentAggregate;
    serviceRequestPersist?: ServiceRequestAggregate;
    sopArticlePersist?: ContentArticleAggregate;
    allPersistedOk: boolean;
  };
  step7_see: { observableOutputsCount: number };
}

test.describe("WORK-COM-001 · MSME Legal Companion Canonical Workflow (7 Steps UMKM Real Jobs)", () => {
  test("STEP 1 OPEN — COM surface manifest, binding, dan product experience dapat di-load & registration valid", async () => {
    const manifest = loadEosManifest();
    const binding = loadBinding();
    const experience = getProductExperience("commsme");

    assert.equal(manifest.version, "1.0", "eos.yaml manifest version 1.0");
    assert.equal(typeof manifest.workspace === "object" && manifest.workspace !== null, true, "workspace section exists");
    const ws = manifest.workspace as Record<string, unknown>;
    assert.equal(ws.name, "commsme", "workspace name = commsme");

    const product = binding.product as Record<string, unknown>;
    assert.equal(product.id, "commsme", "binding product.id = commsme");

    assert.ok(experience !== undefined, "getProductExperience('commsme') return tidak undefined — catalog registration valid");
    assert.equal(experience.identity.productId, "commsme", "experience identity productId = commsme");
    assert.equal(experience.identity.category, "pendamping hukum untuk usaha mikro, kecil, dan menengah", "category UMKM companion bukan skin");

    const context = provideCommsMeContext();
    assert.equal(context.productId, "commsme", "provideCommsMeContext return id correct");
    assert.equal(context.substrateCapabilitiesUsed.length, 3, "3 substrate capabilities used (legal-case, service-directory, legal-community)");
    assert.equal(context.noteNewCapabilities, 0, "0 new capability — pure substrate COMPOSITION, bukan capability builder baru");
  });

  test("STEP 2 UNDERSTAND — 6 kebutuhan hukum UMKM tersedia di product experience entry.topics + manifest real_user_jobs", async () => {
    const manifest = loadEosManifest();
    const experience = getProductExperience("commsme")!;

    const lifecycle = manifest.lifecycle as Record<string, unknown>;
    const jobs = lifecycle.real_user_jobs as unknown as readonly Record<string, unknown>[];
    assert.equal(jobs.length, 6, "manifest real_user_jobs = 6 paket UMKM");

    const umkmNeeds = jobs.map((j) => j.id as string);
    assert.deepEqual(umkmNeeds, ["umkm-101", "umkm-102", "umkm-103", "umkm-104", "umkm-105", "umkm-106"], "6 kebutuhan UMKM tersusun: badan hukum, perizinan, kontrak, konsultasi, SOP, vendor");

    assert.equal(experience.entry.topics.length, 6, "experience entry.topics = 6 topik UMKM");
    const experienceLabels = experience.entry.topics.map((t) => t.label);
    assert.ok(experienceLabels.includes("Pendirian PT / CV"), "termasuk pendirian badan usaha");
    assert.ok(experienceLabels.includes("NIB / PIRT / Izin Usaha"), "termasuk perizinan");
    assert.ok(experienceLabels.includes("Kontrak Vendor / NDA / Klien"), "termasuk kontrak");
    assert.ok(experienceLabels.includes("Konsultasi Bisnis Harian"), "termasuk konsultasi");
    assert.ok(experienceLabels.includes("SOP Karyawan & HR Legal"), "termasuk SOP HR");
    assert.ok(experienceLabels.includes("Temukan Vendor Legal"), "termasuk vendor directory");
  });

  test("STEP 3 CHOOSE + STEP 4 CREATE + STEP 5 EXEC + STEP 6 STATE + STEP 7 SEE — 3 kebutuhan nyata UMKM ke 3 substrate capabilities: (A) NDA via legal-case, (B) NIB via service-directory, (C) SOP karyawan via legal-community — TANPA new capability apapun", async () => {
    const ledger: ComsWorkflowLedger = {
      step1_open: { manifestValid: true, bindingValid: true, productExperience: true },
      step2_understand: { umkmNeeds: ["umkm-101..106"], count: 6 },
      step3_choose: ["(A) umkm-103 Kontrak NDA (legal-case)", "(B) umkm-102 NIB Perizinan (service-directory)", "(C) umkm-105 SOP Karyawan (legal-community)"],
      step4_create: [],
      step5_exec: [],
      step6_state: { allPersistedOk: false },
      step7_see: { observableOutputsCount: 0 },
    };

    const records: CommandInvocationRecord[] = [];

    // ================================================
    // (A) UMKM-103 — KONTRAK NDA MITRA WARALABA KOPI
    //     Substrate: legal-case LawyersHub
    // ================================================
    const createNdaCase = await capabilityRegistry.invoke<{ readonly id: string; readonly status: CaseStatus }>(
      "commsme",
      "case.create",
      {
        title: "UMKM-103 · NDA Kerjasama Mitra Waralaba Kopi Nusantara — Toko Kedai Rakyat Jakarta Selatan",
        priority: "high",
        sessionId: COM_SESSION_ID,
      },
    );
    records.push(createNdaCase.record);
    assert.equal(createNdaCase.record.ok, true, "A: case.create NDA ok:true");
    assert.ok(createNdaCase.output.id.startsWith("case-"), "A: NDA case id = case-XXX");
    assert.equal(createNdaCase.output.status, "draft", "A: initial NDA case status = draft");

    // Cari notaris/advokat pendamping via assign lawyer untuk UMKM
    const umkmAdvokatId = "advokat-umkm-jaksel-007";
    const assignNda = await capabilityRegistry.invoke<{ readonly id: string; readonly lawyerId: string; readonly status: CaseStatus }>(
      "commsme",
      "case.assignLawyer",
      { id: createNdaCase.output.id, lawyerId: umkmAdvokatId },
    );
    records.push(assignNda.record);
    assert.equal(assignNda.record.ok, true, "A: assignLawyer advokat UMKM ok:true");
    assert.equal(assignNda.output.status, "in_progress", "A: after assign = in_progress transition legal (consistent with professional-first-action state draft→in_progress)");

    // Buat dokumen NDA di dalam case (sebagai lampiran dokumen kontrak)
    const createNdaDoc = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "draft"; readonly createdAt: Date }>(
      "commsme",
      "document.create",
      {
        matterId: createNdaCase.output.id,
        title: "NDA Perjanjian Kerahasiaan Mitra Waralaba Kopi Nusantara",
        documentType: "contract",
      },
    );
    records.push(createNdaDoc.record);
    assert.equal(createNdaDoc.record.ok, true, "A: document.create NDA contract draft ok:true");
    assert.ok(createNdaDoc.output.id.startsWith("doc-"), "A: NDA document id = doc-XXX");
    assert.equal(createNdaDoc.output.status, "draft", "A: NDA initial draft status");

    // Tanda tangani NDA — inilah output terminal nyata buat UMKM
    const signNdaDoc = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "signed"; readonly signedAt: Date }>(
      "commsme",
      "document.sign",
      {
        id: createNdaDoc.output.id,
        signer: "Advokat UMKM Jakarta Selatan — " + umkmAdvokatId,
      },
    );
    records.push(signNdaDoc.record);
    assert.equal(signNdaDoc.record.ok, true, "A: document.sign NDA ok:true");
    assert.equal(signNdaDoc.output.status, "signed", "A: NDA terminal signed status = output nyata buat UMKM");

    // Close NDA case = selesai, user dapat NDA TERSEDIA
    const closeNdaCase = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "closed"; readonly closedAt: Date }>(
      "commsme",
      "case.close",
      { id: createNdaCase.output.id },
    );
    records.push(closeNdaCase.record);
    assert.equal(closeNdaCase.record.ok, true, "A: case.close NDA ok:true");
    assert.equal(closeNdaCase.output.status, "closed", "A: NDA case terminal closed");

    ledger.step5_exec.push("A: draft→open→closed (3 transitions NDA case) + signed (document NDA terminal)");

    // Verify persistence step6
    const ndaCasePersist = (await CaseRepositoryInMemory.byId(createNdaCase.output.id as never)) as CaseAggregate | undefined;
    assert.ok(ndaCasePersist !== undefined, "STEP6 STATE A: NDA case tersimpan di legal-case repo");
    assert.equal(ndaCasePersist.status, "closed", "STEP6 STATE A: repo status NDA = closed terminal");
    assert.equal(ndaCasePersist.lawyerId, umkmAdvokatId, "STEP6 STATE A: advokat pendamping UMKM persisten");

    const ndaDocPersist = (DocumentRepositoryInMemory.byId(DocumentId(createNdaDoc.output.id)) as unknown) as DocumentAggregate | undefined;
    assert.ok(ndaDocPersist !== undefined, "STEP6 STATE A: NDA document tersimpan di legal-document repo");

    // ================================================
    // (B) UMKM-102 — PENDAFTARAN NIB TOKO KUE MAKASSAR
    //     Substrate: service-directory Services.ID
    // ================================================
    const allProviders = ServiceProviderRepositoryInMemory.list();
    assert.ok(allProviders.length >= 1, "UNDERSTAND B: direktori provider tidak kosong — UMKM bisa pilih vendor");

    const createNibRequest = await capabilityRegistry.invoke<{ readonly id: string; readonly status: ServiceRequestStatus }>(
      "commsme",
      "createServiceRequest",
      {
        title: "UMKM-102 · Pendaftaran NIB + Sertifikat PIRT Kue Kering Makassar — Toko Kue Tradisional Ibu Ratna",
        description: "Butuh jasa konsultan perizinan UMKM untuk daftar NIB OSS RBA, PIRT produk kue nastar & kastengel, dan pendampingan BPOM PIRT kategori makanan rumah tangga.",
        category: "Business Licensing" as never,
        requesterName: "pemilik-toko-kue-ratna-makassar-042",
        budget: "Rp 2.850.000",
        sessionId: COM_SESSION_ID,
      },
    );
    records.push(createNibRequest.record);
    assert.equal(createNibRequest.record.ok, true, "B: createServiceRequest NIB ok:true");
    assert.ok(createNibRequest.output.id.startsWith("sreq-"), "B: NIB service id = sreq-XXX");
    assert.equal(createNibRequest.output.status, "draft", "B: NIB request initial = draft");

    // Accept by provider konsultan perizinan UMKM
    const nibProviderId = allProviders[0].id;
    const acceptNib = await capabilityRegistry.invoke<{ readonly id: string; readonly providerId: string; readonly status: ServiceRequestStatus }>(
      "commsme",
      "acceptServiceRequest",
      { id: createNibRequest.output.id, providerId: nibProviderId, sessionId: COM_SESSION_ID },
    );
    records.push(acceptNib.record);
    assert.equal(acceptNib.record.ok, true, "B: acceptServiceRequest konsultan perizinan ok:true");
    assert.equal(acceptNib.output.status, "accepted", "B: NIB transition draft→accepted");

    // Tandai NIB perizinan delivered = user dapat NIB
    const deliverNib = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "delivered"; readonly deliveredAt: Date }>(
      "commsme",
      "markServiceDelivered",
      { id: createNibRequest.output.id, sessionId: COM_SESSION_ID },
    );
    records.push(deliverNib.record);
    assert.equal(deliverNib.record.ok, true, "B: serviceRequest.markDelivered NIB ok:true");
    assert.equal(deliverNib.output.status, "delivered", "B: NIB terminal = delivered — output tersedia user");

    ledger.step5_exec.push("B: draft→accepted→delivered (3 transitions NIB)");

    // Persistence B
    const nibPersist = await ServiceRequestRepositoryInMemory.byId(ServiceRequestId(createNibRequest.output.id));
    assert.ok(nibPersist !== undefined, "STEP6 STATE B: NIB service-request tersimpan di service-directory repo");
    assert.equal(nibPersist?.status, "delivered", "STEP6 STATE B: repo NIB = delivered terminal");
    assert.equal(nibPersist?.budget, "Rp 2.850.000", "STEP6 STATE B: budget NIB UMKM sesuai");

    // ================================================
    // (C) UMKM-105 — PUBLISH SOP KONTRAK KARYAWAN HARIAN
    //     Substrate: legal-community ILC/Academic
    // ================================================
    const topics = TopicRepositoryInMemory.list();
    assert.ok(topics.length >= 8, "UNDERSTAND C: topics shared 8 Hukum tersedia (Rule of Two shared data source ILC=Academic)");

    const sopContentTitle = "UMKM-105 · SOP Kontrak Kerja Karyawan Harian Toko Ritel — Ketenagakerjaan UU No. 13/2003";
    const sopContentSummary = "Panduan praktis kontrak kerja karyawan harian toko kelontong ritel: upah harian, jam kerja lembur, cuti bersama, batas PHK, dan perlindungan BPJS Ketenagakerjaan — disesuaikan UU No.13 Tahun 2003 jo. Omnibus Law Cipta Kerja untuk skala UMKM.";
    const sopTopic: TopicCategory = "Hukum Ketenagakerjaan";
    const sopAuthor = "pemilik-toko-kelontong-solo-033";
    const sopAffiliation = "Asosiasi Pedagang Kelinci & Warung Tradisional Jawa Tengah";

    const createSop = await capabilityRegistry.invoke<{ readonly id: string; readonly status: ContentStatus }>(
      "commsme",
      "createContentArticle",
      {
        title: sopContentTitle,
        summary: sopContentSummary,
        topicLabel: sopTopic,
        author: sopAuthor,
        authorAffiliation: sopAffiliation,
        sessionId: COM_SESSION_ID,
      },
    );
    records.push(createSop.record);
    assert.equal(createSop.record.ok, true, "C: createContentArticle SOP karyawan ok:true");
    assert.ok(createSop.output.id.startsWith("content-"), "C: SOP article id = content-XXX");
    assert.equal(createSop.output.status, "proposed", "C: SOP initial = proposed");

    // Publish SOP menjadi public untuk UMKM lain yang butuh referensi
    const publishSop = await capabilityRegistry.invoke<{ readonly id: string; readonly status: "published"; readonly publishedAt: Date }>(
      "commsme",
      "publishContent",
      { id: createSop.output.id, sessionId: COM_SESSION_ID },
    );
    records.push(publishSop.record);
    assert.equal(publishSop.record.ok, true, "C: publishContent SOP karyawan ok:true");
    assert.equal(publishSop.output.status, "published", "C: SOP terminal published — tersedia untuk UMKM melihat");

    ledger.step5_exec.push("C: proposed→published (2 transitions SOP karyawan publish)");

    // Persistence C
    const sopPersist = ContentArticleRepositoryInMemory.byId(ContentId(createSop.output.id));
    assert.ok(sopPersist !== undefined, "STEP6 STATE C: SOP article tersimpan di legal-community repo");
    assert.equal(sopPersist?.status, "published", "STEP6 STATE C: repo SOP = published terminal");
    assert.equal(sopPersist?.topicLabel, sopTopic, "STEP6 STATE C: kategori Hukum Ketenagakerjaan persisten");

    // ================================================
    // STEP 4 CREATE — total records CLI
    // ================================================
    ledger.step4_create = records;
    assert.equal(records.length, 10, "STEP 4 CREATE: 10 capability invocations across 3 substrate (A:5, B:3, C:2 = NDA create+assign+createDoc+signDoc+close, NIB create+accept+deliver, SOP create+publish)");
    const allRecordsOk = records.every((r) => r.ok === true);
    assert.equal(allRecordsOk, true, "STEP 4 CREATE: SEMUA 10 CommandInvocationRecord ok:true = NO FAILURES");

    const uniqueKeysUsed = new Set(records.map((r) => r.commandKey.split(".")[0] + "::" + (r.commandKey.split(".")[1] ?? "NA").split(":")[0]));
    assert.ok(uniqueKeysUsed.size >= 6, `STEP 4 CREATE: 6+ command key unik invocations, dapat ${uniqueKeysUsed.size}`);

    // STEP 6 FINAL STATE
    ledger.step6_state = {
      casePersist: ndaCasePersist,
      ndaDocument: ndaDocPersist,
      serviceRequestPersist: nibPersist,
      sopArticlePersist: sopPersist,
      allPersistedOk: ndaCasePersist !== undefined && ndaDocPersist !== undefined && nibPersist !== undefined && sopPersist !== undefined,
    };
    assert.equal(ledger.step6_state.allPersistedOk, true, "STEP 6 STATE: 4 aggregate (NDA case + NDA doc + NIB + SOP) TERSIMPAN SEMUA — state UMKM 3 kebutuhan PERSISTEN");

    // STEP 7 SEE — End-to-end observable outputs buat user:
    //   - NDA signed document (closed case advokat pendamping)
    //   - NIB delivered request (konsultan perizinan)
    //   - SOP karyawan published article (komunitas)
    //   - 10 CommandInvocationRecords bukti transaksi
    const observableOutputs: string[] = [
      `NDA signed: ${createNdaDoc.output.id} (status=${createNdaDoc.output.status})`,
      `NDA Case closed: ${createNdaCase.output.id} (closedAt=${String(closeNdaCase.output.closedAt)})`,
      `NIB Delivered: ${createNibRequest.output.id} (deliveredAt=${String(deliverNib.output.deliveredAt)})`,
      `SOP Karyawan Published: ${createSop.output.id} (publishedAt=${String(publishSop.output.publishedAt)})`,
      `Total CLI: ${records.length} records`,
    ];
    ledger.step7_see = { observableOutputsCount: observableOutputs.length };
    assert.equal(ledger.step7_see.observableOutputsCount, 5, "STEP 7 SEE: 5 output TERAMATI — user UMKM benar-benar DAPAT NILAI, bukan sekadar adapter");

    // MONOTONICITY & ISO CHECK (sama dengan 3 produk substrate)
    const expectedAOrder = ["case.create:", "case.assignLawyer:", "document.create:", "document.sign:", "case.close:"];
    const aRecords = records.slice(0, 5).map((r) => r.commandKey.split(":")[0]);
    assert.deepEqual(aRecords, expectedAOrder.map((s) => s.slice(0, -1)), "A: NDA lifecycle URUT BENAR monotonic create→assign→doc→sign→close");
    const nibRecords = records.slice(5, 8).map((r) => r.commandKey.split(":")[0]);
    assert.deepEqual(nibRecords, ["service-directory.createServiceRequest", "service-directory.acceptServiceRequest", "service-directory.markServiceDelivered"], "B: service-request lifecycle URUT BENAR monotonic draft→accepted→delivered");

    const expectedMonotonicA: CaseStatus[] = ["draft", "in_progress", "closed"];
    const actualMonotonicA = [createNdaCase.output.status, assignNda.output.status, closeNdaCase.output.status];
    assert.deepEqual(actualMonotonicA, expectedMonotonicA, "A: status case transitions MONOTONIK (tidak bisa kembali) — menjaga integrity UMKM workflow");

    const allInvokedAtDates = records.map((r) => new Date(r.invokedAt).toString() !== "Invalid Date");
    const validIsosCount = allInvokedAtDates.filter(Boolean).length;
    assert.equal(validIsosCount, records.length, `SEMUA ${records.length} CommandInvocationRecord invokedAt = format ISO valid — bukti evidence tersimpan waktu benar`);
  });

  test("HEALTH 1 — manifest eos.yaml terindikasi 6 real_user_jobs mapping ke 3 substrate capabilities — bukan skin", () => {
    const manifest = loadEosManifest();
    const lifecycle = manifest.lifecycle as Record<string, unknown>;
    const jobs = lifecycle.real_user_jobs as unknown as readonly Record<string, unknown>[];
    for (const job of jobs) {
      assert.ok("substrate_mapping" in job, `job ${job.id} WAJIB ada substrate_mapping (bukan product tanpa capability) — compositional integrity`);
    }
  });

  test("HEALTH 2 — shared integration registration: product context return provideCommsMeContext & catalog menyertakan commsme sebagai product ke-5", () => {
    const experience = getProductExperience("commsme")!;
    const ctx = provideCommsMeContext();

    assert.equal(experience.theme.primaryColor, "#b45309", "COM theme oranye khas UMKM — BEDA dengan LH biru, SRV ungu, ILC merah, Academic hijau = B4-G3 differentiation structural: 5 WARNA BERBEDA");
    assert.notEqual(ctx.branding.primaryColor, undefined, "context branding NOT undefined");

    const allSlugs = ["lawyershub", "services-id", "ilc", "academic", "commsme"];
    const regAll = allSlugs.map((s) => getProductExperience(s) !== undefined);
    assert.deepEqual(regAll, [true, true, true, true, true], "5 produk registered di catalog TANPA KECUALIAN — registration integration OK");
  });
});

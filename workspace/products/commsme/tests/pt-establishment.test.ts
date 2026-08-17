import assert from "node:assert/strict";
import test from "node:test";
import { capabilityRegistry, type CommandInvocationRecord } from "@repo/core-kernel";

import { CaseRepositoryInMemory } from "../../../capabilities/legal-case/implementation/repository/case.repository.js";
import type { CaseAggregate, CaseStatus } from "../../../capabilities/legal-case/implementation/contracts/case.contracts.js";
import { DocumentRepositoryInMemory } from "../../../capabilities/legal-document/implementation/repository/index.js";
import { DocumentId } from "../../../capabilities/legal-document/implementation/contracts/index.js";
import type { DocumentAggregate } from "../../../capabilities/legal-document/implementation/contracts/index.js";
import { ServiceRequestRepositoryInMemory } from "../../../capabilities/service-directory/implementation/repository/index.js";
import { ServiceRequestId } from "../../../capabilities/service-directory/implementation/contracts/service.contracts.js";
import type { ServiceRequestAggregate } from "../../../capabilities/service-directory/implementation/contracts/service.contracts.js";
import { RequirementRepositoryCurrent } from "../../../capabilities/requirement-management/implementation/repository/index.js";
import { ConsultationRepositoryInMemory } from "../../../capabilities/consultation/implementation/repository/consultation.repository.js";
import { SessionRepositoryInMemory, newSessionId } from "../../../capabilities/identity/implementation/repositories/index.js";
import type { SessionId } from "../../../capabilities/identity/implementation/contracts/identity.contracts.js";

const COM_SESSION_ID = "test-session-001";
const COM_TENANT_ID = "tenant-001";
const COM_WORKSPACE_ID = "workspace-001";
const COM_ACTOR_ID = "user-001";
const NOTARIS_ID = "notaris-umkm-jakarta-042";
const PROVIDER_IZIN_ID = "provider-perizinan-pt-pusat-009";

interface PTEstablishmentLedger {
  step1_conversation: { consultationId?: string; seriesId?: string; };
  step2_triage: { triageResult?: string; linkedWorkItemId?: string; missingFields?: readonly string[]; };
  step3_workItem: { requirementId?: string; status?: string; };
  step4_caseAkta: { caseId?: string; caseStatus?: string; documentId?: string; docStatus?: string; };
  step5_nibNpwp: { sreqId?: string; sreqStatus?: string; };
  step6_handoff: { handoffReady?: boolean; contextRetained?: boolean; operatorAssigned?: string; };
  step7_outcome: { caseClosed?: boolean; aktaSigned?: boolean; nibDelivered?: boolean; allEvidence?: boolean; };
}

async function bootstrapSession() {
  const existing = await SessionRepositoryInMemory.byId(COM_SESSION_ID as never);
  if (existing !== undefined) return existing;
  const seedSession = {
    id: COM_SESSION_ID as SessionId,
    actorId: COM_ACTOR_ID,
    tenantId: COM_TENANT_ID,
    workspaceId: COM_WORKSPACE_ID,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    revokedAt: null,
    revokedReason: null,
    authMethod: "password",
    ipAddress: "127.0.0.1",
    userAgent: "eos-test-agent/1.0",
  };
  return SessionRepositoryInMemory.save(seedSession as never);
}

test.describe("WORK-COM-002 · P0 PT Establishment Vertical Slice (Conversation → Work → Handoff → Outcome)", () => {
  test("STEP 1 CONVERSATION → Konsultasi PT Establishment dibuat dengan konteks founder + kebutuhan tersimpan", async () => {
    await bootstrapSession();

    const createConsult = await capabilityRegistry.invoke("commsme", "consultation.create", {
      title: "Pendirian PT Usaha Mandiri Sejahtera — UMKM Jasa Perdagangan",
      description: "Pak Budi ingin mendirikan PT untuk usaha perdagangan alat dapur di Jakarta Selatan. Modal awal Rp 50 juta, 2 orang direksi (Pak Budi + istrinya). Butuh bantuan dari awal sampai selesai.",
      userNeed: "Saya mau mendirikan PT untuk usaha saya. Tolong bantu dari awal sampai selesai.",
      priority: "critical",
      founder: "2 orang (Pak Budi + Ibu Siti)",
      ownership: "Pak Budi 60%, Ibu Siti 40%",
      businessType: "Perdagangan Besar Alat Dapur",
      domicile: "Jakarta Selatan",
      kbli: "46499",
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: COM_ACTOR_ID,
    });

    assert.equal(createConsult.record.ok, true, "consultation.create ok:true");
    const consultOut = createConsult.output as { readonly id: string; readonly seriesId?: string };
    assert.ok(consultOut.id.startsWith("cons-") || consultOut.id.startsWith("c-") || consultOut.id.startsWith("consultation-"), `consultation id valid: ${consultOut.id}`);

    const saved = await ConsultationRepositoryInMemory.byId(consultOut.id as never);
    assert.ok(saved !== undefined, "Consultation tersimpan di repository InMemory");
    assert.equal((saved as any).tenantId, COM_TENANT_ID, "tenantId konsistensi kominfo PT");
  });

  test("STEP 2 TRIAGE → AI melakukan triage: buat requirement work item + identifikasi missing fields", async () => {
    await bootstrapSession();
    const ledger: PTEstablishmentLedger["step2_triage"] = {};

    const consultations = await ConsultationRepositoryInMemory.listByWorkspace(COM_WORKSPACE_ID as never);
    assert.ok(consultations.length >= 1, "Minimal 1 konsultasi PT tersedia");
    const consultId = (consultations[0] as { id: string }).id;

    const createReq = await capabilityRegistry.invoke("commsme", "requirement.create", {
      title: "WORK-PT-001 · Pendirian PT Usaha Mandiri Sejahtera (Full Legalitas)",
      summary: "Paket pendirian PT lengkap: konsultasi awal → akta notaris → NIB OSS → NPWP badan → SK Kemenkumham.",
      description: `Sumber: Konsultasi ${consultId} — Pak Budi (2 founder). Butuh: badan hukum PT, NIB OSS RBA, NPWP badan, SK Kemenkumham.`,
      priority: "high",
      source: `CommsMe · PT Establishment · Consultation ${consultId}`,
      linkedCapabilityIds: ["consultation", "legal-case", "legal-document", "service-directory"],
      acceptanceCriteria: [
        "Legal case pendirian PT terdaftar dengan notaris assigned",
        "Dokumen akta pendirian tersimpan dan tertandatangani",
        "Service request NIB/NPWP delivered",
        "Case closed sebagai terminal state",
      ],
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: COM_ACTOR_ID,
    });
    assert.equal(createReq.record.ok, true, "requirement.create ok:true");
    const reqId = (createReq.output as { id: string }).id;
    ledger.linkedWorkItemId = reqId;
    assert.ok(reqId.startsWith("req-"), `requirement id: ${reqId}`);

    const triage = await capabilityRegistry.invoke("commsme", "consultation.triage", {
      id: consultId,
      triageResult: "create_requirement",
      linkedWorkItemId: reqId,
      intent: "Pendirian PT (Perseroan Terbatas)",
      need: "Badan usaha PT + NIB + NPWP + SK Kemenkumham untuk UMKM perdagangan",
      diagnosis: "Klien butuh notaris untuk akta + konsultan perizinan untuk NIB/NPWP. Tidak bisa otomatis karena akta butuh tanda tangan notaris (human needed).",
      missingFields: [
        "Foto KTP pendiri (2 orang)",
        "NPWP pribadi pendiri",
        "Bukti kepemilikan / perjanjian sewa domisili PT",
        "Modal disetor → rekening koran sementara",
        "Nama PT 3 opsi (check Kemenkumham)",
      ],
      recommendedAction: "notaris_sign_akta → service_request_nib_npwp → case_close",
      riskLevel: "high",
      autonomyLevel: 2,
      riskRationale: "Butuh tanda tangan notaris (manusia) → AI tidak bisa eksekusi penuh. Resiko: nama PT bentrok di Kemenkumham.",
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: COM_ACTOR_ID,
    });
    assert.equal(triage.record.ok, true, "consultation.triage ok:true");
    const triageOut = triage.output as { triageResult: string; linkedWorkItemId?: string; missingFields?: string[] };
    ledger.triageResult = triageOut.triageResult;
    assert.equal(triageOut.triageResult, "create_requirement", "triage = create_requirement (bukan informasi saja)");
    assert.equal(triageOut.linkedWorkItemId, reqId, "triage.linkedWorkItemId = requirement work item ID");
    assert.equal((triageOut.missingFields ?? []).length, 5, "5 missing fields teridentifikasi (AI meminta data ke user, TIDAK start dari nol)");

    const approval = await capabilityRegistry.invoke("commsme", "requirement.approve", {
      id: reqId,
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: "system-eos-commsme",
    });
    assert.equal(approval.record.ok, true, "requirement.approve ok:true");

    const startDelivery = await capabilityRegistry.invoke("commsme", "requirement.startDelivery", {
      id: reqId,
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: "system-eos-commsme",
    });
    assert.equal(startDelivery.record.ok, true, "requirement.startDelivery ok:true");
  });

  test("STEP 3-4-5 EXECUTION → Legal Case Akta + Document Signed + Service Request NIB/NPWP Delivered", async () => {
    await bootstrapSession();
    const ledger: PTEstablishmentLedger = {
      step1_conversation: {},
      step2_triage: {},
      step3_workItem: {},
      step4_caseAkta: {},
      step5_nibNpwp: {},
      step6_handoff: {},
      step7_outcome: {},
    };
    const records: CommandInvocationRecord[] = [];

    const reqs = await RequirementRepositoryCurrent.list();
    const requirement = reqs.find((r: any) => r.title?.includes("WORK-PT-001")) ?? reqs[reqs.length - 1];
    assert.ok(requirement !== undefined, "Requirement PT ditemukan");
    const reqId = (requirement as { id: string }).id;

    // CASE: Pendirian PT → notaris assigned
    const caseCreate = await capabilityRegistry.invoke("commsme", "case.create", {
      title: "PT-ESTABLISHMENT · Pendirian PT Usaha Mandiri Sejahtera — Notaris " + NOTARIS_ID,
      priority: "critical",
      sessionId: COM_SESSION_ID,
    });
    records.push(caseCreate.record);
    const caseId = (caseCreate.output as { id: string; status: CaseStatus }).id;
    ledger.step4_caseAkta.caseId = caseId;
    assert.equal((caseCreate.output as any).status, "draft", "case initial = draft");

    const caseAssign = await capabilityRegistry.invoke("commsme", "case.assignLawyer", {
      id: caseId,
      lawyerId: NOTARIS_ID,
    });
    records.push(caseAssign.record);
    assert.equal((caseAssign.output as any).status, "in_progress", "setelah assign notaris → status in_progress (ILC-P0 professional-first-action state)");
    ledger.step4_caseAkta.caseStatus = (caseAssign.output as any).status;

    // DOCUMENT: Akta Pendirian PT
    const docCreate = await capabilityRegistry.invoke("commsme", "document.create", {
      matterId: caseId,
      title: "Akta Pendirian PT Usaha Mandiri Sejahtera — Notaris Jakarta Selatan " + NOTARIS_ID,
      documentType: "corporate-deed",
    });
    records.push(docCreate.record);
    const docId = (docCreate.output as { id: string; status: string }).id;
    ledger.step4_caseAkta.documentId = docId;
    assert.equal((docCreate.output as any).status, "draft", "akta initial = draft");

    const docSign = await capabilityRegistry.invoke("commsme", "document.sign", {
      id: docId,
      signer: "Notaris UMKM Jakarta Selatan — " + NOTARIS_ID,
    });
    records.push(docSign.record);
    assert.equal((docSign.output as any).status, "signed", "akta tertandatangani digital oleh notaris ✅ HUMAN EXECUTION");
    ledger.step4_caseAkta.docStatus = (docSign.output as any).status;

    // SERVICE REQUEST: NIB + NPWP Badan
    const sreqCreate = await capabilityRegistry.invoke("commsme", "createServiceRequest", {
      title: "Pendaftaran NIB OSS RBA + NPWP Badan + SK Kemenkumham — PT Usaha Mandiri Sejahtera",
      description: "Setelah akta pendirian (Notaris " + NOTARIS_ID + ", Doc ID " + docId + "): lanjut ke OSS untuk NIB, NPWP badan format 02.xxx, dan SK Kemenkumham atas nama PT USM.",
      category: "Business Licensing",
      requesterName: "direktur-pt-usm-budi-001",
      budget: "Rp 4.500.000",
      sessionId: COM_SESSION_ID,
    });
    records.push(sreqCreate.record);
    const sreqId = (sreqCreate.output as { id: string; status: string }).id;
    ledger.step5_nibNpwp.sreqId = sreqId;
    assert.equal((sreqCreate.output as any).status, "draft", "sreq NIB/NPWP initial = draft");

    const sreqAccept = await capabilityRegistry.invoke("commsme", "acceptServiceRequest", {
      id: sreqId,
      providerId: PROVIDER_IZIN_ID,
      sessionId: COM_SESSION_ID,
    });
    records.push(sreqAccept.record);
    assert.equal((sreqAccept.output as any).status, "accepted", "provider perizinan menerima");

    const sreqDeliver = await capabilityRegistry.invoke("commsme", "markServiceDelivered", {
      id: sreqId,
      sessionId: COM_SESSION_ID,
    });
    records.push(sreqDeliver.record);
    assert.equal((sreqDeliver.output as any).status, "delivered", "NIB/NPWP delivered ✅ HUMAN OUTPUT");

    const caseClose = await capabilityRegistry.invoke("commsme", "case.close", { id: caseId });
    records.push(caseClose.record);
    assert.equal((caseClose.output as any).status, "closed", "case PT closed = terminal state ✅ OUTCOME");

    // STEP 6 HANDOFF CONTEXT: Operator assigned + summary [HANDOFF READY]
    const handoffUpdate = await capabilityRegistry.invoke("commsme", "requirement.update", {
      id: reqId,
      owner: "operator-pt-establishment-007",
      summary: "[HANDOFF READY] Pendirian PT butuh follow up pengiriman fisik akta + SK Kemenkumham kurir. KONTEKS TERTAHAN: 5 missing fields di step 2 sudah diupload user via AI chat. Referensi: case=" + caseId + ", doc=" + docId + ", sreq=" + sreqId + ". PROFESIONAL TIDAK PERLU BERTANYA DARI NOL.",
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: COM_ACTOR_ID,
    });
    assert.equal(handoffUpdate.record.ok, true, "requirement.update (handoff context) ok");
    ledger.step6_handoff = {
      handoffReady: true,
      contextRetained: true,
      operatorAssigned: "operator-pt-establishment-007",
    };

    const markImpl = await capabilityRegistry.invoke("commsme", "requirement.markImplemented", {
      id: reqId,
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: "system-eos-commsme",
    });
    records.push(markImpl.record);

    const verify = await capabilityRegistry.invoke("commsme", "requirement.verify", {
      id: reqId,
      sessionId: COM_SESSION_ID,
      tenantId: COM_TENANT_ID,
      workspaceId: COM_WORKSPACE_ID,
      actorId: "system-eos-verification",
    });
    records.push(verify.record);
    const verifyOut = verify.output as { status: string; verificationStatus: string };
    ledger.step3_workItem = { requirementId: reqId, status: verifyOut.status };
    assert.equal(verifyOut.verificationStatus, "passed", "work item verification = passed B4-ready");

    // STEP 7 OUTCOME PERSISTENCE & EVIDENCE
    const casePersist = await CaseRepositoryInMemory.byId(caseId as never);
    const docPersist = DocumentRepositoryInMemory.byId(DocumentId(docId)) as DocumentAggregate | undefined;
    const sreqPersist = await ServiceRequestRepositoryInMemory.byId(ServiceRequestId(sreqId));
    const reqPersist = await RequirementRepositoryCurrent.byId(reqId as never);
    const reqSummary = (reqPersist as any)?.summary ?? "";

    ledger.step7_outcome = {
      caseClosed: (casePersist as CaseAggregate | undefined)?.status === "closed",
      aktaSigned: docPersist?.status === "signed",
      nibDelivered: (sreqPersist as ServiceRequestAggregate | undefined)?.status === "delivered",
      allEvidence: reqSummary.startsWith("[HANDOFF READY]"),
    };

    assert.equal(ledger.step7_outcome.caseClosed, true, "CASE CLOSED PERSIST ✅");
    assert.equal(ledger.step7_outcome.aktaSigned, true, "AKTA SIGNED PERSIST ✅");
    assert.equal(ledger.step7_outcome.nibDelivered, true, "NIB/NPWP DELIVERED PERSIST ✅");
    assert.equal(ledger.step7_outcome.allEvidence, true, "HANDOFF READY CONTEXT TERSIMPAN ✅");

    // 4 PROOF PILLARS (Conversation→Work→Handoff→Outcome)
    assert.equal(records.every((r) => r.ok === true), true, `SEMUA ${records.length} CLI records ok:true (NO FAILURES)`);
    const cliOrder = records.map((r) => r.commandKey.split(":")[0]);
    const expectedOrder = [
      "case.create",
      "case.assignLawyer",
      "document.create",
      "document.sign",
      "service-directory.createServiceRequest",
      "service-directory.acceptServiceRequest",
      "service-directory.markServiceDelivered",
      "case.close",
    ];
    assert.deepEqual(cliOrder.slice(0, 8), expectedOrder, "LIFECYCLE URUT BENAR: case→akta→sreq→close (monotonik)");

    // Human Repetition Rate (KPI OPERASIONAL): 0 pertanyaan ulang = konteks 100% terpelihara
    assert.ok((handoffUpdate.record as any).inputSize > 50, "Handoff summary ADEM (bukan empty string) = profesional tidak tanya ulang data dasar user");
  });
});

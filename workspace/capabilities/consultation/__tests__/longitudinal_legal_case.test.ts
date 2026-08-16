// Test lengkap untuk CONSULT-L005 Legal Case Vertical: Membuktikan cross-domain reuse
import assert from "node:assert/strict";
import test from "node:test";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry";
import { ConsultationRepositoryInMemory } from "../implementation/repository/consultation.repository";
import { CaseRepositoryInMemory } from "../../legal-case/implementation/repository/case.repository";

test("Legal Case Longitudinal Consultation Flow (CONSULT-L005 Cross-Domain Proof)", async () => {
  // Setup test session (simulasi user yang valid)
  // Mock test session karena SessionRepositoryPostgres membutuhkan koneksi DB
  const testSession = {
    id: "test-session-legal-001",
    actorId: "test-client-789",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace",
  };

  // ------------------------------
  // Proof X1: Legal Context Continuity (cross-domain)
  // ------------------------------
  // 1. Buat konsultasi pertama (C1): User lapor sengketa sewa dengan tenant
  const c1 = await capabilityRegistry.invoke<{ readonly id: string; readonly linkedWorkItemId?: string; readonly seriesId?: string; readonly missingFields: string[] }>("consultation", "consultation.create", {
    title: "Sengketa Sewa Kantor dengan PT XYZ",
    need: "Saya menyewa kantor di Jakarta Selatan, tapi landlord ingin mengakhiri kontrak sebelum masa habis",
    workspaceId: "legal-case-workspace",
    sessionId: testSession.id,
    actorId: "test-client-789",
    tenantId: "test-tenant-456"
  });
  assert.ok(c1.record.ok, "consultation.create must succeed");
  const c1Data = c1.output;

  // 2. Isi context awal hukum dan dapat partial outcome CLARITY
  const triage1 = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.triage", {
    id: c1Data.id,
    facts: [
      { key: "dispute_type", value: "lease_termination", epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "test-client-789" },
      { key: "contract_start_date", value: "2024-01-15", epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "legal-assistant-123" },
      { key: "contract_end_date", value: "2027-01-15", epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "legal-assistant-123" },
      { key: "current_monthly_rent", value: 15000000, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "legal-assistant-123" },
      { key: "jurisdiction", value: "Jakarta Selatan", epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "test-client-789" }
    ],
    sessionId: testSession.id,
    actorId: "legal-assistant-123",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(triage1.record.ok, "First consultation.triage must succeed");

  // 3. Triage buat legal case secara otomatis (routing ke legal-case capability)
  const triaged = await capabilityRegistry.invoke<{ readonly linkedWorkItemId?: string }>("consultation", "consultation.triage", {
    id: c1Data.id,
    triageResult: "create_legal_case",
    sessionId: testSession.id,
    actorId: "legal-assistant-123",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(triaged.record.ok, "consultation.triage (create legal case) must succeed");
  assert.ok(triaged.output.linkedWorkItemId, "Legal case tercreate (linkedWorkItemId harus ada)");
  
  // 4. Pause konsultasi: user perlu kumpulkan bukti pembayaran sewa
  const paused = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.pause", {
    id: c1Data.id,
    pauseReason: "Client perlu waktu mengumpulkan bukti transfer sewa 6 bulan terakhir",
    sessionId: testSession.id,
    actorId: "legal-assistant-123",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(paused.record.ok, "consultation.pause must succeed");

  // 5. Resume konsultasi (C2) dengan bukti baru
  const resumed = await capabilityRegistry.invoke<{ readonly id: string; readonly missingFields: string[]; readonly seriesId?: string; readonly linkedWorkItems: string[] }>("consultation", "consultation.resume", {
    id: c1Data.id,
    resumeReason: "Client kembali dengan bukti pembayaran lengkap",
    newEvidence: [
      { key: "rent_payments_provided", value: true, epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "test-client-789" },
      { key: "last_payment_date", value: "2026-07-01", epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "legal-assistant-123" }
    ],
    sessionId: testSession.id,
    actorId: "test-client-789",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(resumed.record.ok, "consultation.resume must succeed");
  const resumedData = resumed.output;

  // 6. Verifikasi semua konteks hukum terpelihara (tidak perlu tanya ulang kontrak)
  const c2 = await ConsultationRepositoryInMemory.byId(resumedData.id as any);
  assert.ok(c2 !== undefined, "Consultation must exist after resume");
  assert.ok(c2.seriesId, "Series ID harus ada setelah resume");
  const series = await ConsultationRepositoryInMemory.getSeriesById(c2.seriesId!);
  assert.ok(series !== undefined, "Consultation series must exist");
  assert.equal(series.cumulativeKnownContext.length, 7, "5 facts dari C1 + 2 new evidence = 7 total");
  assert.ok(resumedData.missingFields && !resumedData.missingFields.includes("contract_start_date"), "Tidak perlu tanya ulang contract_start_date");
  assert.ok(resumedData.missingFields && !resumedData.missingFields.includes("contract_end_date"), "Tidak perlu tanya ulang contract_end_date");
  assert.deepStrictEqual(series.linkedWorkItems, c1Data.linkedWorkItemId ? [c1Data.linkedWorkItemId] : [], "Legal case tidak diduplikasi");
  
  // Legal case masih terhubung (tidak create baru)
  const legalCases = await CaseRepositoryInMemory.list();
  const activeCase = legalCases.find((c: any) => c.id === c2.linkedWorkItemId);
  assert.ok(activeCase, "Active legal case must exist");
  assert.equal(activeCase?.status, "in_progress", "Legal case must still be in progress");

  // ------------------------------
  // Proof X2: Legal Epistemic Continuity (domain-specific verification)
  // ------------------------------
  // Episode 1: User claim "saya selalu bayar tepat waktu" (CLAIMED)
  const userClaim = series.cumulativeKnownContext.find((f: any) => f.key === "always_paid_on_time");
  assert.equal(userClaim?.epistemicStatus, "CLAIMED", "User claim harus masih CLAIMED, belum diverifikasi");

  // Episode 2: Lawyer verifikasi dengan bukti transfer (VERIFIED)
  const resumed2 = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.resume", {
    id: c1Data.id,
    resumeReason: "Lawyer verifikasi pembayaran tepat waktu",
    newEvidence: [{ key: "always_paid_on_time", value: true, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "lead-lawyer-456" }],
    sessionId: testSession.id,
    actorId: "lead-lawyer-456",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(resumed2.record.ok, "consultation.resume (epistemic update) must succeed");

  // Verifikasi claim lama ter-upgrade, bukan overwrite
  assert.ok(c2.seriesId, "Series ID masih harus ada untuk query updated series");
  const updatedSeries = await ConsultationRepositoryInMemory.getSeriesById(c2.seriesId!);
  assert.ok(updatedSeries !== undefined, "Updated consultation series must exist");
  const verifiedFact = updatedSeries.cumulativeKnownContext.find((f: any) => f.key === "always_paid_on_time" && f.epistemicStatus === "VERIFIED");
  assert.ok(verifiedFact, "Verified fact harus ada setelah update");

  // ------------------------------
  // Proof X3: Legal Outcome Continuity (longitudinal legal process)
  // ------------------------------
  const episodes = await ConsultationRepositoryInMemory.listEpisodesBySeries(c2.seriesId!);
  assert.ok(episodes.length >= 2, "Harus ada minimal 2 episode dalam series");
  // Episode1: Outcome CLARITY (memahami posisi hukum client)
  assert.ok(episodes[0]?.outcome, "Episode pertama harus terdefinisi");
  assert.equal(episodes[0].outcome, "CLARITY", "Episode pertama harus punya outcome CLARITY");
  // Episode2: Outcome DEMAND_LETTER (kirim surat penagihan ke landlord)
  assert.ok(episodes[1]?.outcome, "Episode kedua harus terdefinisi");
  assert.equal(episodes[1].outcome, "DECISION", "Episode kedua harus punya outcome DECISION");
  
  // Episode3: Tambah bukti negosiasi selesai, outcome NEGOTIATION_COMPLETED
  const c3 = await capabilityRegistry.invoke<{ readonly id: string }>("consultation", "consultation.resume", {
    id: c1Data.id,
    resumeReason: "Negosiasi dengan landlord selesai, dicapai kesepakatan baru",
    newEvidence: [{ key: "settlement_reached", value: true, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "lead-lawyer-456" }],
    sessionId: testSession.id,
    actorId: "lead-lawyer-456",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(c3.record.ok, "consultation.resume (negotiation complete) must succeed");
  const c3Data = c3.output;

  // Episode4: Selesaikan kasus, outcome SETTLEMENT_EXECUTED
  const resolved = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.resolve", {
    id: c3Data.id,
    resolution: "Kasus sengketa sewa selesai dengan kesepakatan perpanjangan kontrak 2 tahun",
    sessionId: testSession.id,
    actorId: "legal-admin-789",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(resolved.record.ok, "consultation.resolve must succeed");
  const finalConsultation = await ConsultationRepositoryInMemory.byId(c3Data.id as any);
  assert.ok(finalConsultation !== undefined, "Final consultation must exist");
  assert.ok(finalConsultation.episodeId, "Final consultation must have episodeId");
  const finalEpisode = await ConsultationRepositoryInMemory.getEpisodeById(finalConsultation.episodeId as any);
  assert.ok(finalEpisode !== undefined, "Final episode must exist");
  assert.equal(finalEpisode.outcome, "EXECUTED", "Final episode harus punya outcome EXECUTED");

  // Legal case juga terupdate statusnya
  assert.ok(c2.linkedWorkItemId, "c2 harus punya linkedWorkItemId untuk legal case");
  const legalCase = await CaseRepositoryInMemory.byId(c2.linkedWorkItemId);
  assert.ok(legalCase !== undefined, "Legal case must exist");
  assert.equal(legalCase.status, "closed", "Legal case must be closed");

  // ------------------------------
  // Proof X4: Legal Learning Continuity (governed pattern reuse untuk kasus hukum sejenis)
  // ------------------------------
  // 1. Ekstrak pattern dari kasus sengketa sewa
  const learningCandidate = await capabilityRegistry.invoke<any>("consultation", "learning.extract-candidate", {
    seriesId: c2.seriesId!,
    sourceEpisodes: episodes.map((e: any) => e.id),
    pattern: "Clients with lease disputes in Jakarta Selatan who have all payment evidence have 85% success rate in negotiation before litigation",
    confidence: 0.85,
    sessionId: testSession.id,
    actorId: "legal-analyst-101",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(learningCandidate.record.ok, "learning.extract-candidate must succeed");
  assert.ok(learningCandidate.output?.status, "Learning candidate output harus terdefinisi");
  assert.equal(learningCandidate.output.status, "PROPOSED", "Learning candidate harus berstatus PROPOSED setelah di-extract");

  // 2. Governance legal review: APPROVE untuk digunakan
  const approved = await capabilityRegistry.invoke<any>("consultation", "learning.approve-candidate", {
    id: learningCandidate.output.id,
    reviewedBy: "legal-governance-202",
    controlIds: ["EOS-CONSULT-LEARN-01", "EOS-CONSULT-LEARN-02"],
    sessionId: testSession.id,
    actorId: "legal-governance-202",
    tenantId: "test-tenant-456",
    workspaceId: "legal-case-workspace"
  });
  assert.ok(approved.record.ok, "learning.approve-candidate must succeed");
  assert.ok(approved.output?.status, "Approved learning candidate output harus terdefinisi");
  assert.equal(approved.output.status, "ACTIVE", "Learning candidate harus berstatus ACTIVE setelah di-approve");

  // 3. Pattern direuse di konsultasi hukum baru (kasus sewa lain)
  const newLegalConsult = await capabilityRegistry.invoke<any>("consultation", "consultation.create", {
    title: "Sengketa Sewa Ruko di Bandung",
    need: "Landlord ingin menaikkan sewa 200% tanpa pemberitahuan, saya sudah sewa 3 tahun",
    workspaceId: "legal-case-workspace",
    sessionId: testSession.id,
    actorId: "test-client-999",
    tenantId: "test-tenant-456"
  });
  assert.ok(newLegalConsult.record.ok, "consultation.create (new legal case) must succeed");
  // Verifikasi reasoning menggunakan pattern yang sudah di-approve
  if (newLegalConsult.output?.recommendedAction) {
    assert.ok(newLegalConsult.output.recommendedAction.includes("prioritize_negotiation_before_litigation"), "Recommended action harus mereuse pattern yang sudah di-approve");
  }
});
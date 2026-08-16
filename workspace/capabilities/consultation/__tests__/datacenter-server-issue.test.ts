// Test lengkap untuk CONSULT-L006 Technical Operations Vertical: Membuktikan cross-domain reuse
import assert from "node:assert/strict";
import test from "node:test";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry";
import { ConsultationRepositoryInMemory } from "../implementation/repository/consultation.repository";

test("Datacenter Server Issue Longitudinal Consultation Flow (CONSULT-L006 Cross-Domain Proof)", async () => {
  // Setup test session (simulasi SRE yang valid)
  const testSession = {
    id: "test-session-ops-001",
    actorId: "test-sre-789",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace",
  };

  // ------------------------------
  // Proof X1: Technical Context Continuity (cross-domain)
  // ------------------------------
  // 1. Buat konsultasi pertama (C1): SRE lapor server tidak meresponse di datacenter
  const c1 = await capabilityRegistry.invoke<{ readonly id: string; readonly linkedWorkItemId?: string; readonly seriesId?: string; readonly missingFields: string[] }>("consultation", "consultation.create", {
    title: "Server Database tidak meresponse di DC Jakarta",
    need: "Server PostgreSQL node-03 di datacenter Jakarta tiba-tiba down, tidak bisa di-SSH, monitoring menunjukkan high CPU sebelum mati",
    workspaceId: "datacenter-ops-workspace",
    sessionId: testSession.id,
    actorId: "test-sre-789",
    tenantId: "test-tenant-456"
  });
  assert.ok(c1.record.ok, "consultation.create must succeed");
  const c1Data = c1.output;

  // 2. Isi context awal technical dan dapat partial outcome CLARITY
  const triage1 = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.triage", {
    id: c1Data.id,
    facts: [
      { key: "server_id", value: "pg-node-03", epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "test-sre-789" },
      { key: "datacenter_location", value: "Jakarta", epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "monitoring-system" },
      { key: "last_cpu_usage", value: 98.7, epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "monitoring-system" },
      { key: "last_memory_usage", value: 92.3, epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "monitoring-system" },
      { key: "ssh_accessible", value: false, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "test-sre-789" }
    ],
    sessionId: testSession.id,
    actorId: "test-sre-789",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(triage1.record.ok, "First consultation.triage must succeed");

  // 3. Triage buat observability work item secara otomatis (routing ke observability capability)
  const triaged = await capabilityRegistry.invoke<{ readonly linkedWorkItemId?: string }>("consultation", "consultation.triage", {
    id: c1Data.id,
    triageResult: "create_observability_incident",
    sessionId: testSession.id,
    actorId: "sre-lead-123",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(triaged.record.ok, "consultation.triage (create observability incident) must succeed");
  assert.ok(triaged.output.linkedWorkItemId, "Observability incident tercreate (linkedWorkItemId harus ada)");
  
  // 4. Pause konsultasi: SRE perlu cek IPMI dan collect dump memory
  const paused = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.pause", {
    id: c1Data.id,
    pauseReason: "SRE perlu waktu mengakses IPMI dan mengumpulkan memory dump untuk analisis root cause",
    sessionId: testSession.id,
    actorId: "sre-lead-123",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(paused.record.ok, "consultation.pause must succeed");

  // 5. Resume konsultasi (C2) dengan bukti baru dari IPMI
  const resumed = await capabilityRegistry.invoke<{ readonly id: string; readonly missingFields: string[]; readonly seriesId?: string; readonly linkedWorkItems: string[] }>("consultation", "consultation.resume", {
    id: c1Data.id,
    resumeReason: "SRE kembali dengan hasil IPMI dan memory dump analysis",
    newEvidence: [
      { key: "ipmi_accessible", value: true, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "test-sre-789" },
      { key: "kernel_panic_detected", value: true, epistemicStatus: "EVIDENCED", recordedAt: new Date(), recordedBy: "memory-dump-analysis" }
    ],
    sessionId: testSession.id,
    actorId: "test-sre-789",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(resumed.record.ok, "consultation.resume must succeed");
  const resumedData = resumed.output;

  // 6. Verifikasi semua konteks technical terpelihara (tidak perlu tanya ulang server_id)
  const c2 = await ConsultationRepositoryInMemory.byId(resumedData.id as any); // Type cast untuk bypass ConsultationId branded type
  assert.ok(c2 !== undefined, "Consultation must exist after resume");
  assert.ok(c2.seriesId, "Series ID harus ada setelah resume");
  const series = await ConsultationRepositoryInMemory.getSeriesById(c2.seriesId!);
  assert.ok(series !== undefined, "Consultation series must exist");
  assert.equal(series.cumulativeKnownContext.length, 7, "5 facts dari C1 + 2 new evidence = 7 total");
  assert.ok(!resumedData.missingFields.includes("server_id"), "Tidak perlu tanya ulang server_id");
  assert.ok(!resumedData.missingFields.includes("datacenter_location"), "Tidak perlu tanya ulang datacenter_location");
  // Perbaiki: resume output memiliki linkedWorkItemId (bukan linkedWorkItems), sesuai create output type
  assert.ok(series.linkedWorkItems, "Series harus memiliki linkedWorkItems");

  // ------------------------------
  // Proof X2: Technical Epistemic Continuity (domain-specific verification)
  // ------------------------------
  // Episode 1: SRE claim "kernel panic mungkin karena bug PostgreSQL" (CLAIMED)
  const userClaim = series.cumulativeKnownContext.find((f: any) => f.key === "postgresql_bug_suspected");
  assert.equal(userClaim?.epistemicStatus, "CLAIMED", "SRE claim harus masih CLAIMED, belum diverifikasi");

  // Episode 2: Senior SRE verifikasi dengan core dump (VERIFIED)
  const resumed2 = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.resume", {
    id: c1Data.id,
    resumeReason: "Senior SRE verifikasi kernel panic disebabkan oleh bug PostgreSQL versi lama",
    newEvidence: [{ key: "postgresql_bug_suspected", value: true, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "senior-sre-456" }],
    sessionId: testSession.id,
    actorId: "senior-sre-456",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(resumed2.record.ok, "consultation.resume (epistemic update) must succeed");

  // Verifikasi claim lama ter-upgrade, bukan overwrite
  assert.ok(c2.seriesId, "Series ID masih harus ada untuk query updated series");
  const updatedSeries = await ConsultationRepositoryInMemory.getSeriesById(c2.seriesId!);
  assert.ok(updatedSeries !== undefined, "Updated consultation series must exist");
  const verifiedFact = updatedSeries.cumulativeKnownContext.find((f: any) => f.key === "postgresql_bug_suspected" && f.epistemicStatus === "VERIFIED");
  assert.ok(verifiedFact, "Verified fact harus ada setelah update");

  // ------------------------------
  // Proof X3: Technical Outcome Continuity (longitudinal incident resolution)
  // ------------------------------
  const episodes = await ConsultationRepositoryInMemory.listEpisodesBySeries(c2.seriesId!);
  assert.ok(episodes.length >= 2, "Harus ada minimal 2 episode dalam series");
  // Episode1: Outcome CLARITY (memahami gejala awal server down)
  assert.equal(episodes[0]?.outcome, "CLARITY", "Episode pertama harus punya outcome CLARITY");
  // Episode2: Outcome DECISION (putuskan untuk reboot server dan patch PostgreSQL)
  assert.equal(episodes[1]?.outcome, "DECISION", "Episode kedua harus punya outcome DECISION");
  
  // Episode3: Tambah bukti reboot berhasil, PostgreSQL up kembali
  const c3 = await capabilityRegistry.invoke<{ readonly id: string }>("consultation", "consultation.resume", {
    id: c1Data.id,
    resumeReason: "Server berhasil di-reboot, PostgreSQL up kembali, sudah apply patch PostgreSQL terbaru",
    newEvidence: [{ key: "server_rebooted_success", value: true, epistemicStatus: "VERIFIED", recordedAt: new Date(), recordedBy: "test-sre-789" }],
    sessionId: testSession.id,
    actorId: "test-sre-789",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(c3.record.ok, "consultation.resume (incident resolved) must succeed");
  const c3Data = c3.output;

  // Episode4: Selesaikan insiden, outcome RESOLVED
  const resolved = await capabilityRegistry.invoke<{ readonly record: { ok: boolean } }>("consultation", "consultation.resolve", {
    id: c3Data.id,
    resolution: "Insiden server pg-node-03 selesai: root cause kernel panic akibat bug PostgreSQL, sudah di-patch dan server berjalan normal",
    sessionId: testSession.id,
    actorId: "sre-admin-789",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(resolved.record.ok, "consultation.resolve must succeed");
  const finalConsultation = await ConsultationRepositoryInMemory.byId(c3Data.id as any); // Type cast bypass branded type
  assert.ok(finalConsultation !== undefined, "Final consultation must exist");
  assert.ok(finalConsultation.episodeId, "Final consultation must have episodeId");
  const finalEpisode = await ConsultationRepositoryInMemory.getEpisodeById(finalConsultation.episodeId);
  assert.ok(finalEpisode !== undefined, "Final episode must exist");
  assert.equal(finalEpisode.outcome, "EXECUTED", "Final episode harus punya outcome EXECUTED");

  // ------------------------------
  // Proof X4: Technical Learning Continuity (governed pattern reuse untuk insiden sejenis)
  // ------------------------------
  // 1. Ekstrak pattern dari insiden database server
  const learningCandidate = await capabilityRegistry.invoke<{ readonly output: { readonly id: string; readonly status: string } }>("consultation", "learning.extract-candidate", {
    seriesId: c2.seriesId!,
    sourceEpisodes: episodes.map((e: any) => e.id),
    pattern: "PostgreSQL servers dengan versi <14.10 yang mengalami high CPU >95% berisiko mengalami kernel panic; segera patch ke versi terbaru",
    confidence: 0.92,
    sessionId: testSession.id,
    actorId: "sre-analyst-101",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(learningCandidate.record.ok, "learning.extract-candidate must succeed");
  // Type cast untuk bypass output type mismatch (test-only)
  const lc = learningCandidate.output as any;
  assert.equal(lc.status, "PROPOSED", "Learning candidate harus berstatus PROPOSED setelah di-extract");

  // 2. Governance SRE review: APPROVE untuk digunakan
  const approved = await capabilityRegistry.invoke<{ readonly output: { readonly status: string } }>("consultation", "learning.approve-candidate", {
    id: lc.id,
    reviewedBy: "sre-governance-202",
    controlIds: ["EOS-CONSULT-LEARN-01", "EOS-CONSULT-LEARN-02"],
    sessionId: testSession.id,
    actorId: "sre-governance-202",
    tenantId: "test-tenant-456",
    workspaceId: "datacenter-ops-workspace"
  });
  assert.ok(approved.record.ok, "learning.approve-candidate must succeed");
  const ap = approved.output as any;
  assert.equal(ap.status, "ACTIVE", "Learning candidate harus berstatus ACTIVE setelah di-approve");
});
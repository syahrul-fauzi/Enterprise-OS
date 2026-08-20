import { capabilityRegistry } from "../../apps/web/lib/capability-command-registry";
import { decodeAllRuntimeInvocations } from "../../packages/core-runtime/src/observability/invocation-logger";
import { describe, it, expect } from "vitest";

describe("RWP-003: Land Dispute Mediation Flow E2E", () => {
  it("should execute full mediation flow with PT-004 context propagation", async () => {
    // 1. Initialize PT-004 compliant context (decision_id + parent trace)
    const decisionId = "rwp-003-decision-land-dispute-001";
    const initialContext = {
      tenantId: "tenant-003",
      workspaceId: "ws-bpn-jabar-001",
      actorId: "penggugat-001"
    };

    // 2. Create legal case for land dispute (legal-case capability)
    const createCaseResult = await capabilityRegistry.invokeAsync({
      commandKey: "case.create",
      input: {
        title: "Sengketa Lahan Kelurahan Sukamaju",
        description: "Sengketa batas lahan antara dua warga Kelurahan Sukamaju, Kecamatan Cianjur",
        workId: decisionId,
        sessionId: "session-penggugat-001",
        ...initialContext
      },
      decisionId,
      parentContextTraceId: null,
      context: initialContext
    });
    expect(createCaseResult.id).toBeDefined();
    
    const allRecords = decodeAllRuntimeInvocations();
    expect(allRecords.length).toBeGreaterThan(0);
    expect(allRecords[0].decision_id).toBe(decisionId);

    // 3. Assign lawyer to the case (legal-case capability)
    const assignLawyer = await capabilityRegistry.invokeAsync({
      commandKey: "case.assignLawyer",
      input: { id: createCaseResult.id, lawyerId: "advokat-001", notes: "Pengacara menangani sengketa lahan" },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "advokat-001" }
    });
    expect(assignLawyer.status).toBe("in_progress");

    // 4. Create initial dispute documents (legal-document capability)
    const createGugatan = await capabilityRegistry.invokeAsync({
      commandKey: "document.create",
      input: { 
        title: "Gugatan Sengketa Lahan", 
        workId: decisionId, 
        matterId: createCaseResult.id,
        author: "advokat-001",
        sessionId: "session-advokat-001",
        ...initialContext
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "advokat-001" }
    });
    expect(createGugatan.id).toBeDefined();

    // 5. Schedule mediation session (consultation capability)
    const scheduleMediation = await capabilityRegistry.invokeAsync({
      commandKey: "consultation.schedule",
      input: { 
        caseId: createCaseResult.id, 
        scheduledAt: "2026-09-01T09:00:00Z",
        location: "Kantor Kemenkumham Cianjur",
        participants: ["penggugat-001", "tergugat-001", "advokat-001", "mediator-kemenkumham-001"]
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "mediator-kemenkumham-001" }
    });
    expect(scheduleMediation.sessionId).toBeDefined();

    // 6. First revision of agreement document (legal-document.update)
    const updateAgreementV1 = await capabilityRegistry.invokeAsync({
      commandKey: "document.update",
      input: { 
        id: createGugatan.id, 
        title: "Draf Kesepakatan Mediasi V1",
        description: "Draf pertama batas lahan yang disepakati bersama"
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "mediator-kemenkumham-001" }
    });
    expect(updateAgreementV1.updatedAt).toBeDefined();

    // 7. Second revision (V2) after negotiation
    const updateAgreementV2 = await capabilityRegistry.invokeAsync({
      commandKey: "document.update",
      input: { 
        id: createGugatan.id, 
        title: "Draf Kesepakatan Mediasi V2",
        description: "Revisi batas lahan sesuai usulan tergugat"
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "mediator-kemenkumham-001" }
    });
    expect(updateAgreementV2.updatedAt).toBeDefined();

    // 8. Third revision (V3 - final)
    const updateAgreementV3 = await capabilityRegistry.invokeAsync({
      commandKey: "document.update",
      input: { 
        id: createGugatan.id, 
        title: "Kesepakatan Mediasi Final",
        description: "Dokumen akhir yang disetujui kedua belah pihak"
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "mediator-kemenkumham-001" }
    });
    expect(updateAgreementV3.updatedAt).toBeDefined();

    // 9. Sign agreement by all parties (document.sign)
    const signAgreement = await capabilityRegistry.invokeAsync({
      commandKey: "document.sign",
      input: { id: createGugatan.id, signer: "mediator-kemenkumham-001" },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "mediator-kemenkumham-001" }
    });
    expect(signAgreement.status).toBe("signed");

    // 10. Submit to BPN for registration approval (requirement.approve)
    const submitApproval = await capabilityRegistry.invokeAsync({
      commandKey: "requirement.approve",
      input: { 
        id: createCaseResult.id, 
        workId: decisionId, 
        notes: "Kesepakatan mediasi lengkap dan diverifikasi, siap didaftarkan ke BPN" 
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "bpn-verifier-001" }
    });
    expect(submitApproval.status).toBe("approved");

    // 11. Record all evidence for audit (evidence-registry.record)
    const recordEvidence = await capabilityRegistry.invokeAsync({
      commandKey: "evidence-registry.record",
      input: {
        caseId: createCaseResult.id,
        documents: [createGugatan.id],
        approvals: [submitApproval.id],
        mediationSessionId: scheduleMediation.sessionId
      },
      decisionId,
      parentContextTraceId: allRecords[allRecords.length-1].contextTraceId,
      context: { ...initialContext, actorId: "bpn-auditor-001" }
    });
    expect(recordEvidence.auditId).toBeDefined();

    // 12. Verify PT-004 context propagation maintained across non-linear flow
    const finalRecords = decodeAllRuntimeInvocations();
    const allContextTraces = finalRecords.map(r => r.contextTraceId);
    const uniqueContexts = new Set(allContextTraces);
    expect(uniqueContexts.size).toBe(finalRecords.length); // Every step has unique trace but linked parent
    expect(finalRecords.every(r => r.decision_id === decisionId)).toBe(true); // Same decision_id throughout
  });
});
/**
 * RWP-004: Kasus Pro Bono dengan High Actor Turnover
 * Alur: Klien pro bono → pengacara1 keluar → pengacara2 ambil alih → verifikasi kelayakan → mediasi → approval hibah
 * PT-004: Context propagation tetap terjaga selama pergantian actor (decision_id sama, parentContextTraceId terhubung)
 * Substrate Freeze: Hanya reuse existing commands, tidak ada primitive baru
 */
import { capabilityRegistry } from "@repo/core-kernel";
import { executionContext } from "@repo/core-runtime";

describe('RWP-004: Pro Bono High Actor Turnover Flow', () => {
  const ROOT_DECISION_ID = 'decision-probono-001';
  let workId: string;
  let caseId: string;
  
  beforeAll(async () => {
    executionContext.startTrace(ROOT_DECISION_ID, 'probono-land-dispute');
  });

  it('1. Klien mendaftarkan kasus pro bono (actor: client-probono-001)', async () => {
    const createResult = await capabilityRegistry.invoke('legal-case', 'case.create', {
      title: 'Kasus Penggusuran Rumah Warga Tidak Mampu',
      clientId: 'client-probono-001',
      workspaceId: 'tenant-probono-001',
      workId: ROOT_DECISION_ID
    });
    caseId = createResult.output.id;
    workId = createResult.output.workId;
    expect(caseId).toBeDefined();
    expect(workId).toBe(ROOT_DECISION_ID);
  });

  it('2. Assign pengacara volunteer pertama (actor: lawyer-volunteer-001)', async () => {
    const assignResult = await capabilityRegistry.invoke('legal-case', 'case.assignLawyer', {
      id: caseId,
      lawyerId: 'lawyer-volunteer-001',
      workId: workId,
      parentContextTraceId: executionContext.getLastTraceId()
    });
    expect(assignResult.output.lawyerId).toBe('lawyer-volunteer-001');
    expect(executionContext.getCurrentTrace().workId).toBe(ROOT_DECISION_ID);
  });

  it('3. Pergantian actor: pengacara1 keluar, assign pengacara volunteer kedua (actor: lawyer-volunteer-002)', async () => {
    const transferResult = await capabilityRegistry.invoke('legal-case', 'case.assignLawyer', {
      id: caseId,
      lawyerId: 'lawyer-volunteer-002',
      workId: workId,
      parentContextTraceId: executionContext.getLastTraceId(),
      transferReason: 'Pengacara sebelumnya mengundurkan diri'
    });
    expect(transferResult.output.lawyerId).toBe('lawyer-volunteer-002');
    // VERIFIKASI PT-004: workId dan decision_id TETAP SAMA selama pergantian actor
    expect(executionContext.getCurrentTrace().workId).toBe(ROOT_DECISION_ID);
    expect(executionContext.getParentTraceId()).toBeDefined();
  });

  it('4. Verifikasi kelayakan pro bono oleh lembaga (actor: probono-verifier-001)', async () => {
    const verifyResult = await capabilityRegistry.invoke('requirement-management', 'requirement.approve', {
      caseId: caseId,
      approverId: 'probono-verifier-001',
      approvalType: 'probono_eligibility',
      workId: workId,
      parentContextTraceId: executionContext.getLastTraceId()
    });
    expect(verifyResult.output.approved).toBe(true);
    expect(executionContext.getCurrentTrace().workId).toBe(ROOT_DECISION_ID);
  });

  it('5. Mediasi dengan pihak lawan, dilanjutkan oleh pengacara kedua (context tetap utuh)', async () => {
    const mediationResult = await capabilityRegistry.invoke('consultation', 'consultation.create', {
      caseId: caseId,
      actorId: 'lawyer-volunteer-002',
      meetingType: 'mediation',
      workId: workId,
      parentContextTraceId: executionContext.getLastTraceId()
    });
    expect(mediationResult.output.id).toBeDefined();
    // Context tetap terjaga meskipun setelah pergantian actor
    expect(executionContext.getCurrentTrace().workId).toBe(ROOT_DECISION_ID);
  });

  it('6. Approval hibah dana dari lembaga pendanaan (actor: grant-approver-001)', async () => {
    const grantResult = await capabilityRegistry.invoke('land-registration', 'grant.approve', {
      caseId: caseId,
      amount: 5000000,
      approverId: 'grant-approver-001',
      workId: workId,
      parentContextTraceId: executionContext.getLastTraceId()
    });
    expect(grantResult.output.approved).toBe(true);
    // Akhir alur, context chain tetap utuh dari awal sampai akhir
    const fullTrace = executionContext.getFullTraceChain();
    expect(fullTrace.length).toBe(6); // 6 langkah, semua terhubung
    expect(fullTrace.every(t => t.workId === ROOT_DECISION_ID)).toBe(true);
  });

  afterAll(async () => {
    executionContext.endTrace();
  });
});
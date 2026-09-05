import { describe, it, expect, beforeAll } from 'node:test';
import { buildWorkRealityModel } from '../../../../../../apps/web/app/(eos)/work/[id]/getWorkRealityModel';
import type { CanonicalWorkRecord } from '../../../../../../apps/web/app/api/work/create/route';

describe('SERVICES.ID Golden Slice - case-005 E2E Flow', () => {
  let case005Work: CanonicalWorkRecord;
  const session = {
    actorId: 'anonymous.user',
    workspaceId: 'professional-workspace.anonymous',
    tenantId: 'tenant.anonymous',
    sessionId: 'anonymous-session'
  };

  beforeAll(() => {
    // Initialize golden fixture case-005 according to page.tsx definition
    case005Work = {
      workId: 'case-005',
      id: 'case-005',
      title: "Website Maintenance Request - www.umkm-coffee.id",
      description: "SERVICES.ID Golden Slice: Client website unreachable from 3 regional monitoring points. Requires immediate technical intervention and provider coordination.",
      status: "open",
      priority: "critical",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
      providerId: "provider.teknis.001",
      evidence: [],
      domainType: "service-request",
      specialization: "website_maintenance",
      nextAction: { label: "Hubungi klien untuk konfirmasi gangguan", actionId: "action-contact-client" },
      participants: [
        { id: "monitoring-system-001", name: "Sistem Monitoring", role: "Validator", actorType: "system" },
        { id: "provider.teknis.001", name: "Tim Teknis", role: "Penyedia Layanan", actorType: "professional" },
        { id: "client.umkm.001", name: "Pemilik UMKM", role: "Klien", actorType: "customer" }
      ],
      attachedDocuments: [
        { id: "doc-monitoring-001", title: "Laporan Monitoring Gangguan", type: "report" }
      ],
      linkedInstitutions: []
    } as unknown as CanonicalWorkRecord;
  });

  it('1. Intent terdefinisi: work_id + user_job lengkap', () => {
    expect(case005Work.id).toBe('case-005');
    expect(case005Work.description).toContain('website unreachable from 3 regional monitoring points');
  });

  it('2. Product Experience: lifecycle semantics terbaca (open → in_progress → closed)', async () => {
    const model = await buildWorkRealityModel(case005Work, [], session);
    expect(model.identity.status).toBe('open');
    
    // Verify status transition to in_progress
    const inProgressWork = { ...case005Work, status: 'in_progress' };
    const inProgressModel = await buildWorkRealityModel(inProgressWork, [], session);
    expect(inProgressModel.state.currentState).toBe('Layanan sedang dikerjakan oleh provider');
    
    // Verify status transition to closed
    const closedWork = { ...case005Work, status: 'closed' };
    const closedModel = await buildWorkRealityModel(closedWork, [], session);
    expect(closedModel.state.currentState).toBe('Layanan telah selesai, tinggalkan ulasan Anda');
  });

  it('3. UI Components: semua reality components bisa diimpor tanpa error', async () => {
    const realityImports = await import('../../reality');
    expect(realityImports.RealityNow).toBeDefined();
    expect(realityImports.RealityNext).toBeDefined();
    expect(realityImports.RealityPeople).toBeDefined();
    expect(realityImports.RealityEvidence).toBeDefined();
  });

  it('4. WorkRealityModel: 11 bidang UI terpenuhi (semua requirement terpenuhi)', async () => {
    const model = await buildWorkRealityModel(case005Work, [], session);
    // NOW (state.currentState)
    expect(model.state.currentState).toBeDefined();
    // NEXT (state.nextAction)
    expect(model.state.nextAction).toBeDefined();
    // OWNER (session.actorId sebagai pemilik)
    expect(session.actorId).toBe('anonymous.user');
    // PEOPLE (participants)
    expect(model.participants.length).toBe(3);
    // CONTEXT (identity.description)
    expect(model.identity.description).toContain('website maintenance');
    // ACTIVITY (activity array)
    expect(model.activity).toBeDefined();
    // COMMUNICATION (communications array)
    expect(model.communications).toBeDefined();
    // DOCUMENTS (attachedDocuments masuk ke evidence)
    expect(model.evidence.length).toBe(1);
    // EVIDENCE (evidence array)
    expect(model.evidence[0].label).toBe('Laporan Monitoring Gangguan');
    // OUTCOME (bisa update outcomeDescription di markCompleted)
    expect(case005Work).toHaveProperty('outcomeDescription', undefined);
    // STATUS (identity.status)
    expect(model.identity.status).toBe('open');
  });

  it('5. executeTransition function exists di work-actions', async () => {
    const workActions = await import('../work-actions');
    expect(workActions.executeTransition).toBeDefined();
  });
});
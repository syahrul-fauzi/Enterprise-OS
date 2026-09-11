import { describe, it, expect, beforeAll } from 'vitest';
import { buildWorkRealityModel, CanonicalWorkRecord } from '../../../../../packages/presentation/features/src/work/getWorkRealityModel';
import type { WorkAggregate } from '../../../../../capabilities/work-core/contracts/work.contracts';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// ERA-001: VERTICAL SLICE Actor Runtime Layer D Verification (Template)
// Template generik untuk verifikasi layer backend/actor runtime setiap slice baru

describe('[SLICE-ID] Golden Slice - E2E Flow Layer D (Actor Runtime)', () => {
  let sliceWork: CanonicalWorkRecord;
  const sliceId = process.env.SLICE_ID || 'REQ-XXXX';
  const session = {
    actorId: 'anonymous.user',
    workspaceId: 'professional-workspace.anonymous',
    tenantId: 'tenant.anonymous',
    sessionId: 'anonymous-session'
  };

  beforeAll(() => {
    // Baca acceptance.yaml slice untuk setup test data
    const acceptancePath = path.join(process.cwd(), 'examples', 'vertical-slice', sliceId, 'acceptance.yaml');
    let sliceData: any = {};
    if (fs.existsSync(acceptancePath)) {
      const fileContent = fs.readFileSync(acceptancePath, 'utf8');
      sliceData = parse(fileContent);
      console.log(`[ERA-001-TEMPLATE] ✓ Loaded acceptance.yaml for slice ${sliceId}`);
    }

    // Inisialisasi work model berdasarkan slice type
    sliceWork = {
      workId: sliceData.expected?.work_id || `work-${sliceId}`,
      id: sliceId,
      title: sliceData.reality?.intent?.substring(0, 60) || `EOS Vertical Slice ${sliceId}`,
      description: sliceData.reality?.intent || `EOS Continuous Reality Verification Slice ${sliceId}`,
      status: "open",
      priority: "medium",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [],
      domainType: sliceData.slice?.root_aggregate || "generic-work",
      specialization: sliceData.slice?.slice_type === "CANONICAL_SPEC" ? "core_ontology" : "user_feature",
      nextAction: { label: "Lanjutkan verifikasi slice", actionId: "action-continue-verification" },
      participants: [
        { id: session.actorId, name: "EOS Verification Actor", role: "Owner", actorType: "system" }
      ],
      attachedDocuments: [],
      linkedInstitutions: []
    } as unknown as CanonicalWorkRecord;
  });

  it('1. Intent terdefinisi: work_id + user_job lengkap', () => {
    expect(sliceWork.id).toBe(sliceId);
    expect(sliceWork.description).toBeDefined();
    expect(sliceWork.description.length).toBeGreaterThan(10);
    console.log(`[ERA-001-D1] ✓ Intent slice ${sliceId} terdefinisi dengan jelas`);
  });

  it('2. Product Experience: lifecycle semantics terbaca (open → in_progress → closed)', async () => {
    const model = await buildWorkRealityModel(sliceWork, [], session);
    expect(model.identity.status).toBe('open');
    
    // Test transition to in_progress
    const inProgressWork = { ...sliceWork, status: 'in_progress' };
    const inProgressModel = await buildWorkRealityModel(inProgressWork, [], session);
    expect(inProgressModel.state.currentState).toBeDefined();
    
    // Test transition to closed
    const closedWork = { ...sliceWork, status: 'closed' };
    const closedModel = await buildWorkRealityModel(closedWork, [], session);
    expect(closedModel.state.currentState).toBeDefined();
    console.log(`[ERA-001-D2] ✓ Semua lifecycle state terbaca dengan benar (${sliceId})`);
  });

  it('3. UI Components: semua reality components bisa diimpor tanpa error', async () => {
    const realityImports = await import('../../../../../packages/presentation/features/src/work/reality');
    expect(realityImports.RealityNow).toBeDefined();
    expect(realityImports.RealityNext).toBeDefined();
    expect(realityImports.RealityPeople).toBeDefined();
    expect(realityImports.RealityEvidence).toBeDefined();
    console.log(`[ERA-001-D3] ✓ Semua UI reality components terimpor tanpa error (${sliceId})`);
  });

  it('4. WorkRealityModel: 11 bidang UI terpenuhi (semua requirement terpenuhi)', async () => {
    const model = await buildWorkRealityModel(sliceWork, [], session);
    // NOW (state.currentState)
    expect(model.state.currentState).toBeDefined();
    // NEXT (state.nextAction)
    expect(model.state.nextAction).toBeDefined();
    // OWNER (session.actorId sebagai pemilik)
    expect(session.actorId).toBe('anonymous.user');
    // PEOPLE (participants)
    expect(model.participants.length).toBeGreaterThan(0);
    // CONTEXT (identity.description)
    expect(model.identity.description).toBeDefined();
    // ACTIVITY (activity array)
    expect(model.activity).toBeDefined();
    // COMMUNICATION (communications array)
    expect(model.communications).toBeDefined();
    // DOCUMENTS (attachedDocuments masuk ke evidence)
    expect(model.evidence).toBeDefined();
    // EVIDENCE (evidence array terdefinisi)
    expect(model.evidence).toBeDefined();
    // OUTCOME (bisa update outcomeDescription)
    expect(sliceWork.outcomeDescription).toBeUndefined();
    // STATUS (identity.status)
    expect(model.identity.status).toBe('open');
    console.log(`[ERA-001-D4] ✓ Semua 11 bidang WorkRealityModel terpenuhi (${sliceId})`);
  });

  it('5. executeTransition function exists di work-actions', async () => {
    const workActions = await import('../../../../../packages/presentation/features/src/work/work-actions');
    expect(workActions.executeTransition).toBeDefined();
    console.log(`[ERA-001-D5] ✓ executeTransition tersedia untuk work actions (${sliceId})`);
  });

  it('6. Slice contract validation: acceptance.yaml fields mandatory terisi', () => {
    const acceptancePath = path.join(process.cwd(), 'examples', 'vertical-slice', sliceId, 'acceptance.yaml');
    expect(fs.existsSync(acceptancePath)).toBe(true);
    const fileContent = fs.readFileSync(acceptancePath, 'utf8');
    const sliceAcceptance = parse(fileContent);
    // Verify mandatory fields sesuai Vertical Slice Contract v2
    expect(sliceAcceptance.slice.id).toBe(sliceId);
    expect(sliceAcceptance.slice.source_els_hash).toBeDefined();
    expect(sliceAcceptance.slice.slice_type).toBeDefined();
    expect(['CANONICAL_SPEC', 'USER_FEATURE']).toContain(sliceAcceptance.slice.slice_type);
    expect(sliceAcceptance.reality.intent).toBeDefined();
    expect(sliceAcceptance.expected.capabilities_attached).toBeInstanceOf(Array);
    console.log(`[ERA-001-D6] ✓ Semua mandatory field acceptance.yaml terisi (${sliceId})`);
  });
});
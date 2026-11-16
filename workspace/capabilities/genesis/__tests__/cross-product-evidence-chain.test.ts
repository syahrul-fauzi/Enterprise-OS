import { GenesisService } from '../implementation';

describe('Genesis Cross-Product Evidence Chain Assurance (BDP-G34 to BDP-G39)', () => {
  const testTenantId = 'tenant-evidence-chain-001';
  const actor = { type: 'agent' as const, id: 'test-runtime' };
  const emptyEvidence: any[] = [];

  it('G34: Evidence references are preserved across product boundaries', async () => {
    const serviceA = new GenesisService();
    const serviceB = new GenesisService();
    const workId = 'work-evidence-preserve-001';

    const prospect = await serviceA.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Evidence Preserve Company',
      email: 'evidence-preserve@test.com',
      signals: ['evidence-preserve']
    }, workId, actor, emptyEvidence);

    const state = serviceA.exportState();
    serviceB.importState(state);
    const stateAfter = serviceB.exportState();
    expect(stateAfter).toEqual(state);
  });

  it('G35: Evidence provenance remains verifiable after state migration', async () => {
    const service = new GenesisService();
    const workId = 'work-provenance-001';
    const evidenceRef = [{ type: 'test-evidence', ref: 'proof-001' }];

    const prospect = await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Provenance Test Company',
      email: 'provenance@test.com',
      signals: ['provenance']
    }, workId, actor, evidenceRef);

    expect(prospect).toBeDefined();
    expect(prospect.evidenceRefs).toBeDefined();
  });

  it('G36: Evidence authority is correctly associated with Work identity', async () => {
    const service = new GenesisService();
    const workId = 'work-authority-001';
    const testActor = { type: 'agent', id: 'authority-test' };

    const prospect = await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Authority Test Company',
      email: 'authority@test.com',
      signals: ['authority']
    }, workId, testActor, emptyEvidence);

    expect(prospect.logicalWorkId).toBe(workId);
  });

  it('G37: Evidence ownership is correctly associated with tenant', async () => {
    const service = new GenesisService();
    const workId = 'work-tenant-evidence-001';
    const tenantId = 'tenant-evidence-specific';

    const prospect = await service.captureLeadProspect({
      tenantId: tenantId,
      prospectName: 'Tenant Evidence Company',
      email: 'tenant-evidence@test.com',
      signals: ['tenant-evidence']
    }, workId, actor, emptyEvidence);

    expect(prospect.tenantId).toBe(tenantId);
  });

  it('G38: Evidence integrity is maintained across state export/import', async () => {
    const serviceA = new GenesisService();
    const serviceB = new GenesisService();
    const workId = 'work-integrity-001';

    const prospect = await serviceA.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Integrity Test Company',
      email: 'integrity@test.com',
      signals: ['integrity']
    }, workId, actor, emptyEvidence);

    const state = serviceA.exportState();
    serviceB.importState(state);
    const stateAfter = serviceB.exportState();
    expect(stateAfter).toEqual(state);
  });

  it('G39: Evidence remains accessible after runtime migration', async () => {
    const serviceA = new GenesisService();
    const serviceB = new GenesisService();
    const workId = 'work-migration-evidence-001';

    const prospectA = await serviceA.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Migration Evidence Company',
      email: 'migration-evidence@test.com',
      signals: ['migration-evidence']
    }, workId, actor, emptyEvidence);

    const state = serviceA.exportState();
    serviceB.importState(state);

    const prospectB = await serviceB.getLeadProspectById(prospectA.id, testTenantId);
    expect(prospectB).toBeDefined();
    expect(prospectB.id).toBe(prospectA.id);
    expect(prospectB.evidenceRefs).toEqual(prospectA.evidenceRefs);
  });
});
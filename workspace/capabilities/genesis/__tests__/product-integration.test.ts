import { genesisService } from '../implementation';

describe('Genesis Product Integration', () => {
  const testTenantId = 'tenant-integration-001';
  const testLogicalWorkId = 'test-work-integration-001';
  const actor = { type: 'agent', id: 'test-runtime' };
  const emptyEvidence: any[] = [];

  it('Product integration can access GenesisService singleton', () => {
    expect(genesisService).toBeDefined();
    expect(typeof genesisService.captureLeadProspect).toBe('function');
  });

  it('Product integration can create new Work items', async () => {
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Integration Test Company',
      email: 'integration@test.com',
      signals: ['integration-signal']
    }, testLogicalWorkId, actor, emptyEvidence);

    expect(prospect).toBeDefined();
    expect(prospect.logicalWorkId).toBe(testLogicalWorkId);
  });

  it('Product integration can retrieve existing Work items', async () => {
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Retrieval Test Company',
      email: 'retrieval@test.com',
      signals: ['retrieval-signal']
    }, testLogicalWorkId + '-retrieval', actor, emptyEvidence);

    const retrieved = await genesisService.getLeadProspectById(prospect.id, testTenantId);
    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(prospect.id);
  });

  it('Product integration can perform business transitions', async () => {
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Transition Test Company',
      email: 'transition@test.com',
      signals: ['transition-signal']
    }, testLogicalWorkId + '-transition', actor, emptyEvidence);

    const qualified = await genesisService.qualifyLeadProspect({
      tenantId: testTenantId,
      prospectId: prospect.id,
      qualificationScore: 85
    }, prospect.logicalWorkId, actor, []);

    expect(qualified).toBeDefined();
  });

  it('Product integration can access state export/import API', () => {
    expect(typeof genesisService.exportState).toBe('function');
    expect(typeof genesisService.importState).toBe('function');
  });
});
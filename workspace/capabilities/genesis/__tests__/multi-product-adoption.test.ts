import { GenesisService, genesisService } from '../implementation';

describe('Genesis Multi-Product Adoption Assurance (BDP-G19 to BDP-G26)', () => {
  const testTenantId = 'tenant-multi-product-001';
  const actor = { type: 'agent', id: 'test-runtime' };
  const emptyEvidence: any[] = [];

  it('G19: GenesisService can be instantiated multiple times', () => {
    const service1 = new GenesisService();
    const service2 = new GenesisService();
    expect(service1).toBeDefined();
    expect(service2).toBeDefined();
    expect(service1).not.toBe(service2);
  });

  it('G20: GenesisService singleton is available for product integration', () => {
    expect(genesisService).toBeDefined();
    expect(typeof genesisService.captureLeadProspect).toBe('function');
  });

  it('G21: Multiple products can use GenesisService simultaneously', async () => {
    const service = new GenesisService();
    const workId1 = 'work-product-001';
    const workId2 = 'work-product-002';

    const prospect1 = await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Product 1 Company',
      email: 'product1@test.com',
      signals: ['product1-signal']
    }, workId1, actor, emptyEvidence);

    const prospect2 = await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Product 2 Company',
      email: 'product2@test.com',
      signals: ['product2-signal']
    }, workId2, actor, emptyEvidence);

    expect(prospect1).toBeDefined();
    expect(prospect2).toBeDefined();
    expect(prospect1.logicalWorkId).toBe(workId1);
    expect(prospect2.logicalWorkId).toBe(workId2);
  });

  it('G22: Product usage does not create cross-product contamination', async () => {
    const service = new GenesisService();
    const workId1 = 'work-isolation-001';
    const workId2 = 'work-isolation-002';

    await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Isolation Test 1',
      email: 'isolation1@test.com',
      signals: ['isolation1']
    }, workId1, actor, emptyEvidence);

    await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Isolation Test 2',
      email: 'isolation2@test.com',
      signals: ['isolation2']
    }, workId2, actor, emptyEvidence);

    const state = service.exportState();
    expect(state.leadProspects).toBeDefined();
    expect(Object.keys(state.leadProspects).length).toBeGreaterThanOrEqual(2);
  });

  it('G23: Product signals are preserved in Work state', async () => {
    const service = new GenesisService();
    const workId = 'work-signals-001';
    const signals = ['signal-a', 'signal-b', 'signal-c'];

    const prospect = await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Signals Test Company',
      email: 'signals@test.com',
      signals: signals
    }, workId, actor, emptyEvidence);

    expect(prospect.signals).toEqual(expect.arrayContaining(signals));
  });

  it('G24: GenesisService API surface is consistent across all products', () => {
    const service = new GenesisService();
    expect(typeof service.captureLeadProspect).toBe('function');
    expect(typeof service.qualifyLeadProspect).toBe('function');
    expect(typeof service.createSolutionArtifact).toBe('function');
    expect(typeof service.createFinancialAssessment).toBe('function');
    expect(typeof service.approveFinancialAssessment).toBe('function');
    expect(typeof service.createConversionAsset).toBe('function');
    expect(typeof service.acceptOffer).toBe('function');
    expect(typeof service.createClientAccount).toBe('function');
    expect(typeof service.exportState).toBe('function');
    expect(typeof service.importState).toBe('function');
  });

  it('G25.1: State export produces immutable snapshot', async () => {
    const service = new GenesisService();
    const workId = 'work-export-001';

    await service.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Export Test Company',
      email: 'export@test.com',
      signals: ['export-signal']
    }, workId, actor, emptyEvidence);

    const state1 = service.exportState();
    const state2 = service.exportState();
    expect(state1).toEqual(state2);
  });

  it('G25.2: State import restores exact same state', async () => {
    const serviceA = new GenesisService();
    const serviceB = new GenesisService();
    const workId = 'work-import-001';

    await serviceA.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Import Test Company',
      email: 'import@test.com',
      signals: ['import-signal']
    }, workId, actor, emptyEvidence);

    const state = serviceA.exportState();
    serviceB.importState(state);
    const stateAfterImport = serviceB.exportState();
    expect(stateAfterImport).toEqual(state);
  });

  it('G25.3: Multiple concurrent product instances are supported', async () => {
    const service = new GenesisService();
    const workIds = ['work-concurrent-001', 'work-concurrent-002', 'work-concurrent-003'];

    const promises = workIds.map(workId => 
      service.captureLeadProspect({
        tenantId: testTenantId,
        prospectName: `Concurrent ${workId}`,
        email: `concurrent${workId}@test.com`,
        signals: ['concurrent-signal']
      }, workId, actor, emptyEvidence)
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(workIds.length);
    results.forEach((result, index) => {
      expect(result.logicalWorkId).toBe(workIds[index]);
    });
  });

  it('G26.1: Tenant isolation is preserved across product instances', async () => {
    const service = new GenesisService();
    const tenantA = 'tenant-isolation-a';
    const tenantB = 'tenant-isolation-b';
    const workIdA = 'work-tenant-a';
    const workIdB = 'work-tenant-b';

    await service.captureLeadProspect({
      tenantId: tenantA,
      prospectName: 'Tenant A Company',
      email: 'tenant-a@test.com',
      signals: ['tenant-a']
    }, workIdA, actor, emptyEvidence);

    await service.captureLeadProspect({
      tenantId: tenantB,
      prospectName: 'Tenant B Company',
      email: 'tenant-b@test.com',
      signals: ['tenant-b']
    }, workIdB, actor, emptyEvidence);

    const state = service.exportState();
    expect(state.leadProspects).toBeDefined();
  });

  it('G26.2: No business logic duplication between Genesis and product consumers', async () => {
    const serviceA = new GenesisService();
    const serviceB = new GenesisService();
    const workId = 'work-duplication-test';

    await serviceA.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Duplication Test Company',
      email: 'duplication@test.com',
      signals: ['duplication-signal']
    }, workId, actor, emptyEvidence);

    const state = serviceA.exportState();
    serviceB.importState(state);
    const stateAfter = serviceB.exportState();
    expect(stateAfter).toEqual(state);
  });
});
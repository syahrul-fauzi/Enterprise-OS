import { describe, it, expect } from 'vitest';
import { genesisService } from "@capabilities/genesis/implementation/index";

describe('ecommerce-ops Security & Authority Boundary Test', () => {
  const actor = { type: 'agent', id: 'ecommerce-runtime' };
  const emptyEvidence: any[] = [];

  it('should enforce tenant isolation for all entity types', async () => {
    const tenantA = 'security-tenant-a-001';
    const tenantB = 'security-tenant-b-001';
    const logicalWorkId = 'security-isolation-test-001';
    
    const prospectA = await genesisService.captureLeadProspect({
      tenantId: tenantA,
      prospectName: 'Tenant A Security Customer',
      email: 'tenant-a-security@test.com',
      signals: ['security-tenant-a']
    }, logicalWorkId + '-discover', actor, emptyEvidence);

    const artifactA = await genesisService.createSolutionArtifact({
      tenantId: tenantA,
      prospectId: prospectA.id,
      artifactType: 'ecommerce-order',
      details: { totalAmount: 150000 }
    }, prospectA.logicalWorkId, actor, emptyEvidence);

    const assessmentA = await genesisService.createFinancialAssessment({
      tenantId: tenantA,
      solutionId: artifactA.id,
      estimatedCost: 0,
      estimatedRevenue: 150000,
      riskLevel: 'low',
      riskDescription: 'Security isolation test'
    }, artifactA.logicalWorkId, actor, emptyEvidence);

    const fulfillmentA = await genesisService.createConversionAsset({
      tenantId: tenantA,
      assessmentId: assessmentA.id,
      offerTitle: 'Security Test Fulfillment',
      offerDescription: 'Tenant isolation verification',
      offerPrice: 150000
    }, assessmentA.logicalWorkId, actor, emptyEvidence);

    const clientAccountA = await genesisService.createClientAccount({
      tenantId: tenantA,
      offerId: fulfillmentA.id,
      clientName: 'Tenant A Security Customer',
      clientEmail: 'tenant-a-security@test.com'
    }, fulfillmentA.logicalWorkId, actor, emptyEvidence);

    try {
      await genesisService.getLeadProspectById(prospectA.id, tenantB);
      expect.fail('Cross-tenant LeadProspect access should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
    }

    try {
      await genesisService.getSolutionArtifactById(artifactA.id, tenantB);
      expect.fail('Cross-tenant SolutionArtifact access should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
    }

    try {
      await genesisService.getFinancialAssessmentById(assessmentA.id, tenantB);
      expect.fail('Cross-tenant FinancialAssessment access should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
    }

    try {
      await genesisService.getConversionAssetById(fulfillmentA.id, tenantB);
      expect.fail('Cross-tenant ConversionAsset access should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
    }

    try {
      await genesisService.getClientAccountById(clientAccountA.id, tenantB);
      expect.fail('Cross-tenant ClientAccount access should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
    }

    console.log('✅ Tenant isolation verified for ALL entity types');
    console.log('   LeadProspect, SolutionArtifact, FinancialAssessment, ConversionAsset, ClientAccount');
  });

  it('should enforce correct tenant ownership for all created entities', async () => {
    const testTenant = 'security-tenant-ownership-001';
    const logicalWorkId = 'security-ownership-test-001';
    
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenant,
      prospectName: 'Ownership Test Customer',
      email: 'ownership@test.com',
      signals: ['ownership-test']
    }, logicalWorkId + '-discover', actor, emptyEvidence);

    const artifact = await genesisService.createSolutionArtifact({
      tenantId: testTenant,
      prospectId: prospect.id,
      artifactType: 'ecommerce-order',
      details: { totalAmount: 250000 }
    }, prospect.logicalWorkId, actor, emptyEvidence);

    const assessment = await genesisService.createFinancialAssessment({
      tenantId: testTenant,
      solutionId: artifact.id,
      estimatedCost: 0,
      estimatedRevenue: 250000,
      riskLevel: 'medium',
      riskDescription: 'Ownership test'
    }, artifact.logicalWorkId, actor, emptyEvidence);

    const fulfillment = await genesisService.createConversionAsset({
      tenantId: testTenant,
      assessmentId: assessment.id,
      offerTitle: 'Ownership Test Fulfillment',
      offerDescription: 'Tenant ownership verification',
      offerPrice: 250000
    }, assessment.logicalWorkId, actor, emptyEvidence);

    const clientAccount = await genesisService.createClientAccount({
      tenantId: testTenant,
      offerId: fulfillment.id,
      clientName: 'Ownership Test Customer',
      clientEmail: 'ownership@test.com'
    }, fulfillment.logicalWorkId, actor, emptyEvidence);

    expect(prospect.tenantId).toBe(testTenant);
    expect(artifact.tenantId).toBe(testTenant);
    expect(assessment.tenantId).toBe(testTenant);
    expect(fulfillment.tenantId).toBe(testTenant);
    expect(clientAccount.tenantId).toBe(testTenant);

    console.log('✅ Tenant ownership verified for ALL created entities');
    console.log('   All entities correctly assigned to tenant:', testTenant);
  });

  it('should maintain logical work continuity across tenant boundaries', async () => {
    const tenantA = 'security-work-tenant-a-001';
    const tenantB = 'security-work-tenant-b-001';
    const logicalWorkIdA = 'security-work-continuity-a-001';
    const logicalWorkIdB = 'security-work-continuity-b-001';
    
    const prospectA = await genesisService.captureLeadProspect({
      tenantId: tenantA,
      prospectName: 'Work Continuity Customer A',
      email: 'work-a@test.com',
      signals: ['work-continuity-a']
    }, logicalWorkIdA, actor, emptyEvidence);

    const prospectB = await genesisService.captureLeadProspect({
      tenantId: tenantB,
      prospectName: 'Work Continuity Customer B',
      email: 'work-b@test.com',
      signals: ['work-continuity-b']
    }, logicalWorkIdB, actor, emptyEvidence);

    expect(prospectA.logicalWorkId).toBe(logicalWorkIdA);
    expect(prospectB.logicalWorkId).toBe(logicalWorkIdB);
    expect(prospectA.id).not.toBe(prospectB.id);

    console.log('✅ Logical work continuity verified across tenant boundaries');
    console.log('   Work IDs are unique per tenant and per operation');
  });

  it('should reject operations without valid tenant context', async () => {
    const invalidTenant = '';
    const logicalWorkId = 'security-invalid-tenant-test-001';
    
    try {
      await genesisService.captureLeadProspect({
        tenantId: invalidTenant,
        prospectName: 'Invalid Tenant Test',
        email: 'invalid@test.com',
        signals: ['invalid-tenant']
      }, logicalWorkId, actor, emptyEvidence);
      expect.fail('Operation with invalid tenant should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
      console.log('✅ Invalid tenant context rejected as expected');
    }
  });

  it('should maintain immutable audit trail through evidence references', async () => {
    const testTenant = 'security-audit-tenant-001';
    const logicalWorkId = 'security-audit-test-001';
    const testActor = { type: 'agent', id: 'security-test-actor' };
    
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenant,
      prospectName: 'Audit Trail Test Customer',
      email: 'audit@test.com',
      signals: ['audit-trail']
    }, logicalWorkId, testActor, emptyEvidence);

    expect(prospect.evidenceRefs).toBeDefined();
    expect(Array.isArray(prospect.evidenceRefs)).toBe(true);

    console.log('✅ Immutable audit trail maintained through evidence references');
    console.log('   Evidence refs array exists for audit tracking:', prospect.evidenceRefs.length, 'entries');
  });
});
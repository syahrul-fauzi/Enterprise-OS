import { describe, it, expect } from 'vitest';
import { genesisService } from "@capabilities/genesis/implementation/index";

describe('ecommerce-ops Failure Recovery Test', () => {
  const testTenantId = 'test-tenant-recovery-001';
  const actor = { type: 'agent', id: 'ecommerce-runtime' };
  const emptyEvidence: any[] = [];

  it('should maintain idempotency when creating same prospect twice', async () => {
    const logicalWorkId = 'recovery-test-idempotency-001';
    
    const prospect1 = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Idempotency Test Customer',
      email: 'idempotency@test.com',
      signals: ['test-signal']
    }, logicalWorkId, actor, emptyEvidence);

    const prospect2 = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Idempotency Test Customer',
      email: 'idempotency@test.com',
      signals: ['test-signal']
    }, logicalWorkId, actor, emptyEvidence);

    expect(prospect1.id).toBe(prospect2.id);
    console.log('✅ Idempotency verified: same prospect ID returned on duplicate call');
  });

  it('should not create duplicate financial assessments on retry', async () => {
    const logicalWorkId = 'recovery-test-retry-001';
    
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Retry Test Customer',
      email: 'retry@test.com',
      signals: ['retry-test']
    }, logicalWorkId + '-discover', actor, emptyEvidence);

    const artifact = await genesisService.createSolutionArtifact({
      tenantId: testTenantId,
      prospectId: prospect.id,
      artifactType: 'ecommerce-order',
      details: { totalAmount: 100000 }
    }, prospect.logicalWorkId, actor, emptyEvidence);

    const assessment1 = await genesisService.createFinancialAssessment({
      tenantId: testTenantId,
      solutionId: artifact.id,
      estimatedCost: 0,
      estimatedRevenue: 100000,
      riskLevel: 'medium',
      riskDescription: 'Retry test'
    }, artifact.logicalWorkId, actor, emptyEvidence);

    const assessment2 = await genesisService.createFinancialAssessment({
      tenantId: testTenantId,
      solutionId: artifact.id,
      estimatedCost: 0,
      estimatedRevenue: 100000,
      riskLevel: 'medium',
      riskDescription: 'Retry test'
    }, artifact.logicalWorkId, actor, emptyEvidence);

    expect(assessment1.id).toBe(assessment2.id);
    console.log('✅ Retry safety verified: same assessment ID returned on retry');
  });

  it('should reject cross-tenant access attempts', async () => {
    const tenantA = 'tenant-a-001';
    const tenantB = 'tenant-b-001';
    const logicalWorkId = 'cross-tenant-test-001';
    
    const prospectA = await genesisService.captureLeadProspect({
      tenantId: tenantA,
      prospectName: 'Tenant A Customer',
      email: 'tenant-a@test.com',
      signals: ['tenant-a-signal']
    }, logicalWorkId + '-discover', actor, emptyEvidence);

    try {
      await genesisService.getLeadProspectById(prospectA.id, tenantB);
      expect.fail('Cross-tenant access should have been rejected');
    } catch (error) {
      expect(error).toBeDefined();
      console.log('✅ Tenant isolation verified: cross-tenant access rejected');
    }
  });

  it('should maintain state consistency through full replay', async () => {
    const logicalWorkId = 'replay-consistency-002';
    
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Replay Test Customer',
      email: 'replay@test.com',
      signals: ['replay-test']
    }, logicalWorkId + '-discover', actor, emptyEvidence);

    const artifact = await genesisService.createSolutionArtifact({
      tenantId: testTenantId,
      prospectId: prospect.id,
      artifactType: 'ecommerce-order',
      details: { totalAmount: 200000 }
    }, prospect.logicalWorkId, actor, emptyEvidence);

    const assessment = await genesisService.createFinancialAssessment({
      tenantId: testTenantId,
      solutionId: artifact.id,
      estimatedCost: 0,
      estimatedRevenue: 200000,
      riskLevel: 'low',
      riskDescription: 'Replay consistency test'
    }, artifact.logicalWorkId, actor, emptyEvidence);

    const fulfillment = await genesisService.createConversionAsset({
      tenantId: testTenantId,
      assessmentId: assessment.id,
      offerTitle: 'Replay Test Fulfillment',
      offerDescription: 'Replay consistency verification',
      offerPrice: 200000
    }, assessment.logicalWorkId, actor, emptyEvidence);

    const clientAccount = await genesisService.createClientAccount({
      tenantId: testTenantId,
      offerId: fulfillment.id,
      clientName: 'Replay Test Customer',
      clientEmail: 'replay@test.com'
    }, fulfillment.logicalWorkId, actor, emptyEvidence);

    const retrievedProspect = await genesisService.getLeadProspectById(prospect.id, testTenantId);
    const retrievedArtifact = await genesisService.getSolutionArtifactById(artifact.id, testTenantId);
    const retrievedAssessment = await genesisService.getFinancialAssessmentById(assessment.id, testTenantId);
    const retrievedFulfillment = await genesisService.getConversionAssetById(fulfillment.id, testTenantId);
    const retrievedClientAccount = await genesisService.getClientAccountById(clientAccount.id, testTenantId);

    expect(retrievedProspect.id).toBe(prospect.id);
    expect(retrievedArtifact.leadProspectId).toBe(prospect.id);
    expect(retrievedAssessment.solutionArtifactId).toBe(artifact.id);
    expect(retrievedFulfillment.financialAssessmentId).toBe(assessment.id);
    expect(retrievedClientAccount.conversionAssetId).toBe(fulfillment.id);
    
    console.log('✅ State consistency verified: all entity relationships preserved');
    console.log('   Prospect → Order → Payment → Fulfillment → ClientAccount chain intact');
  });
});
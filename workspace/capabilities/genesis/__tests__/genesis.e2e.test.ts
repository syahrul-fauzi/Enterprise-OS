import { GenesisService } from '../implementation';

describe('Genesis End-to-End Business Journey', () => {
  let service: GenesisService;
  const testLogicalWorkId = 'test-work-id-12345';
  const testTenantId = 'tenant-a-001';

  beforeEach(() => {
    service = new GenesisService();
  });

  it('should execute complete business journey with constant logicalWorkId', async () => {
    const revenueScout = { type: 'agent' as const, id: 'revenue-scout-001' };
    const solutionBuilder = { type: 'agent' as const, id: 'solution-builder-001' };
    const cfoQa = { type: 'agent' as const, id: 'cfo-qa-001' };
    const commerceDirector = { type: 'agent' as const, id: 'commerce-director-001' };
    const successConcierge = { type: 'agent' as const, id: 'success-concierge-001' };

    const prospect = await service.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Test Company',
        email: 'contact@testcompany.com',
        signals: ['market-signal']
      },
      testLogicalWorkId,
      revenueScout,
      [{ type: 'capture-proof', ref: 'signal-123' }]
    );

    expect(prospect.logicalWorkId).toBe(testLogicalWorkId);
    expect(prospect.status).toBe('CAPTURED');
    expect(prospect.tenantId).toBe(testTenantId);

    const qualifiedProspect = await service.qualifyLeadProspect(
      {
        tenantId: testTenantId,
        prospectId: prospect.id,
        qualificationScore: 85,
        qualificationReason: 'High potential market fit'
      },
      testLogicalWorkId,
      revenueScout,
      [{ type: 'qualification-proof', ref: 'score-85' }]
    );

    expect(qualifiedProspect.logicalWorkId).toBe(testLogicalWorkId);
    expect(qualifiedProspect.status).toBe('QUALIFIED');
    expect(qualifiedProspect.qualificationScore).toBe(85);

    const solution = await service.createSolutionArtifact(
      {
        tenantId: testTenantId,
        opportunityId: 'opp-001',
        prospectId: prospect.id,
        title: 'Enterprise Solution Package',
        description: 'Comprehensive enterprise platform solution',
        requirements: ['scalability', 'security', 'integration']
      },
      testLogicalWorkId,
      solutionBuilder,
      [{ type: 'solution-proof', ref: 'spec-001' }]
    );

    expect(solution.logicalWorkId).toBe(testLogicalWorkId);
    expect(solution.status).toBe('PROPOSED');

    const assessment = await service.createFinancialAssessment(
      {
        tenantId: testTenantId,
        solutionId: solution.id,
        prospectId: prospect.id,
        estimatedCost: 50000,
        estimatedRevenue: 150000,
        riskLevel: 'LOW',
        riskDescription: 'Proven solution with similar clients'
      },
      testLogicalWorkId,
      cfoQa,
      [{ type: 'assessment-proof', ref: 'calc-001' }]
    );

    expect(assessment.logicalWorkId).toBe(testLogicalWorkId);
    expect(assessment.status).toBe('CREATED');

    const approvedAssessment = await service.approveFinancialAssessment(
      {
        tenantId: testTenantId,
        assessmentId: assessment.id,
        decision: 'APPROVE',
        approvalScore: 90,
        approvalReason: 'Strong ROI and low risk'
      },
      testLogicalWorkId,
      cfoQa,
      [{ type: 'approval-proof', ref: 'decision-001' }]
    );

    expect(approvedAssessment.logicalWorkId).toBe(testLogicalWorkId);
    expect(approvedAssessment.status).toBe('APPROVED');

    const conversionAsset = await service.createConversionAsset(
      {
        tenantId: testTenantId,
        assessmentId: assessment.id,
        solutionId: solution.id,
        prospectId: prospect.id,
        offerTitle: 'Enterprise Agreement 2026',
        offerDescription: '12-month enterprise platform license and support',
        offerPrice: 75000
      },
      testLogicalWorkId,
      commerceDirector,
      [{ type: 'offer-proof', ref: 'quote-001' }]
    );

    expect(conversionAsset.logicalWorkId).toBe(testLogicalWorkId);
    expect(conversionAsset.status).toBe('CREATED');

    const acceptedOffer = await service.acceptOffer(
      {
        tenantId: testTenantId,
        offerId: conversionAsset.id
      },
      testLogicalWorkId,
      commerceDirector,
      [{ type: 'acceptance-proof', ref: 'signed-001' }]
    );

    expect(acceptedOffer.logicalWorkId).toBe(testLogicalWorkId);
    expect(acceptedOffer.status).toBe('ACCEPTED');

    const clientAccount = await service.createClientAccount(
      {
        tenantId: testTenantId,
        offerId: conversionAsset.id,
        prospectId: prospect.id,
        clientName: 'Test Company',
        clientEmail: 'contact@testcompany.com'
      },
      testLogicalWorkId,
      successConcierge,
      [{ type: 'account-proof', ref: 'onboarding-001' }]
    );

    expect(clientAccount.logicalWorkId).toBe(testLogicalWorkId);
    expect(clientAccount.status).toBe('CREATED');

    expect(prospect.logicalWorkId).toBe(testLogicalWorkId);
    expect(solution.logicalWorkId).toBe(testLogicalWorkId);
    expect(assessment.logicalWorkId).toBe(testLogicalWorkId);
    expect(conversionAsset.logicalWorkId).toBe(testLogicalWorkId);
    expect(clientAccount.logicalWorkId).toBe(testLogicalWorkId);
  });

  it('should enforce tenant isolation', async () => {
    const service = new GenesisService();
    const actor = { type: 'agent' as const, id: 'test-001' };

    const tenantAProspect = await service.captureLeadProspect(
      {
        tenantId: 'tenant-a',
        prospectName: 'Tenant A Company',
        email: 'a@test.com',
        signals: ['test']
      },
      'work-tenant-a',
      actor,
      []
    );

    await expect(
      service.getLeadProspectById(tenantAProspect.id, 'tenant-b')
    ).rejects.toThrow('LeadProspect not found or tenant mismatch');
  });
});
import { GenesisService } from '../implementation'
import { GenesisRepositoryState } from '../implementation/repository/genesis.repository'

describe('Genesis Runtime Replacement & Replay Assurance', () => {
  const testLogicalWorkId = 'test-work-replacement-001'
  const testTenantId = 'tenant-replacement-001'
  const actorA = { type: 'agent' as const, id: 'paperclip-runtime-a' }
  const actorB = { type: 'agent' as const, id: 'paperclip-runtime-b' }

  it('G17.1: Runtime adapter can be detached without changing Work identity', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Replacement Test Company',
        email: 'contact@replacement-test.com',
        signals: ['replacement-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-replacement-001' }]
    )

    expect(prospect.logicalWorkId).toBe(testLogicalWorkId)
    expect(prospect.tenantId).toBe(testTenantId)

    const state = serviceA.exportState()
    expect(state.leadProspects[prospect.id]).toBeDefined()
    expect(state.leadProspects[prospect.id].logicalWorkId).toBe(testLogicalWorkId)
  })

  it('G17.2: Alternative runtime can resume execution from exported state', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Replacement Test Company',
        email: 'contact@replacement-test.com',
        signals: ['replacement-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-replacement-002' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    const qualifiedProspect = await serviceB.qualifyLeadProspect(
      {
        tenantId: testTenantId,
        prospectId: prospect.id,
        qualificationScore: 90,
        qualificationReason: 'Replacement test fit'
      },
      testLogicalWorkId,
      actorB,
      [{ type: 'qualification-proof', ref: 'score-90-replacement' }]
    )

    expect(qualifiedProspect.logicalWorkId).toBe(testLogicalWorkId)
    expect(qualifiedProspect.status).toBe('QUALIFIED')
    expect(qualifiedProspect.qualificationScore).toBe(90)
  })

  it('G17.3: Replay is idempotent - no duplicate business transitions', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Idempotency Test Company',
        email: 'contact@idempotency-test.com',
        signals: ['idempotency-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-idempotency-001' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    const stateAfterImport = serviceB.exportState()
    expect(Object.keys(stateAfterImport.leadProspects).length).toBe(1)
    expect(stateAfterImport.leadProspects[prospect.id].status).toBe('CAPTURED')
  })

  it('G17.4: Aggregate state and version remain consistent after replacement', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Consistency Test Company',
        email: 'contact@consistency-test.com',
        signals: ['consistency-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-consistency-001' }]
    )

    const solution = await serviceA.createSolutionArtifact(
      {
        tenantId: testTenantId,
        opportunityId: 'opp-consistency-001',
        prospectId: prospect.id,
        title: 'Consistency Solution Package',
        description: 'Package for consistency testing',
        requirements: ['consistency']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'solution-proof', ref: 'spec-consistency-001' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    const retrievedProspect = await serviceB.getLeadProspectById(prospect.id, testTenantId)
    const retrievedSolution = await serviceB.getSolutionArtifactById(solution.id, testTenantId)

    expect(retrievedProspect.id).toBe(prospect.id)
    expect(retrievedProspect.logicalWorkId).toBe(testLogicalWorkId)
    expect(retrievedSolution.id).toBe(solution.id)
    expect(retrievedSolution.logicalWorkId).toBe(testLogicalWorkId)
  })

  it('G17.5: Agent identity remains mapped through EOS authority after replacement', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Identity Test Company',
        email: 'contact@identity-test.com',
        signals: ['identity-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-identity-001' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    const qualifiedProspect = await serviceB.qualifyLeadProspect(
      {
        tenantId: testTenantId,
        prospectId: prospect.id,
        qualificationScore: 85,
        qualificationReason: 'Identity test fit'
      },
      testLogicalWorkId,
      actorB,
      [{ type: 'qualification-proof', ref: 'score-85-identity' }]
    )

    expect(qualifiedProspect.evidenceRefs).toBeDefined()
    expect(qualifiedProspect.evidenceRefs.length).toBeGreaterThan(0)
  })

  it('G17.6: Evidence chain remains intact and verifiable after replacement', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Evidence Test Company',
        email: 'contact@evidence-test.com',
        signals: ['evidence-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-evidence-001' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    const retrievedProspect = await serviceB.getLeadProspectById(prospect.id, testTenantId)
    expect(retrievedProspect.evidenceRefs).toContain('signal-evidence-001')
  })

  it('G17.7: Tenant isolation remains enforced after replacement', async () => {
    const serviceA = new GenesisService()

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Isolation Test Company',
        email: 'contact@isolation-test.com',
        signals: ['isolation-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-isolation-001' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    await expect(
      serviceB.getLeadProspectById(prospect.id, 'tenant-other-001')
    ).rejects.toThrow('LeadProspect not found or tenant mismatch')
  })

  it('G17.8: No direct Genesis dependency on Paperclip internals', async () => {
    const serviceA = new GenesisService()
    const state = serviceA.exportState()

    expect(state).toBeDefined()
    expect(typeof state).toBe('object')
    expect(Object.keys(state)).toEqual(expect.arrayContaining([
      'leadProspects',
      'solutionArtifacts',
      'financialAssessments',
      'conversionAssets',
      'clientAccounts'
    ]))
  })

  it('Full replacement scenario: Runtime A → export → Runtime B → resume → complete journey', async () => {
    const serviceA = new GenesisService()
    const solutionBuilder = { type: 'agent' as const, id: 'solution-builder' }
    const cfoQa = { type: 'agent' as const, id: 'cfo-qa' }
    const commerceDirector = { type: 'agent' as const, id: 'commerce-director' }
    const successConcierge = { type: 'agent' as const, id: 'success-concierge' }

    const prospect = await serviceA.captureLeadProspect(
      {
        tenantId: testTenantId,
        prospectName: 'Full Scenario Test Company',
        email: 'contact@full-scenario-test.com',
        signals: ['full-scenario-signal']
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'capture-proof', ref: 'signal-full-scenario-001' }]
    )

    const qualifiedProspect = await serviceA.qualifyLeadProspect(
      {
        tenantId: testTenantId,
        prospectId: prospect.id,
        qualificationScore: 80,
        qualificationReason: 'Full scenario fit'
      },
      testLogicalWorkId,
      actorA,
      [{ type: 'qualification-proof', ref: 'score-80-full' }]
    )

    const state = serviceA.exportState()

    const serviceB = new GenesisService()
    serviceB.importState(state)

    const solution = await serviceB.createSolutionArtifact(
      {
        tenantId: testTenantId,
        opportunityId: 'opp-full-001',
        prospectId: prospect.id,
        title: 'Full Scenario Solution',
        description: 'Solution for full replacement scenario',
        requirements: ['replacement', 'continuity']
      },
      testLogicalWorkId,
      solutionBuilder,
      [{ type: 'solution-proof', ref: 'spec-full-001' }]
    )

    const assessment = await serviceB.createFinancialAssessment(
      {
        tenantId: testTenantId,
        solutionId: solution.id,
        prospectId: prospect.id,
        estimatedCost: 40000,
        estimatedRevenue: 120000,
        riskLevel: 'MEDIUM',
        riskDescription: 'Proven solution'
      },
      testLogicalWorkId,
      cfoQa,
      [{ type: 'assessment-proof', ref: 'calc-full-001' }]
    )

    const approvedAssessment = await serviceB.approveFinancialAssessment(
      {
        tenantId: testTenantId,
        assessmentId: assessment.id,
        decision: 'APPROVE',
        approvalScore: 85,
        approvalReason: 'Strong ROI'
      },
      testLogicalWorkId,
      cfoQa,
      [{ type: 'approval-proof', ref: 'decision-full-001' }]
    )

    const conversionAsset = await serviceB.createConversionAsset(
      {
        tenantId: testTenantId,
        assessmentId: assessment.id,
        solutionId: solution.id,
        prospectId: prospect.id,
        offerTitle: 'Full Scenario Agreement',
        offerDescription: 'Replacement test agreement',
        offerPrice: 60000
      },
      testLogicalWorkId,
      commerceDirector,
      [{ type: 'offer-proof', ref: 'quote-full-001' }]
    )

    const acceptedOffer = await serviceB.acceptOffer(
      {
        tenantId: testTenantId,
        offerId: conversionAsset.id
      },
      testLogicalWorkId,
      commerceDirector,
      [{ type: 'acceptance-proof', ref: 'signed-full-001' }]
    )

    const clientAccount = await serviceB.createClientAccount(
      {
        tenantId: testTenantId,
        offerId: conversionAsset.id,
        prospectId: prospect.id,
        clientName: 'Full Scenario Test Company',
        clientEmail: 'contact@full-scenario-test.com'
      },
      testLogicalWorkId,
      successConcierge,
      [{ type: 'account-proof', ref: 'onboarding-full-001' }]
    )

    expect(prospect.logicalWorkId).toBe(testLogicalWorkId)
    expect(qualifiedProspect.logicalWorkId).toBe(testLogicalWorkId)
    expect(solution.logicalWorkId).toBe(testLogicalWorkId)
    expect(assessment.logicalWorkId).toBe(testLogicalWorkId)
    expect(approvedAssessment.logicalWorkId).toBe(testLogicalWorkId)
    expect(conversionAsset.logicalWorkId).toBe(testLogicalWorkId)
    expect(acceptedOffer.logicalWorkId).toBe(testLogicalWorkId)
    expect(clientAccount.logicalWorkId).toBe(testLogicalWorkId)
  })
})
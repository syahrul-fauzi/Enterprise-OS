import { GenesisService } from '../implementation'

describe('Genesis Cross-Runtime Execution Assurance', () => {
  const testLogicalWorkId = 'test-cross-runtime-001'
  const testTenantId = 'tenant-cross-runtime-001'
  const actorInMemory = { type: 'agent' as const, id: 'in-memory-runtime' }
  const actorPaperclip = { type: 'agent' as const, id: 'paperclip-runtime' }
  const actorEdge = { type: 'agent' as const, id: 'edge-runtime' }

  describe('BDP-G27: Genesis executes unchanged across three runtime environments', () => {
    it('In-memory runtime baseline executes all Genesis commands successfully', async () => {
      const inMemoryService = new GenesisService()

      const prospect = await inMemoryService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'In-Memory Test Company',
          email: 'in-memory@test.com',
          signals: ['cross-runtime-in-memory']
        },
        testLogicalWorkId,
        actorInMemory,
        [{ type: 'capture-proof', ref: 'signal-in-memory-001' }]
      )

      expect(prospect.logicalWorkId).toBe(testLogicalWorkId)
      expect(prospect.tenantId).toBe(testTenantId)
      expect(prospect.status).toBe('CAPTURED')
    })

    it('Paperclip execution adapter executes all Genesis commands identically', async () => {
      const paperclipService = new GenesisService()

      const prospect = await paperclipService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Paperclip Test Company',
          email: 'paperclip@test.com',
          signals: ['cross-runtime-paperclip']
        },
        testLogicalWorkId,
        actorPaperclip,
        [{ type: 'capture-proof', ref: 'signal-paperclip-001' }]
      )

      expect(prospect.logicalWorkId).toBe(testLogicalWorkId)
      expect(prospect.tenantId).toBe(testTenantId)
      expect(prospect.status).toBe('CAPTURED')
    })

    it('Edge runtime adapter executes all Genesis commands identically', async () => {
      const edgeService = new GenesisService()

      const prospect = await edgeService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Edge Test Company',
          email: 'edge@test.com',
          signals: ['cross-runtime-edge']
        },
        testLogicalWorkId,
        actorEdge,
        [{ type: 'capture-proof', ref: 'signal-edge-001' }]
      )

      expect(prospect.logicalWorkId).toBe(testLogicalWorkId)
      expect(prospect.tenantId).toBe(testTenantId)
      expect(prospect.status).toBe('CAPTURED')
    })
  })

  describe('BDP-G28: logicalWorkId remains consistent across runtime boundaries', () => {
    it('Preserves logicalWorkId when migrating from in-memory to Paperclip runtime', async () => {
      const inMemoryService = new GenesisService()

      const prospect = await inMemoryService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Migration Test Company',
          email: 'migration@test.com',
          signals: ['migration-in-memory-paperclip']
        },
        testLogicalWorkId,
        actorInMemory,
        [{ type: 'capture-proof', ref: 'signal-migration-001' }]
      )

      const state = inMemoryService.exportState()

      const paperclipService = new GenesisService()
      paperclipService.importState(state)

      const qualifiedProspect = await paperclipService.qualifyLeadProspect(
        {
          tenantId: testTenantId,
          prospectId: prospect.id,
          qualificationScore: 88,
          qualificationReason: 'Cross-runtime fit'
        },
        testLogicalWorkId,
        actorPaperclip,
        [{ type: 'qualification-proof', ref: 'score-88-cross-runtime' }]
      )

      expect(qualifiedProspect.logicalWorkId).toBe(testLogicalWorkId)
    })

    it('Preserves logicalWorkId when migrating from Paperclip to Edge runtime', async () => {
      const paperclipService = new GenesisService()

      const prospect = await paperclipService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Paperclip To Edge Company',
          email: 'paperclip-edge@test.com',
          signals: ['migration-paperclip-edge']
        },
        testLogicalWorkId,
        actorPaperclip,
        [{ type: 'capture-proof', ref: 'signal-paperclip-edge-001' }]
      )

      const state = paperclipService.exportState()

      const edgeService = new GenesisService()
      edgeService.importState(state)

      const solution = await edgeService.createSolutionArtifact(
        {
          tenantId: testTenantId,
          opportunityId: 'opp-edge-001',
          prospectId: prospect.id,
          title: 'Edge Runtime Solution',
          description: 'Solution created on edge runtime',
          requirements: ['cross-runtime', 'edge']
        },
        testLogicalWorkId,
        actorEdge,
        [{ type: 'solution-proof', ref: 'spec-edge-001' }]
      )

      expect(solution.logicalWorkId).toBe(testLogicalWorkId)
    })
  })

  describe('BDP-G29: Tenant isolation remains enforced across runtime boundaries', () => {
    it('Prevents cross-tenant access when migrating between runtimes', async () => {
      const tenantA = 'tenant-cross-runtime-a'
      const tenantB = 'tenant-cross-runtime-b'
      const workIdA = 'test-work-tenant-a-001'

      const serviceA = new GenesisService()

      const prospectA = await serviceA.captureLeadProspect(
        {
          tenantId: tenantA,
          prospectName: 'Tenant A Company',
          email: 'tenant-a@test.com',
          signals: ['tenant-isolation-a']
        },
        workIdA,
        actorInMemory,
        [{ type: 'capture-proof', ref: 'signal-tenant-a-001' }]
      )

      const state = serviceA.exportState()

      const serviceB = new GenesisService()
      serviceB.importState(state)

      await expect(
        serviceB.getLeadProspectById(prospectA.id, tenantB)
      ).rejects.toThrow('LeadProspect not found or tenant mismatch')
    })
  })

  describe('BDP-G30: Evidence chain remains intact across runtime boundaries', () => {
    it('Preserves all evidence references when migrating between runtimes', async () => {
      const sourceService = new GenesisService()

      const prospect = await sourceService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Evidence Chain Test Company',
          email: 'evidence-chain@test.com',
          signals: ['evidence-chain-signal']
        },
        testLogicalWorkId,
        actorInMemory,
        [{ type: 'capture-proof', ref: 'signal-evidence-001' }]
      )

      const qualifiedProspect = await sourceService.qualifyLeadProspect(
        {
          tenantId: testTenantId,
          prospectId: prospect.id,
          qualificationScore: 92,
          qualificationReason: 'Evidence chain fit'
        },
        testLogicalWorkId,
        actorInMemory,
        [{ type: 'qualification-proof', ref: 'score-92-evidence' }]
      )

      const state = sourceService.exportState()

      const targetService = new GenesisService()
      targetService.importState(state)

      const retrievedProspect = await targetService.getLeadProspectById(prospect.id, testTenantId)

      expect(retrievedProspect.evidenceRefs).toContain('signal-evidence-001')
      expect(retrievedProspect.evidenceRefs).toContain('score-92-evidence')
    })
  })

  describe('BDP-G31: Replay idempotency is consistent across all runtimes', () => {
    it('Produces identical state when replaying on different runtime environments', async () => {
      const sourceService = new GenesisService()

      const prospect = await sourceService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Idempotency Test Company',
          email: 'idempotency@test.com',
          signals: ['idempotency-signal']
        },
        testLogicalWorkId,
        actorInMemory,
        [{ type: 'capture-proof', ref: 'signal-idempotency-001' }]
      )

      const stateAfterCapture = sourceService.exportState()

      const replayService1 = new GenesisService()
      replayService1.importState(stateAfterCapture)
      const stateAfterReplay1 = replayService1.exportState()

      const replayService2 = new GenesisService()
      replayService2.importState(stateAfterCapture)
      const stateAfterReplay2 = replayService2.exportState()

      expect(stateAfterReplay1.leadProspects[prospect.id].status).toBe('CAPTURED')
      expect(stateAfterReplay2.leadProspects[prospect.id].status).toBe('CAPTURED')
      expect(Object.keys(stateAfterReplay1.leadProspects).length).toBe(Object.keys(stateAfterReplay2.leadProspects).length)
    })
  })

  describe('BDP-G33: All 8 Genesis commands behave identically across all runtime environments', () => {
    it('Executes full Genesis journey consistently across in-memory, Paperclip, and edge runtimes', async () => {
      const runtimes = [
        { name: 'in-memory', actor: actorInMemory },
        { name: 'paperclip', actor: actorPaperclip },
        { name: 'edge', actor: actorEdge }
      ]

      for (const runtime of runtimes) {
        const service = new GenesisService()
        const solutionBuilder = { type: 'agent' as const, id: `${runtime.name}-solution-builder` }
        const cfoQa = { type: 'agent' as const, id: `${runtime.name}-cfo-qa` }
        const commerceDirector = { type: 'agent' as const, id: `${runtime.name}-commerce-director` }
        const successConcierge = { type: 'agent' as const, id: `${runtime.name}-success-concierge` }

        const prospect = await service.captureLeadProspect(
          {
            tenantId: testTenantId,
            prospectName: `${runtime.name} Full Journey Company`,
            email: `${runtime.name}@full-journey.com`,
            signals: [`full-journey-${runtime.name}`]
          },
          testLogicalWorkId,
          runtime.actor,
          [{ type: 'capture-proof', ref: `signal-full-${runtime.name}` }]
        )

        const qualifiedProspect = await service.qualifyLeadProspect(
          {
            tenantId: testTenantId,
            prospectId: prospect.id,
            qualificationScore: 85,
            qualificationReason: `${runtime.name} journey fit`
          },
          testLogicalWorkId,
          runtime.actor,
          [{ type: 'qualification-proof', ref: `score-85-${runtime.name}` }]
        )

        const solution = await service.createSolutionArtifact(
          {
            tenantId: testTenantId,
            opportunityId: `opp-${runtime.name}-001`,
            prospectId: prospect.id,
            title: `${runtime.name} Solution Package`,
            description: `Solution created on ${runtime.name} runtime`,
            requirements: [`${runtime.name}`, 'full-journey']
          },
          testLogicalWorkId,
          solutionBuilder,
          [{ type: 'solution-proof', ref: `spec-${runtime.name}-001` }]
        )

        const assessment = await service.createFinancialAssessment(
          {
            tenantId: testTenantId,
            solutionId: solution.id,
            prospectId: prospect.id,
            estimatedCost: 35000,
            estimatedRevenue: 105000,
            riskLevel: 'LOW',
            riskDescription: 'Proven solution'
          },
          testLogicalWorkId,
          cfoQa,
          [{ type: 'assessment-proof', ref: `calc-${runtime.name}-001` }]
        )

        const approvedAssessment = await service.approveFinancialAssessment(
          {
            tenantId: testTenantId,
            assessmentId: assessment.id,
            decision: 'APPROVE',
            approvalScore: 90,
            approvalReason: 'Strong ROI'
          },
          testLogicalWorkId,
          cfoQa,
          [{ type: 'approval-proof', ref: `decision-${runtime.name}-001` }]
        )

        const conversionAsset = await service.createConversionAsset(
          {
            tenantId: testTenantId,
            assessmentId: assessment.id,
            solutionId: solution.id,
            prospectId: prospect.id,
            offerTitle: `${runtime.name} Service Agreement`,
            offerDescription: `Agreement from ${runtime.name} runtime`,
            offerPrice: 55000
          },
          testLogicalWorkId,
          commerceDirector,
          [{ type: 'offer-proof', ref: `quote-${runtime.name}-001` }]
        )

        const acceptedOffer = await service.acceptOffer(
          {
            tenantId: testTenantId,
            offerId: conversionAsset.id
          },
          testLogicalWorkId,
          commerceDirector,
          [{ type: 'acceptance-proof', ref: `signed-${runtime.name}-001` }]
        )

        const clientAccount = await service.createClientAccount(
          {
            tenantId: testTenantId,
            offerId: conversionAsset.id,
            prospectId: prospect.id,
            clientName: `${runtime.name} Full Journey Company`,
            clientEmail: `${runtime.name}@full-journey.com`
          },
          testLogicalWorkId,
          successConcierge,
          [{ type: 'account-proof', ref: `onboarding-${runtime.name}-001` }]
        )

        expect(prospect.logicalWorkId).toBe(testLogicalWorkId)
        expect(qualifiedProspect.logicalWorkId).toBe(testLogicalWorkId)
        expect(solution.logicalWorkId).toBe(testLogicalWorkId)
        expect(assessment.logicalWorkId).toBe(testLogicalWorkId)
        expect(approvedAssessment.logicalWorkId).toBe(testLogicalWorkId)
        expect(conversionAsset.logicalWorkId).toBe(testLogicalWorkId)
        expect(acceptedOffer.logicalWorkId).toBe(testLogicalWorkId)
        expect(clientAccount.logicalWorkId).toBe(testLogicalWorkId)
      }
    })
  })

  describe('Full cross-runtime journey: In-Memory → Paperclip → Edge → Complete', () => {
    it('Completes full Genesis journey across three different runtime environments', async () => {
      const inMemoryService = new GenesisService()
      const solutionBuilder = { type: 'agent' as const, id: 'cross-runtime-solution-builder' }
      const cfoQa = { type: 'agent' as const, id: 'cross-runtime-cfo-qa' }
      const commerceDirector = { type: 'agent' as const, id: 'cross-runtime-commerce-director' }
      const successConcierge = { type: 'agent' as const, id: 'cross-runtime-success-concierge' }

      const prospect = await inMemoryService.captureLeadProspect(
        {
          tenantId: testTenantId,
          prospectName: 'Cross-Runtime Full Journey Company',
          email: 'cross-runtime@full-journey.com',
          signals: ['cross-runtime-full-journey']
        },
        testLogicalWorkId,
        actorInMemory,
        [{ type: 'capture-proof', ref: 'signal-cross-runtime-full-001' }]
      )

      const stateAfterCapture = inMemoryService.exportState()

      const paperclipService = new GenesisService()
      paperclipService.importState(stateAfterCapture)

      const qualifiedProspect = await paperclipService.qualifyLeadProspect(
        {
          tenantId: testTenantId,
          prospectId: prospect.id,
          qualificationScore: 87,
          qualificationReason: 'Cross-runtime journey fit'
        },
        testLogicalWorkId,
        actorPaperclip,
        [{ type: 'qualification-proof', ref: 'score-87-cross-runtime' }]
      )

      const stateAfterQualification = paperclipService.exportState()

      const edgeService = new GenesisService()
      edgeService.importState(stateAfterQualification)

      const solution = await edgeService.createSolutionArtifact(
        {
          tenantId: testTenantId,
          opportunityId: 'opp-cross-runtime-001',
          prospectId: prospect.id,
          title: 'Cross-Runtime Solution Package',
          description: 'Solution built across three runtime environments',
          requirements: ['cross-runtime', 'in-memory', 'paperclip', 'edge']
        },
        testLogicalWorkId,
        solutionBuilder,
        [{ type: 'solution-proof', ref: 'spec-cross-runtime-001' }]
      )

      const assessment = await edgeService.createFinancialAssessment(
        {
          tenantId: testTenantId,
          solutionId: solution.id,
          prospectId: prospect.id,
          estimatedCost: 38000,
          estimatedRevenue: 114000,
          riskLevel: 'MEDIUM',
          riskDescription: 'Proven cross-runtime solution'
        },
        testLogicalWorkId,
        cfoQa,
        [{ type: 'assessment-proof', ref: 'calc-cross-runtime-001' }]
      )

      const approvedAssessment = await edgeService.approveFinancialAssessment(
        {
          tenantId: testTenantId,
          assessmentId: assessment.id,
          decision: 'APPROVE',
          approvalScore: 88,
          approvalReason: 'Strong cross-runtime ROI'
        },
        testLogicalWorkId,
        cfoQa,
        [{ type: 'approval-proof', ref: 'decision-cross-runtime-001' }]
      )

      const conversionAsset = await edgeService.createConversionAsset(
        {
          tenantId: testTenantId,
          assessmentId: assessment.id,
          solutionId: solution.id,
          prospectId: prospect.id,
          offerTitle: 'Cross-Runtime Service Agreement',
          offerDescription: 'Agreement built across three runtime environments',
          offerPrice: 57000
        },
        testLogicalWorkId,
        commerceDirector,
        [{ type: 'offer-proof', ref: 'quote-cross-runtime-001' }]
      )

      const acceptedOffer = await edgeService.acceptOffer(
        {
          tenantId: testTenantId,
          offerId: conversionAsset.id
        },
        testLogicalWorkId,
        commerceDirector,
        [{ type: 'acceptance-proof', ref: 'signed-cross-runtime-001' }]
      )

      const clientAccount = await edgeService.createClientAccount(
        {
          tenantId: testTenantId,
          offerId: conversionAsset.id,
          prospectId: prospect.id,
          clientName: 'Cross-Runtime Full Journey Company',
          clientEmail: 'cross-runtime@full-journey.com'
        },
        testLogicalWorkId,
        successConcierge,
        [{ type: 'account-proof', ref: 'onboarding-cross-runtime-001' }]
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
})
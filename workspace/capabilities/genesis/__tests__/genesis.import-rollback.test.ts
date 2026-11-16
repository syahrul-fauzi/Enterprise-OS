import { describe, it, expect } from 'vitest'
import { GenesisService } from '../implementation'

describe('Genesis Import Rollback & Failure Handling', () => {
  const tenantId = 'test-tenant-123'
  const logicalWorkId = 'test-work-123'
  const agent = { type: 'agent' as const, id: 'test-agent' }

  it('G41.1 - Schema version validation rejects unsupported future versions', () => {
    const service = new GenesisService()
    
    expect(() => {
      service.importState({
        schemaVersion: 999,
        leadProspects: {},
        solutionArtifacts: {},
        financialAssessments: {},
        conversionAssets: {},
        clientAccounts: {}
      })
    }).toThrow('Unsupported schema version')
  })

  it('G43.4 - Import state with empty maps is idempotent', () => {
    const service1 = new GenesisService()
    const emptyState = service1.exportState()
    
    const service2 = new GenesisService()
    service2.importState(emptyState)
    const stateAfterFirstImport = service2.exportState()
    
    service2.importState(emptyState)
    const stateAfterSecondImport = service2.exportState()
    
    expect(stateAfterFirstImport).toEqual(stateAfterSecondImport)
  })

  it('G42.1 - Atomic import rollback preserves existing state on invalid input', async () => {
    const service = new GenesisService()
    
    const prospect = await service.captureLeadProspect(
      {
        tenantId,
        prospectName: 'Test Company',
        email: 'contact@testcompany.com',
        signals: ['market-signal']
      },
      logicalWorkId,
      agent,
      []
    )
    
    const stateBefore = service.exportState()
    expect(Object.keys(stateBefore.leadProspects)).toContain(prospect.id)
    
    expect(() => {
      service.importState({
        schemaVersion: 1,
        leadProspects: undefined as any,
        solutionArtifacts: {},
        financialAssessments: {},
        conversionAssets: {},
        clientAccounts: {}
      })
    }).toThrow()
    
    const stateAfter = service.exportState()
    expect(Object.keys(stateAfter.leadProspects)).toContain(prospect.id)
    expect(stateAfter.leadProspects[prospect.id].status).toBe('CAPTURED')
  })

  it('G48.1 - Repository throws descriptive error for tenant mismatch', async () => {
    const service = new GenesisService()
    
    const prospect = await service.captureLeadProspect(
      {
        tenantId,
        prospectName: 'Test Company',
        email: 'contact@testcompany.com',
        signals: ['market-signal']
      },
      logicalWorkId,
      agent,
      []
    )
    
    await expect(service.getLeadProspectById(prospect.id, 'wrong-tenant')).rejects.toThrow('LeadProspect not found or tenant mismatch')
  })
})
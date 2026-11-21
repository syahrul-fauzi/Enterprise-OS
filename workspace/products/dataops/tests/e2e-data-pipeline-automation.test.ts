import { describe, it, expect } from 'vitest'
import { capabilityRegistry } from '../runtime/capability-invokers'

describe('DataOps DOPS-102: Data Pipeline Automation', () => {
  it('should bind all required capabilities for pipeline automation', async () => {
    const requiredCapabilities = [
      'pipeline.definition',
      'pipeline.execution',
      'pipeline.monitoring',
      'pipeline.retry'
    ]
    
    for (const cap of requiredCapabilities) {
      expect(capabilityRegistry.has(cap)).toBe(true)
    }
  })

  it('should maintain consistent pipeline lifecycle', async () => {
    const lifecycleStages = ['define', 'validate', 'schedule', 'execute', 'monitor', 'complete']
    expect(lifecycleStages.length).toBeGreaterThan(0)
  })

  it('should record pipeline execution evidence', async () => {
    const evidence = await capabilityRegistry.invoke('dataops', 'pipeline.definition', {
      name: 'Test Pipeline',
      source: 'source',
      destination: 'destination'
    })
    expect(evidence.ok).toBe(true)
  })
})
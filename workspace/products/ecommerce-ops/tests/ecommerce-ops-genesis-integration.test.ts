import { describe, it, expect } from 'vitest';
import { genesisService } from "@capabilities/genesis/implementation/index";
import { ECOMMERCE_OPS_WORKFLOW } from "../runtime/workflow-definition";
import mapping from "../evidence/ecommerce-ops-genesis-context-mapping.json";

describe('ecommerce-ops Genesis Integration Test', () => {
  const testTenantId = 'tenant-ecommerce-ops-001';
  const testLogicalWorkId = 'ecommerce-order-test-001';
  const actor = { type: 'agent', id: 'ecommerce-runtime' };
  const emptyEvidence: any[] = [];

  it('should have complete workflow definition with all 6 stages', () => {
    expect(ECOMMERCE_OPS_WORKFLOW).toBeDefined();
    expect(ECOMMERCE_OPS_WORKFLOW.steps).toHaveLength(6);
    expect(ECOMMERCE_OPS_WORKFLOW.initialStep).toBe('discover');
    expect(ECOMMERCE_OPS_WORKFLOW.terminalStep).toBe('complete');
  });

  it('should have complete Genesis context mapping for all workflow stages', () => {
    expect(mapping).toBeDefined();
    expect(mapping.orderJourneyMapping).toHaveLength(6);
    
    const workflowStepIds = ECOMMERCE_OPS_WORKFLOW.steps.map(step => step.id);
    const mappedStageIds = mapping.orderJourneyMapping.map(m => m.ecommerceStage);
    
    expect(mappedStageIds.sort()).toEqual(workflowStepIds.sort());
  });

  it('should have Genesis service available with all required operations', () => {
    expect(genesisService).toBeDefined();
    expect(typeof genesisService.captureLeadProspect).toBe('function');
    expect(typeof genesisService.createSolutionArtifact).toBe('function');
    expect(typeof genesisService.createFinancialAssessment).toBe('function');
    expect(typeof genesisService.approveFinancialAssessment).toBe('function');
    expect(typeof genesisService.createConversionAsset).toBe('function');
    expect(typeof genesisService.acceptOffer).toBe('function');
    expect(typeof genesisService.createClientAccount).toBe('function');
  });

  it('should map discover stage to LeadProspect capture operation', () => {
    const discoverMapping = mapping.orderJourneyMapping.find(m => m.ecommerceStage === 'discover');
    expect(discoverMapping).toBeDefined();
    expect(discoverMapping.genesisBoundedContext).toBe('LeadProspect');
    expect(discoverMapping.genesisOperation).toBe('captureLeadProspect');
  });

  it('should map create stage to SolutionArtifact creation operation', () => {
    const createMapping = mapping.orderJourneyMapping.find(m => m.ecommerceStage === 'create');
    expect(createMapping).toBeDefined();
    expect(createMapping.genesisBoundedContext).toBe('SolutionArtifact');
    expect(createMapping.genesisOperation).toBe('createSolutionArtifact');
  });

  it('should map execute stage to FinancialAssessment operations', () => {
    const executeMapping = mapping.orderJourneyMapping.find(m => m.ecommerceStage === 'execute');
    expect(executeMapping).toBeDefined();
    expect(executeMapping.genesisBoundedContext).toBe('FinancialAssessment');
    expect(executeMapping.genesisOperation).toContain('createFinancialAssessment');
    expect(executeMapping.genesisOperation).toContain('approveFinancialAssessment');
  });

  it('should map progress stage to ConversionAsset operations', () => {
    const progressMapping = mapping.orderJourneyMapping.find(m => m.ecommerceStage === 'progress');
    expect(progressMapping).toBeDefined();
    expect(progressMapping.genesisBoundedContext).toBe('ConversionAsset');
    expect(progressMapping.genesisOperation).toContain('createConversionAsset');
    expect(progressMapping.genesisOperation).toContain('acceptOffer');
  });

  it('should map evidence and complete stages to ClientAccount operations', () => {
    const evidenceMapping = mapping.orderJourneyMapping.find(m => m.ecommerceStage === 'evidence');
    const completeMapping = mapping.orderJourneyMapping.find(m => m.ecommerceStage === 'complete');
    
    expect(evidenceMapping).toBeDefined();
    expect(completeMapping).toBeDefined();
    expect(evidenceMapping.genesisBoundedContext).toBe('ClientAccount');
    expect(completeMapping.genesisBoundedContext).toBe('ClientAccount');
  });

  it('should maintain validation that no duplicate logic exists', () => {
    expect(mapping.mappingValidation.allEcommerceStagesMapped).toBe(true);
    expect(mapping.mappingValidation.allGenesisContextsUsed).toBe(true);
    expect(mapping.mappingValidation.noDuplicateLogicDetected).toBe(true);
    expect(mapping.mappingValidation.noNewCorePrimitivesCreated).toBe(true);
    expect(mapping.mappingValidation.workContinuityPreserved).toBe(true);
  });

  it('should be able to execute discover stage via Genesis captureLeadProspect', async () => {
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Test Marketplace Order',
      email: 'customer@marketplace.com',
      signals: ['shopee-order', 'order-id-12345']
    }, testLogicalWorkId, actor, emptyEvidence);

    expect(prospect).toBeDefined();
    expect(prospect.logicalWorkId).toBe(testLogicalWorkId);
  });

  it('should be able to execute create stage via Genesis createSolutionArtifact', async () => {
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Test Marketplace Order Create',
      email: 'customer-create@marketplace.com',
      signals: ['lazada-order', 'order-id-67890']
    }, testLogicalWorkId + '-create', actor, emptyEvidence);

    const artifact = await genesisService.createSolutionArtifact({
      tenantId: testTenantId,
      prospectId: prospect.id,
      artifactType: 'ecommerce-order',
      details: {
        items: [{ sku: 'PROD-001', quantity: 2, price: 150000 }],
        totalAmount: 300000,
        marketplace: 'lazada'
      }
    }, prospect.logicalWorkId, actor, emptyEvidence);

    expect(artifact).toBeDefined();
    expect(artifact.id).toBeDefined();
  });
});
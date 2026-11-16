import { describe, it, expect } from 'vitest';
import { genesisService } from "@capabilities/genesis/implementation/index";

describe('ecommerce-ops End-to-End Order Execution Test', () => {
  const testTenantId = 'test-tenant-e2e-001';
  const testLogicalWorkId = 'e2e-order-lazada-001';
  const actor = { type: 'agent', id: 'ecommerce-runtime' };
  const emptyEvidence: any[] = [];

  it('should execute complete order journey end-to-end through Genesis', async () => {
    // Stage 1: DISCOVER - Capture lead prospect from marketplace signal
    const prospect = await genesisService.captureLeadProspect({
      tenantId: testTenantId,
      prospectName: 'Lazada Marketplace Customer',
      email: 'customer@lazada-marketplace.com',
      signals: ['lazada-order', 'order-id-LZD-2026-1115-001', 'checkout-completed']
    }, testLogicalWorkId + '-discover', actor, emptyEvidence);

    expect(prospect).toBeDefined();
    expect(prospect.id).toBeDefined();
    console.log('✅ Stage 1 (DISCOVER) - LeadProspect captured:', prospect.id);

    // Stage 2: CREATE - Create solution artifact (order record)
    const artifact = await genesisService.createSolutionArtifact({
      tenantId: testTenantId,
      prospectId: prospect.id,
      artifactType: 'ecommerce-order',
      details: {
        items: [
          { sku: 'PROD-001', name: 'Wireless Headphones', quantity: 1, price: 250000 },
          { sku: 'PROD-002', name: 'Screen Protector', quantity: 2, price: 50000 }
        ],
        totalAmount: 350000,
        marketplace: 'lazada',
        orderId: 'LZD-2026-1115-001'
      }
    }, prospect.logicalWorkId, actor, emptyEvidence);

    expect(artifact).toBeDefined();
    expect(artifact.id).toBeDefined();
    console.log('✅ Stage 2 (CREATE) - SolutionArtifact created:', artifact.id);

    // Stage 3: EXECUTE - Create financial assessment (payment verification)
    const assessment = await genesisService.createFinancialAssessment({
      tenantId: testTenantId,
      solutionId: artifact.id,
      estimatedCost: 0,
      estimatedRevenue: 350000,
      riskLevel: 'low',
      riskDescription: 'Payment verified via bank transfer'
    }, artifact.logicalWorkId, actor, emptyEvidence);

    expect(assessment).toBeDefined();
    expect(assessment.id).toBeDefined();
    console.log('✅ Stage 3 (EXECUTE) - FinancialAssessment created:', assessment.id);

    // Stage 4: PROGRESS - Create conversion asset (fulfillment record)
    const fulfillment = await genesisService.createConversionAsset({
      tenantId: testTenantId,
      assessmentId: assessment.id,
      offerTitle: 'E-commerce Order Fulfillment',
      offerDescription: 'Order packed and ready for shipment from Jakarta warehouse',
      offerPrice: 350000
    }, assessment.logicalWorkId, actor, emptyEvidence);

    expect(fulfillment).toBeDefined();
    expect(fulfillment.id).toBeDefined();
    console.log('✅ Stage 4 (PROGRESS) - ConversionAsset created:', fulfillment.id);

    // Stage 5: EVIDENCE - Create client account (delivery tracking record)
    const clientAccount = await genesisService.createClientAccount({
      tenantId: testTenantId,
      offerId: fulfillment.id,
      clientName: 'Lazada Marketplace Customer',
      clientEmail: 'customer@lazada-marketplace.com'
    }, fulfillment.logicalWorkId, actor, emptyEvidence);

    expect(clientAccount).toBeDefined();
    expect(clientAccount.id).toBeDefined();
    console.log('✅ Stage 5 (EVIDENCE) - ClientAccount created:', clientAccount.id);

    // Stage 6: COMPLETE - Approve financial assessment to finalize order
    const approval = await genesisService.approveFinancialAssessment({
      tenantId: testTenantId,
      assessmentId: assessment.id,
      approvalNotes: 'Order delivered successfully, satisfaction score 5/5'
    }, assessment.logicalWorkId, actor, emptyEvidence);

    expect(approval).toBeDefined();
    console.log('✅ Stage 6 (COMPLETE) - FinancialAssessment approved:', assessment.id);

    console.log('\n🎉 FULL ORDER JOURNEY COMPLETED SUCCESSFULLY!');
    console.log('   Prospect:', prospect.id);
    console.log('   Order:', artifact.id);
    console.log('   Payment:', assessment.id);
    console.log('   Fulfillment:', fulfillment.id);
    console.log('   Client Account:', clientAccount.id);
  });
});
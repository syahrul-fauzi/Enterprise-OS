import { describe, it, expect, vi } from 'vitest';
import { executeCrossBorderSettlement } from '../implementation/adapters/FIN-001-cross-border-adapter.js';
import { processPayment } from '../../../../capabilities/atomic-composition/economic-proof.js';

// Mock processPayment untuk test (reuse existing mock pattern dari HV-008)
vi.mock('../../../../capabilities/atomic-composition/economic-proof.js', () => ({
  processPayment: vi.fn().mockResolvedValue({
    success: true,
    transactionId: 'mock-txn-123',
    invoiceUrl: 'https://mock.invoice.url'
  })
}));

// Mock safeRecordEvidence (reuse existing mock pattern dari work-core)
vi.mock('../../../../capabilities/work-core/implementation/utils/evidence.utils.js', () => ({
  safeRecordEvidence: vi.fn().mockResolvedValue({ ok: true })
}));

describe('FIN-001 Cross-Border Adapter Tests', () => {
  it('L1_EOS_PROOF: Work identity preserved dan cross-border processing executed', async () => {
    // Test work data dengan customsId dan currency IDR→EUR
    const testWork = {
      workId: "fin-001-test-001",
      amount: 2400000000, // IDR 2.4M
      sourceCurrency: "IDR",
      targetCurrency: "EUR",
      customsId: "customs-de-001-2024",
      recipient: "supplier.de.actor",
      payer: "buyer.id.actor",
      description: "Cross-border settlement for supply chain dispute",
      dueDate: "2024-12-31"
    };

    const result = await executeCrossBorderSettlement(testWork);
    
    // Verify core EOS invariants (L1 evidence)
    expect(result.crossBorderProcessed).toBe(true);
    expect(result.customsReference).toBe(testWork.customsId); // Customs reference tercatat
    expect(result.currencyConversion.from).toBe("IDR");
    expect(result.currencyConversion.to).toBe("EUR");
    expect(processPayment).toHaveBeenCalledTimes(1);
    expect(processPayment).toHaveBeenCalledWith(expect.objectContaining({
      workId: testWork.workId, // Work identity preserved
      currency: "EUR",
      description: expect.stringContaining("Customs Ref: customs-de-001-2024")
    }));
    
    console.log("[FIN-001-TEST] ✅ L1_EOS_PROOF passed: Work identity preserved, cross-border processing executed");
  });

  it('L1_EOS_PROOF: Currency conversion applied correctly untuk IDR→EUR', async () => {
    const testWork = {
      workId: "fin-001-test-002",
      amount: 1000000000, // 1 Miliar IDR
      sourceCurrency: "IDR",
      targetCurrency: "EUR",
      customsId: "customs-nl-002-2024",
      recipient: "supplier.nl.actor",
      payer: "buyer.id.actor",
      description: "Another cross-border settlement",
      dueDate: "2024-11-30"
    };

    const result = await executeCrossBorderSettlement(testWork);
    const expectedConverted = 1000000000 * 0.000065; // 65,000 EUR
    expect(result.currencyConversion.convertedAmount).toBeCloseTo(expectedConverted);
    console.log("[FIN-001-TEST] ✅ L1_EOS_PROOF passed: Currency conversion applied correctly");
  });

  it('L2_EXTERNAL_PROOF: External provider (Midtrans) invoked dengan correct parameters', async () => {
    const testWork = {
      workId: "fin-001-test-003",
      amount: 5000000000,
      sourceCurrency: "IDR",
      targetCurrency: "EUR",
      customsId: "customs-fr-003-2024",
      recipient: "supplier.fr.actor",
      payer: "buyer.id.actor",
      description: "High-value cross-border settlement",
      dueDate: "2025-01-15"
    };

    await executeCrossBorderSettlement(testWork);
    expect(processPayment).toHaveBeenCalledWith(expect.objectContaining({
      workId: testWork.workId
    }));
    console.log("[FIN-001-TEST] ✅ L2_EXTERNAL_PROOF passed: External provider invoked dengan correct parameters");
  });
});
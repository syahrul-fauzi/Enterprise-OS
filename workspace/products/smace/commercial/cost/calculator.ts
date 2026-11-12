import type { CreativeSpecification } from "../../contracts/creative-brief.contract.js";

export function calculateProductionCost(specification: CreativeSpecification, providerRate: number): {
  totalCost: number;
  breakdown: {
    providerCost: number;
    storageCost: number;
    processingFee: number;
  };
} {
  // Kalkulasi biaya produksi aktual (commercial layer SMACE)
  const assetCount = specification.assetCount;
  const baseProviderCost = assetCount * providerRate;
  const storageCost = assetCount * 0.05; // $0.05 per asset storage
  const processingFee = baseProviderCost * 0.1; // 10% processing fee

  const totalCost = baseProviderCost + storageCost + processingFee;

  return {
    totalCost,
    breakdown: {
      providerCost: baseProviderCost,
      storageCost,
      processingFee
    }
  };
}
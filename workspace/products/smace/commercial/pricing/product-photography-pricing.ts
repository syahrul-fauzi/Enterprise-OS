// Minimal product photography pricing implementation for SMACE commercial layer
// Reuses EOS budget engine pricing primitives without creating new economic functionality
import type { CreativeBrief } from "../../contracts/creative-brief.contract.js";
import { SMACE_DEFAULT_WORKFLOW_BOUNDARIES } from "../../quality/brand-compliance/validator.js";

// Interface for pricing output (matches SMACE commercial reconciliation requirements)
interface ProductionPricing {
  baseCost: number;
  providerCost: number;
  qualityReviewCost: number;
  storageCost: number;
  totalCost: number;
  listPrice: number;
  contributionMargin: number;
  currency: string;
}

// Get validated pricing for AI product photography order (STEP 8 implementation)
export async function getProductPhotographyPricing(
  brief: CreativeBrief
): Promise<ProductionPricing> {
  // Calculate number of assets from brief specifications (default 1 if not specified)
  const assetCount = brief.specifications?.assetCount || 1;
  const baseCostPerAsset = SMACE_DEFAULT_WORKFLOW_BOUNDARIES.pricing.baseCostPerAsset;
  
  // Calculate individual cost components aligned with SMACE 5 value layers
  const baseCost = baseCostPerAsset * assetCount;
  const providerCost = baseCost * 0.6; // 60% of base cost goes to execution provider
  const qualityReviewCost = baseCost * 0.15; // 15% for QA and brand validation
  const storageCost = baseCost * 0.05; // 5% for long-term asset storage
  const totalCost = baseCost + providerCost + qualityReviewCost + storageCost;
  
  // Calculate list price and contribution margin (35% margin target)
  const listPrice = totalCost * 1.35;
  const contributionMargin = listPrice - totalCost;

  // Return validated pricing object for commercial reconciliation
  return {
    baseCost,
    providerCost,
    qualityReviewCost,
    storageCost,
    totalCost,
    listPrice,
    totalRevenue: listPrice,
    contributionMargin,
    currency: "USD"
  };
}
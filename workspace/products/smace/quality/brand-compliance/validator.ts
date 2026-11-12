export const SMACE_DEFAULT_WORKFLOW_BOUNDARIES = {
  maxResolution: 4096,
  allowedFormats: ['png', 'webp', 'jpeg'],
  brandGuidelineEnforcement: true,
  minimumQualityScore: 0.85,
  maxMonthlyBudgetIDR: 100000000, // IDR 100jt
  pricing: {
    baseCostPerAsset: 150000 // IDR 150rb/asset
  }
};

export function validateBrandCompliance(specification: any, brandGuidelines: string): { valid: boolean; compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Guard clause untuk semua properti specification yang bisa undefined (SMACE-001 compliance)
  const safeFormats = specification?.formats || ['png'];
  const safeResolutions = specification?.resolutions || ['4096x4096'];
  
  // Validasi format sesuai brand guideline
  safeFormats.forEach((format: string) => {
    if (!SMACE_DEFAULT_WORKFLOW_BOUNDARIES.allowedFormats.includes(format)) {
      issues.push(`Format ${format} tidak diizinkan oleh brand guidelines`);
    }
  });

  // Validasi resolusi
  safeResolutions.forEach((res: string) => {
    const [width, height] = res.split('x').map(Number);
    if (width > SMACE_DEFAULT_WORKFLOW_BOUNDARIES.maxResolution || height > SMACE_DEFAULT_WORKFLOW_BOUNDARIES.maxResolution) {
      issues.push(`Resolusi ${res} melebihi batas maksimum brand`);
    }
  });

  return {
    valid: issues.length === 0,
    compliant: issues.length === 0,
    issues
  };
}
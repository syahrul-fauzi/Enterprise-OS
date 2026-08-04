export type ProductPortfolio = {
  readonly portfolio?: string;
  readonly products?: readonly {
    readonly id: string;
    readonly domain?: string;
    readonly target?: string;
    readonly role?: string;
    readonly shared_capabilities?: readonly string[];
  }[];
};

export type ProductEvidence = {
  readonly product_id: string;
  readonly app_manifest_exists: boolean;
  readonly evidence_complete: boolean;
  readonly capabilities: readonly string[];
  readonly functional_tests_passed: number;
  readonly functional_tests_total: number;
  readonly capability_reuse_ratio: number | null;
  readonly experience_reuse_ratio: number | null;
  readonly clr: number | "FULL_REUSE" | null;
};

export type PortfolioVerificationStatus =
  | "UNKNOWN_PORTFOLIO"
  | "HEALTHY_PORTFOLIO"
  | "PARTIAL_PORTFOLIO"
  | "UNVERIFIED_PORTFOLIO";

export type PortfolioVerificationReport = Readonly<{
  verification_result: {
    readonly command_status: "PASS";
    readonly portfolio_status: PortfolioVerificationStatus;
  };
  portfolio_id: string;
  status: PortfolioVerificationStatus;
  selected_products: readonly string[];
  products_verified: readonly string[];
  products_missing_verification: readonly string[];
  shared_capabilities: readonly string[];
  capability_overlap_ratio: number;
  products: readonly ProductEvidence[];
  claim_boundary: string;
}>;

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

export function resolvePortfolioProducts(
  portfolioId: string,
  portfolio: ProductPortfolio,
): readonly string[] {
  const declaredProducts = portfolio.products?.map((product) => product.id) ?? [];
  const normalized = portfolioId.trim().toLowerCase();

  if (
    normalized === "enterprise" ||
    normalized === "legal" ||
    normalized === (portfolio.portfolio ?? "").toLowerCase()
  ) {
    return declaredProducts;
  }

  const targetedProducts = (portfolio.products ?? [])
    .filter(
      (product) =>
        product.id.toLowerCase() === normalized ||
        product.target?.toLowerCase() === normalized ||
        product.role?.toLowerCase() === normalized,
    )
    .map((product) => product.id);

  return unique(targetedProducts);
}

export function materializePortfolioVerificationStatus(input: {
  readonly selectedProducts: readonly string[];
  readonly evidence: readonly ProductEvidence[];
}): PortfolioVerificationStatus {
  if (input.selectedProducts.length === 0) {
    return "UNKNOWN_PORTFOLIO";
  }
  const verifiedProducts = input.evidence.filter(
    (product) =>
      product.app_manifest_exists &&
      product.evidence_complete &&
      product.functional_tests_total > 0 &&
      product.functional_tests_passed === product.functional_tests_total,
  );
  if (verifiedProducts.length === input.selectedProducts.length) {
    return "HEALTHY_PORTFOLIO";
  }
  if (verifiedProducts.length > 0) {
    return "PARTIAL_PORTFOLIO";
  }
  return "UNVERIFIED_PORTFOLIO";
}

export function materializePortfolioVerificationReport(input: {
  readonly portfolioId: string;
  readonly selectedProducts: readonly string[];
  readonly evidence: readonly ProductEvidence[];
}): PortfolioVerificationReport {
  const capabilityCounts = new Map<string, number>();
  for (const product of input.evidence) {
    for (const capability of product.capabilities) {
      capabilityCounts.set(capability, (capabilityCounts.get(capability) ?? 0) + 1);
    }
  }
  const sharedCapabilities = unique(
    Array.from(capabilityCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([capability]) => capability),
  );
  const totalCapabilityObservations = input.evidence.reduce(
    (sum, product) => sum + product.capabilities.length,
    0,
  );
  const status = materializePortfolioVerificationStatus({
    selectedProducts: input.selectedProducts,
    evidence: input.evidence,
  });

  return {
    verification_result: {
      command_status: "PASS",
      portfolio_status: status,
    },
    portfolio_id: input.portfolioId,
    status,
    selected_products: input.selectedProducts,
    products_verified: input.evidence
      .filter((product) => product.evidence_complete)
      .map((product) => product.product_id),
    products_missing_verification: input.selectedProducts.filter(
      (productId) =>
        !input.evidence.some(
          (product) =>
            product.product_id === productId && product.evidence_complete,
        ),
    ),
    shared_capabilities: sharedCapabilities,
    capability_overlap_ratio:
      totalCapabilityObservations === 0
        ? 0
        : Number((sharedCapabilities.length / totalCapabilityObservations).toFixed(4)),
    products: input.evidence,
    claim_boundary:
      "Portfolio verification depends on product-level empirical evidence. Missing manifests or reports keep the portfolio partial.",
  };
}

export function materializePortfolioVerificationSummaryMarkdown(input: {
  readonly portfolioId: string;
  readonly status: PortfolioVerificationStatus;
  readonly selectedProducts: readonly string[];
  readonly evidenceFiles: readonly string[];
}): string {
  return [
    `# Portfolio Verification Summary: ${input.portfolioId}`,
    "",
    `- status: ${input.status}`,
    `- selected products: ${
      input.selectedProducts.length > 0 ? input.selectedProducts.join(", ") : "none"
    }`,
    "",
    "## Evidence",
    ...input.evidenceFiles.map((file) => `- ${file}`),
    "",
  ].join("\n");
}

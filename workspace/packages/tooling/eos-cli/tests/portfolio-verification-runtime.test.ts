import test from "node:test";
import assert from "node:assert/strict";

import {
  materializePortfolioVerificationReport,
  materializePortfolioVerificationSummaryMarkdown,
  resolvePortfolioProducts,
  type ProductPortfolio,
} from "../src/portfolio-verification-runtime.ts";

test("portfolio verification runtime resolves enterprise and targeted products", () => {
  const portfolio: ProductPortfolio = {
    portfolio: "enterprise",
    products: [
      { id: "lawyershub", target: "legal" },
      { id: "briefhub", role: "briefing" },
    ],
  };

  assert.deepEqual(resolvePortfolioProducts("enterprise", portfolio), [
    "lawyershub",
    "briefhub",
  ]);
  assert.deepEqual(resolvePortfolioProducts("briefing", portfolio), ["briefhub"]);
});

test("portfolio verification runtime materializes partial status and summary", () => {
  const report = materializePortfolioVerificationReport({
    portfolioId: "enterprise",
    selectedProducts: ["lawyershub", "briefhub"],
    evidence: [
      {
        product_id: "lawyershub",
        app_manifest_exists: true,
        evidence_complete: true,
        capabilities: ["legal-case", "observability"],
        functional_tests_passed: 2,
        functional_tests_total: 2,
        capability_reuse_ratio: 0.5,
        experience_reuse_ratio: 0.25,
        clr: 0.5,
      },
      {
        product_id: "briefhub",
        app_manifest_exists: true,
        evidence_complete: false,
        capabilities: ["observability"],
        functional_tests_passed: 0,
        functional_tests_total: 0,
        capability_reuse_ratio: null,
        experience_reuse_ratio: null,
        clr: null,
      },
    ],
  });

  assert.equal(report.status, "PARTIAL_PORTFOLIO");
  assert.deepEqual(report.shared_capabilities, ["observability"]);
  assert.deepEqual(report.products_verified, ["lawyershub"]);
  assert.deepEqual(report.products_missing_verification, ["briefhub"]);

  const summary = materializePortfolioVerificationSummaryMarkdown({
    portfolioId: "enterprise",
    status: report.status,
    selectedProducts: report.selected_products,
    evidenceFiles: [
      "workspace/portfolios/evidence/verification/enterprise/portfolio-report.json",
      "workspace/portfolios/evidence/verification/enterprise/portfolio-summary.md",
    ],
  });

  assert.match(summary, /# Portfolio Verification Summary: enterprise/);
  assert.match(summary, /status: PARTIAL_PORTFOLIO/);
  assert.match(summary, /lawyershub, briefhub/);
});

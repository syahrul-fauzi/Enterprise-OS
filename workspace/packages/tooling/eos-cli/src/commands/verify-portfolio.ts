import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "yaml";
import {
  ensureDirectory,
  writeJsonArtifact,
  writeTextArtifact,
} from "../governance-runtime.js";
import {
  materializePortfolioVerificationReport,
  materializePortfolioVerificationSummaryMarkdown,
  resolvePortfolioProducts,
  type ProductEvidence,
  type ProductPortfolio,
} from "../portfolio-verification-runtime.js";
import { EOS_ROOT } from "../state.js";
import { tryReadWorkspaceCapabilities } from "../workspace-capability-runtime.js";

const WORKSPACE_ROOT = resolve(EOS_ROOT, "workspace");
const ENTERPRISE_ROOT = resolve(EOS_ROOT, "enterprise");

function readYamlFile<T>(path: string): T {
  return yaml.parse(readFileSync(path, "utf8")) as T;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function normalizeRatio(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value > 1) {
    return Number((value / 100).toFixed(4));
  }
  return Number(value.toFixed(4));
}

function buildProductEvidence(productId: string): ProductEvidence {
  const manifestPath = resolve(WORKSPACE_ROOT, `apps/${productId}/workspace.manifest.ts`);
  const evidenceDir = resolve(WORKSPACE_ROOT, `products/${productId}/evidence/verification`);
  const clrPath = resolve(evidenceDir, "clr-report.json");
  const testsPath = resolve(evidenceDir, "functional-test-report.json");

  const capabilities = (() => {
    try {
      return tryReadWorkspaceCapabilities(manifestPath);
    } catch {
      return [];
    }
  })();

  const functionalTestReport = (() => {
    try {
      return readJsonFile<{
        readonly summary?: {
          readonly pass?: number;
          readonly total?: number;
        };
      }>(testsPath);
    } catch {
      return null;
    }
  })();

  const clrReport = (() => {
    try {
      return readJsonFile<{
        readonly capability_reuse?: {
          readonly reuse_ratio?: number;
          readonly clr?: number | "FULL_REUSE";
        };
        readonly experience_module_reuse?: {
          readonly reuse_ratio?: number;
        };
      }>(clrPath);
    } catch {
      return null;
    }
  })();

  const evidenceComplete =
    functionalTestReport !== null && clrReport !== null && capabilities.length > 0;

  return {
    product_id: productId,
    app_manifest_exists: capabilities.length > 0,
    evidence_complete: evidenceComplete,
    capabilities,
    functional_tests_passed: functionalTestReport?.summary?.pass ?? 0,
    functional_tests_total: functionalTestReport?.summary?.total ?? 0,
    capability_reuse_ratio: normalizeRatio(clrReport?.capability_reuse?.reuse_ratio),
    experience_reuse_ratio: normalizeRatio(clrReport?.experience_module_reuse?.reuse_ratio),
    clr: clrReport?.capability_reuse?.clr ?? null,
  };
}

export async function runVerifyPortfolioCommand(portfolioId: string): Promise<number> {
  const productPortfolioPath = resolve(ENTERPRISE_ROOT, "specifications/PRODUCT-PORTFOLIO.yaml");
  const portfolio = readYamlFile<ProductPortfolio>(productPortfolioPath);
  const selectedProducts = resolvePortfolioProducts(portfolioId, portfolio);
  const evidenceDir = resolve(WORKSPACE_ROOT, `portfolios/evidence/verification/${portfolioId}`);

  ensureDirectory(evidenceDir);

  const evidence = selectedProducts.map(buildProductEvidence);
  const report = materializePortfolioVerificationReport({
    portfolioId,
    selectedProducts,
    evidence,
  });

  const evidenceFiles = {
    report: resolve(evidenceDir, "portfolio-report.json"),
    summary: resolve(evidenceDir, "portfolio-summary.md"),
  };

  writeJsonArtifact(evidenceFiles.report, report);
  writeTextArtifact(
    evidenceFiles.summary,
    materializePortfolioVerificationSummaryMarkdown({
      portfolioId,
      status: report.status,
      selectedProducts,
      evidenceFiles: Object.values(evidenceFiles).map((file) => file.replace(`${EOS_ROOT}/`, "")),
    }),
  );

  process.stdout.write(
    [
      `Portfolio verification complete: ${portfolioId}`,
      `Selected products: ${selectedProducts.length}`,
      `Verified products: ${report.products_verified.length}`,
      `Evidence directory: ${evidenceDir}`,
    ].join("\n") + "\n",
  );

  return 0;
}

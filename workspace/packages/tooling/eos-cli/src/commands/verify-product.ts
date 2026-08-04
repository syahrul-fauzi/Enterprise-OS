import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  verifyWorkspaceConstitutionIfAvailable,
} from "../constitution-support.js";
import {
  resolveProjectionStorageLocation,
} from "../projections.js";
import {
  ProjectionBuilders,
} from "../projection-builders.js";
import { persistProjectionArtifact } from "../projection-runtime.js";
import {
  materializeCompositionReplayArtifact,
  materializeFunctionalTestArtifact,
  materializeRuntimeInvocationReport,
  readRuntimeInvocationEvents,
  resolveProductEvidenceFiles,
} from "../product-evidence-runtime.js";
import {
  materializeCapabilityMappingMatrixCsv,
  materializeCompositionTree,
  readProductCompositionManifest,
  type ProductMappingRow,
} from "../product-composition-runtime.js";
import {
  materializeAtomicLeverageReport,
  materializeClrReport,
  materializeProofOfCompositionMarkdown,
  materializeVerificationSummaryMarkdown,
} from "../product-reporting-runtime.js";
import { parseTapFunctionalTestReport } from "../product-test-runtime.js";
import {
  materializeProductExecutionPlan,
  materializeProductPlanInstance,
} from "../product-verification-runtime.js";
import { persistProductRuntimeVerificationArtifacts } from "../product-runtime-evidence-runtime.js";
import {
  captureExecutionTimestampUtc,
  ensureDirectory,
  fail,
  resetArtifact,
  runCommand,
  writeJsonArtifact,
  writeTextArtifact,
} from "../governance-runtime.js";
import { EOS_ROOT } from "../state.js";
import { readWorkspaceCapabilities } from "../workspace-capability-runtime.js";

const WORKSPACE_ROOT = resolve(EOS_ROOT, "workspace");
const FOUNDATION_EVIDENCE_DIR = resolve(WORKSPACE_ROOT, "foundation/evidence/verification");
const PRODUCTS_ROOT = resolve(WORKSPACE_ROOT, "products");
const FOUNDATION_EXECUTION_GRAPH_PATH = resolveProjectionStorageLocation({
  baseDir: FOUNDATION_EVIDENCE_DIR,
  scope: "foundation_verification",
  projectionType: "ExecutionGraphProjection",
});

type ProductConfig = {
  readonly productId: "lawyershub";
  readonly appManifestPath: string;
  readonly plannerDescriptorPath: string;
  readonly appTsconfigPath: string;
  readonly compositionPackageDir: string;
  readonly evidenceDir: string;
  readonly tests: readonly string[];
};

const PRODUCT_CONFIG: Record<string, ProductConfig> = {
  lawyershub: {
    productId: "lawyershub",
    appManifestPath: resolve(WORKSPACE_ROOT, "apps/lawyershub/workspace.manifest.ts"),
    plannerDescriptorPath: resolve(WORKSPACE_ROOT, "apps/lawyershub/composition.descriptor.ts"),
    appTsconfigPath: resolve(WORKSPACE_ROOT, "apps/lawyershub/tsconfig.json"),
    compositionPackageDir: resolve(WORKSPACE_ROOT, "packages/compositions/legal-workspace"),
    evidenceDir: resolve(WORKSPACE_ROOT, "products/lawyershub/evidence/verification"),
    tests: [
      "apps/lawyershub/tests/enterprise-ui.test.tsx",
      "apps/lawyershub/tests/agent-orchestration-api.test.ts",
      "apps/lawyershub/tests/governance-api.test.ts",
      "apps/lawyershub/tests/observability-api.test.ts",
      "apps/lawyershub/tests/connectors-api.test.ts",
      "apps/lawyershub/tests/graph-api.test.ts",
    ],
  },
};

const PRODUCT_MAPPING: Record<string, readonly ProductMappingRow[]> = {
  lawyershub: [
    {
      feature: "Requirements Workspace",
      capability: "requirement-management",
      module: "explorer-pattern",
      primitive: "table,panel,identifier,lifecycle",
    },
    {
      feature: "Case Workspace",
      capability: "legal-case",
      module: "execution-pattern",
      primitive: "table,panel,identifier,time-range,person",
    },
    {
      feature: "Document Workspace",
      capability: "legal-document",
      module: "discovery-pattern",
      primitive: "table,panel,attachment,lifecycle,identifier",
    },
  ],
};

export async function runVerifyProductCommand(productId: string): Promise<number> {
  const config = PRODUCT_CONFIG[productId];
  if (!config) {
    fail(`Unsupported product: ${productId}`);
  }

  if (!existsSync(config.appManifestPath)) {
    fail(`Product manifest not found: ${config.appManifestPath}`);
  }

  const workspaceCapabilities = readWorkspaceCapabilities(config.appManifestPath);
  const compositionManifestPath = resolve(config.compositionPackageDir, "manifest.yaml");
  const compositionManifest = readProductCompositionManifest(compositionManifestPath);
  const mappingRows = PRODUCT_MAPPING[productId] ?? [];
  const executionPlan = materializeProductExecutionPlan({
    eosRoot: EOS_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
    foundationExecutionGraphPath: FOUNDATION_EXECUTION_GRAPH_PATH,
    productId: config.productId,
    plannerDescriptorPath: config.plannerDescriptorPath,
    appManifestPath: config.appManifestPath,
    appTsconfigPath: config.appTsconfigPath,
  });
  const planInstance = materializeProductPlanInstance({
    executionPlan,
    productId,
  });
  const evidenceFiles = resolveProductEvidenceFiles({
    evidenceDir: config.evidenceDir,
  });

  ensureDirectory(config.evidenceDir);

  runCommand(
    "pnpm",
    ["--dir", WORKSPACE_ROOT, "--filter", "@repo/core-runtime", "build"],
    EOS_ROOT,
  );

  const validateOutput = runCommand(
    "pnpm",
    [
      "--dir",
      WORKSPACE_ROOT,
      "exec",
      "node",
      "--import",
      "tsx",
      "packages/composition/src/scripts/validate-composition-package.ts",
      "packages/compositions/legal-workspace",
    ],
    EOS_ROOT,
  );
  const replayValidatedAtUtc = captureExecutionTimestampUtc();
  resetArtifact(evidenceFiles.runtimeInvocations);

  const testsStartedAtUtc = captureExecutionTimestampUtc();
  const testOutput = runCommand(
    "pnpm",
    [
      "--dir",
      WORKSPACE_ROOT,
      "exec",
      "node",
      "--import",
      "tsx",
      "--test",
      "--test-reporter",
      "tap",
      ...config.tests,
    ],
    EOS_ROOT,
    {
      EOS_RUNTIME_INVOCATION_EVIDENCE_PATH: evidenceFiles.runtimeInvocations,
      EOS_RUNTIME_INVOCATION_PRODUCT_ID: productId,
      EOS_RUNTIME_PLAN_INSTANCE_ID: planInstance.plan_instance_id,
      EOS_RUNTIME_PLAN_ID: executionPlan.plan_id,
      EOS_RUNTIME_PLAN_DIGEST: executionPlan.plan_digest,
      TSX_TSCONFIG_PATH: config.appTsconfigPath,
    },
  );
  const testsCompletedAtUtc = captureExecutionTimestampUtc();
  const testReport = parseTapFunctionalTestReport(productId, testOutput);
  if (testReport.status !== "PASS") {
    fail(`Functional verification failed for ${productId}`);
  }

  const runtimeInvocationEvents = readRuntimeInvocationEvents(evidenceFiles.runtimeInvocations);

  writeJsonArtifact(
    evidenceFiles.replay,
    materializeCompositionReplayArtifact({
      productId,
      compositionId: compositionManifest.id,
      planInstanceId: planInstance.plan_instance_id,
      planId: executionPlan.plan_id,
      planDigest: executionPlan.plan_digest,
      validateOutput,
    }),
  );

  writeJsonArtifact(
    evidenceFiles.tests,
    materializeFunctionalTestArtifact({
      testReport,
      planInstanceId: planInstance.plan_instance_id,
      planId: executionPlan.plan_id,
      planDigest: executionPlan.plan_digest,
    }),
  );
  const runtimeInvocationReport = materializeRuntimeInvocationReport({
    productId,
    replayPassed: true,
    events: runtimeInvocationEvents,
    planInstance,
  });
  writeJsonArtifact(evidenceFiles.runtimeInvocationReport, runtimeInvocationReport);
  persistProjectionArtifact({
    path: evidenceFiles.executionPlan,
    scope: "product_verification",
    projection: ProjectionBuilders.executionPlan.build({
      executionPlan,
      planInstance,
    }),
    expectedProjectionType: "ExecutionPlanProjection",
  });
  const executionChainReport = ProjectionBuilders.executionChain.build({
    productId,
    replayPassed: true,
    events: runtimeInvocationEvents,
    runtimeInvocationReport,
    executionPlan,
    planInstance,
  });
  persistProjectionArtifact({
    path: evidenceFiles.executionChain,
    scope: "product_verification",
    projection: executionChainReport,
    expectedProjectionType: "ExecutionChainProjection",
  });
  const executionTimelineReport = ProjectionBuilders.executionTimeline.build({
    productId,
    replayPassed: true,
    executionPlan,
    planInstance,
    executionChainReport,
    testsStartedAtUtc,
    testsCompletedAtUtc,
    replayValidatedAtUtc,
  });
  persistProjectionArtifact({
    path: evidenceFiles.executionTimeline,
    scope: "product_verification",
    projection: executionTimelineReport,
    expectedProjectionType: "ExecutionTimelineProjection",
  });
  persistProductRuntimeVerificationArtifacts({
    productId,
    appManifestRef: `workspace/apps/${productId}/workspace.manifest.ts`,
    projectionPath: evidenceFiles.runtimeVerificationProjection,
    evidencePath: evidenceFiles.runtimeVerificationEvidence,
    testReport,
    runtimeInvocationReport,
    executionChainReport,
    executionTimelineReport,
  });

  writeJsonArtifact(
    evidenceFiles.clr,
    materializeClrReport({
      workspaceCapabilities,
      compositionManifest,
      mappingRows,
    }),
  );
  writeTextArtifact(
    evidenceFiles.matrix,
    materializeCapabilityMappingMatrixCsv(mappingRows),
  );
  writeTextArtifact(
    evidenceFiles.tree,
    materializeCompositionTree({
      productId,
      compositionManifest,
      rows: mappingRows,
    }),
  );
  writeJsonArtifact(
    evidenceFiles.atomicLeverage,
    materializeAtomicLeverageReport({
      mappingRows,
    }),
  );
  writeTextArtifact(
    evidenceFiles.proof,
    materializeProofOfCompositionMarkdown({
      productId,
      compositionId: compositionManifest.id,
      workspaceCapabilities,
      testReport,
      evidenceFiles: Object.fromEntries(
        Object.entries(evidenceFiles).map(([name, file]) => [name, file.replace(`${EOS_ROOT}/`, "")]),
      ),
      mappingRows,
    }),
  );
  writeTextArtifact(
    evidenceFiles.summary,
    materializeVerificationSummaryMarkdown({
      productId,
      compositionId: compositionManifest.id,
      capabilities: workspaceCapabilities,
      testReport,
      runtimeInvocationSummary: runtimeInvocationReport.summary as {
        readonly total_invocations: number;
        readonly observed_capabilities: number;
        readonly verified_capabilities: number;
        readonly reproducible_capabilities: number;
      },
      executionPlanSummary: {
        plan_id: executionPlan.plan_id,
        plan_digest: executionPlan.plan_digest,
        plan_instance_id: planInstance.plan_instance_id,
        projection_source: executionPlan.projection_source,
      },
      executionChainSummary: executionChainReport.payload.summary as {
        readonly total_chains: number;
        readonly chains_with_requirement: number;
        readonly chains_with_workflow: number;
        readonly reproducible_chains: number;
      },
      executionTimelineSummary: executionTimelineReport.payload.summary as {
        readonly total_events: number;
        readonly edge_lifecycle_events: number;
      },
      evidenceFiles: Object.values(evidenceFiles).map((file) => file.replace(`${EOS_ROOT}/`, "")),
    }),
  );

  const constitutionAdapterStatus = verifyWorkspaceConstitutionIfAvailable({
    foundationEvidenceDir: FOUNDATION_EVIDENCE_DIR,
    productsRoot: PRODUCTS_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
  })
    ? "PASS"
    : "SKIPPED";

  process.stdout.write(
    [
      `Product: ${productId}`,
      `Evidence directory: ${config.evidenceDir}`,
      `Capabilities: ${workspaceCapabilities.join(", ")}`,
      `Functional tests: ${testReport.summary.pass}/${testReport.summary.total} PASS`,
      `Runtime invocations: ${
        (runtimeInvocationReport.summary as { readonly total_invocations: number }).total_invocations
      }`,
      `Execution plan: ${executionPlan.plan_id}`,
      `Constitution adapter: ${constitutionAdapterStatus}`,
    ].join("\n") + "\n",
  );

  return 0;
}

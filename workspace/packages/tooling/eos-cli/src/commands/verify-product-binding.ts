import { resolve } from "node:path";
import {
  captureExecutionTimestampUtc,
  ensureDirectory,
  runCommand,
  writeJsonArtifact,
} from "../governance-runtime.js";
import {
  materializeFunctionalTestArtifact,
  resolveProductEvidenceFiles,
} from "../product-evidence-runtime.js";
import {
  readProductBindingManifest,
  resolveProductBindingPath,
  resolveProductWorkspaceManifestPath,
} from "../product-binding-runtime.js";
import { materializeClrReport } from "../product-reporting-runtime.js";
import { parseTapFunctionalTestReport } from "../product-test-runtime.js";
import { EOS_ROOT } from "../state.js";
import { tryReadWorkspaceCapabilities } from "../workspace-capability-runtime.js";

const WORKSPACE_ROOT = resolve(EOS_ROOT, "workspace");

export async function runVerifyProductBindingCommand(productId: string): Promise<number> {
  const bindingPath = resolveProductBindingPath({
    workspaceRoot: WORKSPACE_ROOT,
    productId,
  });
  const manifestPath = resolveProductWorkspaceManifestPath({
    workspaceRoot: WORKSPACE_ROOT,
    productId,
  });
  const binding = readProductBindingManifest(bindingPath);
  const workspaceCapabilities = tryReadWorkspaceCapabilities(manifestPath);
  const evidenceDir = resolve(
    WORKSPACE_ROOT,
    `products/${productId}/evidence/verification`,
  );
  const evidenceFiles = resolveProductEvidenceFiles({
    evidenceDir,
  });

  ensureDirectory(evidenceDir);

  const output = runCommand(
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
      "packages/tooling/eos-cli/tests/product-binding-proof.test.ts",
    ],
    EOS_ROOT,
    {
      EOS_PRODUCT_BINDING_PRODUCT_ID: productId,
    },
  );

  const testReport = parseTapFunctionalTestReport(productId, output);
  const capturedAtUtc = captureExecutionTimestampUtc();
  const planId = `plan::product-binding::${productId}::${binding.experience?.surface ?? "unknown"}`;
  const planDigest = `${productId}:${binding.experience?.surface ?? "unknown"}:${binding.experience?.route ?? "/"}`;
  const planInstanceId = `pi:${productId}:${capturedAtUtc}`;

  writeJsonArtifact(
    evidenceFiles.tests,
    materializeFunctionalTestArtifact({
      testReport,
      planInstanceId,
      planId,
      planDigest,
    }),
  );

  writeJsonArtifact(
    evidenceFiles.clr,
    materializeClrReport({
      workspaceCapabilities,
      compositionManifest: {
        id: `binding-proof::${productId}`,
        capabilities: workspaceCapabilities,
        surfaces: [binding.experience?.surface ?? "unknown"],
      },
      mappingRows: [
        {
          feature: "Requirement Experience",
          capability: "requirement-management",
          module: "workspace-experience",
          primitive: "route,workspace,requirement",
        },
      ],
    }),
  );

  process.stdout.write(
    [
      `Product binding verification complete: ${productId}`,
      `Binding: ${bindingPath.replace(`${EOS_ROOT}/`, "")}`,
      `Surface manifest: ${manifestPath.replace(`${EOS_ROOT}/`, "")}`,
      `Evidence directory: ${evidenceDir.replace(`${EOS_ROOT}/`, "")}`,
    ].join("\n") + "\n",
  );

  return 0;
}

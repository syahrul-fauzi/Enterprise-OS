import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import type {
  GovernanceClaimsView,
  GovernanceDashboardView,
  GovernanceHealthView,
  GovernanceReadModelCatalog,
  GovernanceReadModelKind,
  GovernanceReadModelLocation,
  GovernanceReadModelProvider,
  GovernanceSummaryView,
  JsonRecord,
} from "../contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, "../../../../");

const READ_MODEL_PATHS: Record<GovernanceReadModelKind, string> = {
  summary: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/governance-summary-view.json",
  ),
  claims: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/governance-claims-view.json",
  ),
  health: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/governance-health-view.json",
  ),
  dashboard: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/governance-dashboard-view.json",
  ),
};

class GovernanceReadModelCatalogFileSystem implements GovernanceReadModelCatalog {
  resolve(kind: GovernanceReadModelKind): GovernanceReadModelLocation {
    return {
      kind,
      path: READ_MODEL_PATHS[kind],
    };
  }
}

function readView(path: string, kind: GovernanceReadModelKind): JsonRecord {
  if (!existsSync(path)) {
    throw new Error(
      `governance_read_model_${kind}_unavailable: missing read model at ${path}. Run constitution/foundation verification first.`,
    );
  }

  const artifact = JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
  if (
    artifact === null ||
    typeof artifact !== "object" ||
    Array.isArray(artifact)
  ) {
    throw new Error(
      `governance_read_model_${kind}_shape_mismatch: expected object read model artifact.`,
    );
  }

  return artifact;
}

export class GovernanceReadModelService implements GovernanceReadModelProvider {
  constructor(
    private readonly catalog: GovernanceReadModelCatalog = new GovernanceReadModelCatalogFileSystem(),
  ) {}

  materializeSummary(): GovernanceSummaryView {
    const location = this.catalog.resolve("summary");
    const result = readView(
      location.path,
      location.kind,
    ) as GovernanceSummaryView;
    recordRuntimeInvocation({
      capabilityId: "governance-read-model",
      operationId: "materialize-summary",
      sourceRef: "GovernanceReadModelService.materializeSummary",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        viewId: result.view_id,
        viewDigest: result.view_digest,
      },
    });
    return result;
  }

  materializeClaims(): GovernanceClaimsView {
    const location = this.catalog.resolve("claims");
    const result = readView(
      location.path,
      location.kind,
    ) as GovernanceClaimsView;
    recordRuntimeInvocation({
      capabilityId: "governance-read-model",
      operationId: "materialize-claims",
      sourceRef: "GovernanceReadModelService.materializeClaims",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        viewId: result.view_id,
        viewDigest: result.view_digest,
      },
    });
    return result;
  }

  materializeHealth(): GovernanceHealthView {
    const location = this.catalog.resolve("health");
    const result = readView(
      location.path,
      location.kind,
    ) as GovernanceHealthView;
    recordRuntimeInvocation({
      capabilityId: "governance-read-model",
      operationId: "materialize-health",
      sourceRef: "GovernanceReadModelService.materializeHealth",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        viewId: result.view_id,
        viewDigest: result.view_digest,
      },
    });
    return result;
  }

  materializeDashboard(): GovernanceDashboardView {
    const location = this.catalog.resolve("dashboard");
    const result = readView(
      location.path,
      location.kind,
    ) as GovernanceDashboardView;
    recordRuntimeInvocation({
      capabilityId: "governance-read-model",
      operationId: "materialize-dashboard",
      sourceRef: "GovernanceReadModelService.materializeDashboard",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        viewId: result.view_id,
        viewDigest: result.view_digest,
      },
    });
    return result;
  }
}

export const governanceReadModelCatalog =
  new GovernanceReadModelCatalogFileSystem();
export const governanceReadModelService = new GovernanceReadModelService();

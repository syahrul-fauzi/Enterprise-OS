import { resolve } from "node:path";
import { EOS_ROOT } from "../../state.js";
import { readYamlArtifact } from "../../governance-runtime.js";

export const SPECIFICATION_MATURITY_MODEL_PATH = resolve(
  EOS_ROOT,
  "enterprise/specifications/evolution/maturity-model.yaml",
);

export type SpecificationMaturityStatus = string;

type RawSpecificationMaturityModel = {
  readonly model_id: string;
  readonly schema_version: string;
  readonly scope: string;
  readonly families: {
    readonly specification: {
      readonly description: string;
      readonly initial_status: string;
      readonly terminal_statuses: readonly string[];
      readonly policy_floors: {
        readonly implementation_allowed_minimum: string;
        readonly conformance_baseline_minimum: string;
        readonly verification_evidence_minimum: string;
        readonly stable_release_minimum: string;
      };
      readonly statuses: readonly {
        readonly status: string;
        readonly order: number;
        readonly description: string;
      }[];
    };
  };
};

export type SpecificationMaturityModel = {
  readonly model_id: string;
  readonly schema_version: string;
  readonly scope: string;
  readonly initial_status: SpecificationMaturityStatus;
  readonly terminal_statuses: readonly SpecificationMaturityStatus[];
  readonly policy_floors: {
    readonly implementation_allowed_minimum: SpecificationMaturityStatus;
    readonly conformance_baseline_minimum: SpecificationMaturityStatus;
    readonly verification_evidence_minimum: SpecificationMaturityStatus;
    readonly stable_release_minimum: SpecificationMaturityStatus;
  };
  readonly statuses: readonly {
    readonly status: SpecificationMaturityStatus;
    readonly order: number;
    readonly description: string;
  }[];
};

export function loadSpecificationMaturityModel(): SpecificationMaturityModel {
  const raw = readYamlArtifact<RawSpecificationMaturityModel>(
    SPECIFICATION_MATURITY_MODEL_PATH,
  );
  const family = raw.families.specification;
  const knownStatuses = new Set(family.statuses.map((entry) => entry.status));

  for (const floorStatus of Object.values(family.policy_floors)) {
    if (!knownStatuses.has(floorStatus)) {
      throw new Error(
        `Specification maturity model references unknown policy floor status: ${floorStatus}`,
      );
    }
  }
  if (!knownStatuses.has(family.initial_status)) {
    throw new Error(
      `Specification maturity model references unknown initial status: ${family.initial_status}`,
    );
  }
  for (const terminalStatus of family.terminal_statuses) {
    if (!knownStatuses.has(terminalStatus)) {
      throw new Error(
        `Specification maturity model references unknown terminal status: ${terminalStatus}`,
      );
    }
  }

  return {
    model_id: raw.model_id,
    schema_version: raw.schema_version,
    scope: raw.scope,
    initial_status: family.initial_status,
    terminal_statuses: family.terminal_statuses,
    policy_floors: family.policy_floors,
    statuses: [...family.statuses].sort((left, right) => left.order - right.order),
  };
}

export function assertKnownSpecificationMaturityStatus(
  status: string,
  model: SpecificationMaturityModel = loadSpecificationMaturityModel(),
): SpecificationMaturityStatus {
  if (!model.statuses.some((entry) => entry.status === status)) {
    throw new Error(
      `Unknown specification maturity status: ${status}. Update enterprise/specifications/evolution/maturity-model.yaml to govern this lifecycle state.`,
    );
  }
  return status;
}

export function compareSpecificationMaturityStatus(
  left: string,
  right: string,
  model: SpecificationMaturityModel = loadSpecificationMaturityModel(),
): number {
  const leftOrder = getStatusOrder(left, model);
  const rightOrder = getStatusOrder(right, model);
  return leftOrder - rightOrder;
}

export function meetsSpecificationMaturityFloor(
  status: string,
  minimumStatus: string,
  model: SpecificationMaturityModel = loadSpecificationMaturityModel(),
): boolean {
  return compareSpecificationMaturityStatus(status, minimumStatus, model) >= 0;
}

function getStatusOrder(
  status: string,
  model: SpecificationMaturityModel,
): number {
  const matchedEntry = model.statuses.find((entry) => entry.status === status);
  if (!matchedEntry) {
    throw new Error(
      `Unknown specification maturity status: ${status}. Update enterprise/specifications/evolution/maturity-model.yaml to govern this lifecycle state.`,
    );
  }
  return matchedEntry.order;
}

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "yaml";
import { z } from "zod";
import { EOS_ROOT } from "../state.js";

const EXECUTION_DIR = resolve(EOS_ROOT, "enterprise/execution");
const CAPABILITY_REGISTRY_PATH = resolve(EXECUTION_DIR, "CAPABILITY-REGISTRY.yaml");
const EXECUTION_STATUS_PATH = resolve(EXECUTION_DIR, "EXECUTION-STATUS.yaml");

const SEP = "=".repeat(72);

const CapabilityPrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
const CapabilityStatusSchema = z.enum([
  "TODO",
  "READY",
  "READY_FOR_IMPLEMENTATION",
  "IMPLEMENTING",
  "TESTING",
  "INTEGRATING",
  "DONE",
]);

const CapabilityDefinitionSchema = z.object({
  name: z.string().min(1),
  priority: CapabilityPrioritySchema,
  status: CapabilityStatusSchema,
  owner: z.string().min(1).default("unassigned"),
  depends_on: z.array(z.string().min(1)).default([]),
  unlocks: z.array(z.string().min(1)).default([]),
  definition_of_done: z.array(z.string().min(1)).min(1),
  completed_definition_of_done: z.array(z.string().min(1)).default([]),
  outcome: z.string().min(1),
});

const CapabilityRegistrySchema = z.object({
  version: z.string().min(1),
  status: z.string().min(1),
  ssot: z.literal("CAPABILITY_REGISTRY"),
  mission: z.object({
    target: z.string().min(1),
    phase: z.string().min(1),
  }),
  execution: z.object({
    default_agent_state: z.enum(["RUNNING", "WAITING"]),
    auto_continue: z.boolean(),
    stop_on_hard_blocker_only: z.boolean(),
  }),
  state_machine: z.object({
    states: z.array(z.string().min(1)).min(1),
    auto_transition_after_done: z.string().min(1),
  }),
  capabilities: z.record(z.string().min(1), CapabilityDefinitionSchema),
});

type CapabilityPriority = z.infer<typeof CapabilityPrioritySchema>;
type CapabilityStatus = z.infer<typeof CapabilityStatusSchema>;
type CapabilityDefinition = z.infer<typeof CapabilityDefinitionSchema>;
type CapabilityRegistry = z.infer<typeof CapabilityRegistrySchema>;

type EffectiveStatus =
  | "READY"
  | "READY_FOR_IMPLEMENTATION"
  | "IMPLEMENTING"
  | "TESTING"
  | "INTEGRATING"
  | "DONE"
  | "BLOCKED_BY_DEPENDENCIES"
  | "INVALID_DONE";

type NextTransition =
  | "IMPLEMENTING"
  | "TESTING"
  | "INTEGRATING"
  | "DONE"
  | "UNLOCK_NEXT"
  | "WAIT_FOR_DEPENDENCIES"
  | "FIX_DEFINITION_OF_DONE";

type ComputedCapability = {
  readonly id: string;
  readonly name: string;
  readonly priority: CapabilityPriority;
  readonly rawStatus: CapabilityStatus;
  readonly effectiveStatus: EffectiveStatus;
  readonly owner: string;
  readonly dependsOn: readonly string[];
  readonly unlocks: readonly string[];
  readonly outcome: string;
  readonly definitionOfDone: readonly string[];
  readonly completedDefinitionOfDone: readonly string[];
  readonly definitionOfDoneCompletedCount: number;
  readonly definitionOfDoneTotalCount: number;
  readonly progressPercent: number;
  readonly dependenciesSatisfied: boolean;
  readonly blockedBy: readonly string[];
  readonly readyForExecution: boolean;
  readonly nextTransition: NextTransition;
};

type ExecutionStatusReadModel = {
  readonly version: string;
  readonly status: "ACTIVE";
  readonly generated_at_utc: string;
  readonly source_registry_ref: string;
  readonly source_registry_hash: string;
  readonly mission: {
    readonly target: string;
    readonly phase: string;
  };
  readonly execution: {
    readonly default_agent_state: "RUNNING" | "WAITING";
    readonly auto_continue: boolean;
    readonly stop_on_hard_blocker_only: boolean;
  };
  readonly graph: {
    readonly total_capabilities: number;
    readonly ready_count: number;
    readonly active_count: number;
    readonly blocked_count: number;
    readonly done_count: number;
  };
  readonly next_actionable_capability: {
    readonly capability_id: string | null;
    readonly name: string | null;
    readonly priority: CapabilityPriority | null;
    readonly rationale: string;
  };
  readonly active_capabilities: readonly string[];
  readonly ready_capabilities: readonly string[];
  readonly blocked_capabilities: readonly string[];
  readonly completed_capabilities: readonly string[];
  readonly dependency_warnings: {
    readonly missing_dependencies: ReadonlyArray<{ readonly capability_id: string; readonly dependency_id: string }>;
    readonly missing_unlock_targets: ReadonlyArray<{ readonly capability_id: string; readonly unlock_id: string }>;
  };
  readonly capabilities: Readonly<Record<string, Omit<ComputedCapability, "id">>>;
};

function loadCapabilityRegistry(): CapabilityRegistry {
  if (!existsSync(CAPABILITY_REGISTRY_PATH)) {
    throw new Error(`Capability registry not found at ${CAPABILITY_REGISTRY_PATH}.`);
  }

  const raw = readFileSync(CAPABILITY_REGISTRY_PATH, "utf8");
  const parsed = yaml.parse(raw) as unknown;
  const result = CapabilityRegistrySchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  · ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Capability registry failed schema validation:\n${issues}`);
  }
  return result.data;
}

function loadExecutionStatusReadModel(): ExecutionStatusReadModel {
  if (!existsSync(EXECUTION_STATUS_PATH)) {
    throw new Error(
      `Execution status read model not found at ${EXECUTION_STATUS_PATH}. Run: pnpm eos execution refresh-status`,
    );
  }
  const raw = readFileSync(EXECUTION_STATUS_PATH, "utf8");
  return yaml.parse(raw) as ExecutionStatusReadModel;
}

function writeCapabilityRegistry(registry: CapabilityRegistry): void {
  writeFileSync(CAPABILITY_REGISTRY_PATH, yaml.stringify(registry), "utf8");
}

function writeExecutionStatusReadModel(readModel: ExecutionStatusReadModel): void {
  writeFileSync(EXECUTION_STATUS_PATH, yaml.stringify(readModel), "utf8");
}

function getCapabilityOrThrow(
  registry: CapabilityRegistry,
  capabilityId: string,
): CapabilityDefinition {
  const capability = registry.capabilities[capabilityId];
  if (!capability) {
    throw new Error(`Capability not found in registry: ${capabilityId}`);
  }
  return capability;
}

function persistRegistryAndRefreshStatus(
  registry: CapabilityRegistry,
): ExecutionStatusReadModel {
  writeCapabilityRegistry(registry);
  const readModel = buildExecutionStatusReadModel(registry);
  writeExecutionStatusReadModel(readModel);
  return readModel;
}

function priorityWeight(priority: CapabilityPriority): number {
  switch (priority) {
    case "P0":
      return 0;
    case "P1":
      return 1;
    case "P2":
      return 2;
    case "P3":
      return 3;
  }
}

function computeProgressPercent(capability: CapabilityDefinition): {
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
} {
  const required = new Set(capability.definition_of_done);
  const completed = capability.completed_definition_of_done.filter((item) => required.has(item)).length;
  const total = capability.definition_of_done.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return {
    completed,
    total,
    percent,
  };
}

function isDefinitionOfDoneComplete(capability: CapabilityDefinition): boolean {
  const completedItems = new Set(capability.completed_definition_of_done);
  return capability.definition_of_done.every((item) => completedItems.has(item));
}

function sortCapabilities(capabilities: readonly ComputedCapability[]): readonly ComputedCapability[] {
  return [...capabilities].sort((a, b) => {
    const priorityDelta = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return a.id.localeCompare(b.id);
  });
}

function buildExecutionStatusReadModel(registry: CapabilityRegistry): ExecutionStatusReadModel {
  const capabilityEntries = Object.entries(registry.capabilities);
  const capabilityIds = new Set(capabilityEntries.map(([id]) => id));

  const missingDependencies: Array<{ capability_id: string; dependency_id: string }> = [];
  const missingUnlockTargets: Array<{ capability_id: string; unlock_id: string }> = [];

  capabilityEntries.forEach(([capabilityId, capability]) => {
    capability.depends_on.forEach((dependencyId) => {
      if (!capabilityIds.has(dependencyId)) {
        missingDependencies.push({ capability_id: capabilityId, dependency_id: dependencyId });
      }
    });
    capability.unlocks.forEach((unlockId) => {
      if (!capabilityIds.has(unlockId)) {
        missingUnlockTargets.push({ capability_id: capabilityId, unlock_id: unlockId });
      }
    });
  });

  const completedCapabilityIds = new Set(
    capabilityEntries
      .filter(([, capability]) => capability.status === "DONE" && isDefinitionOfDoneComplete(capability))
      .map(([capabilityId]) => capabilityId),
  );

  const computedCapabilities = capabilityEntries.map(([capabilityId, capability]) => {
    const progress = computeProgressPercent(capability);
    const blockedBy = capability.depends_on.filter((dependencyId) => !completedCapabilityIds.has(dependencyId));
    const dependenciesSatisfied = blockedBy.length === 0;
    const definitionOfDoneComplete = isDefinitionOfDoneComplete(capability);

    let effectiveStatus: EffectiveStatus;
    if (capability.status === "DONE") {
      effectiveStatus = definitionOfDoneComplete ? "DONE" : "INVALID_DONE";
    } else if (!dependenciesSatisfied) {
      effectiveStatus = "BLOCKED_BY_DEPENDENCIES";
    } else if (capability.status === "TODO") {
      effectiveStatus = "READY";
    } else {
      effectiveStatus = capability.status;
    }

    let nextTransition: NextTransition;
    switch (effectiveStatus) {
      case "READY":
      case "READY_FOR_IMPLEMENTATION":
        nextTransition = "IMPLEMENTING";
        break;
      case "IMPLEMENTING":
        nextTransition = "TESTING";
        break;
      case "TESTING":
        nextTransition = "INTEGRATING";
        break;
      case "INTEGRATING":
        nextTransition = definitionOfDoneComplete ? "DONE" : "FIX_DEFINITION_OF_DONE";
        break;
      case "DONE":
        nextTransition = "UNLOCK_NEXT";
        break;
      case "INVALID_DONE":
        nextTransition = "FIX_DEFINITION_OF_DONE";
        break;
      case "BLOCKED_BY_DEPENDENCIES":
        nextTransition = "WAIT_FOR_DEPENDENCIES";
        break;
    }

    const readyForExecution =
      effectiveStatus === "READY" || effectiveStatus === "READY_FOR_IMPLEMENTATION";

    const computed: ComputedCapability = {
      id: capabilityId,
      name: capability.name,
      priority: capability.priority,
      rawStatus: capability.status,
      effectiveStatus,
      owner: capability.owner,
      dependsOn: capability.depends_on,
      unlocks: capability.unlocks,
      outcome: capability.outcome,
      definitionOfDone: capability.definition_of_done,
      completedDefinitionOfDone: capability.completed_definition_of_done,
      definitionOfDoneCompletedCount: progress.completed,
      definitionOfDoneTotalCount: progress.total,
      progressPercent: progress.percent,
      dependenciesSatisfied,
      blockedBy,
      readyForExecution,
      nextTransition,
    };
    return computed;
  });

  const readyCapabilities = sortCapabilities(
    computedCapabilities.filter((capability) => capability.readyForExecution),
  );
  const activeCapabilities = sortCapabilities(
    computedCapabilities.filter((capability) =>
      capability.effectiveStatus === "IMPLEMENTING" ||
      capability.effectiveStatus === "TESTING" ||
      capability.effectiveStatus === "INTEGRATING",
    ),
  );
  const blockedCapabilities = sortCapabilities(
    computedCapabilities.filter((capability) => capability.effectiveStatus === "BLOCKED_BY_DEPENDENCIES"),
  );
  const completedCapabilities = sortCapabilities(
    computedCapabilities.filter((capability) => capability.effectiveStatus === "DONE"),
  );

  const nextActionableCapability = readyCapabilities[0];
  const nextActionRationale = nextActionableCapability
    ? `Highest-priority capability with satisfied dependencies: ${nextActionableCapability.id}`
    : activeCapabilities.length > 0
      ? "No READY capability available because work is already in progress."
      : "No READY capability available. Resolve blockers or expand backlog.";

  const registryRaw = readFileSync(CAPABILITY_REGISTRY_PATH, "utf8");
  const registryHash = `sha256:${createHash("sha256").update(registryRaw).digest("hex")}`;

  return {
    version: "1.0.0",
    status: "ACTIVE",
    generated_at_utc: new Date().toISOString(),
    source_registry_ref: "enterprise/execution/CAPABILITY-REGISTRY.yaml",
    source_registry_hash: registryHash,
    mission: {
      target: registry.mission.target,
      phase: registry.mission.phase,
    },
    execution: {
      default_agent_state: registry.execution.default_agent_state,
      auto_continue: registry.execution.auto_continue,
      stop_on_hard_blocker_only: registry.execution.stop_on_hard_blocker_only,
    },
    graph: {
      total_capabilities: computedCapabilities.length,
      ready_count: readyCapabilities.length,
      active_count: activeCapabilities.length,
      blocked_count: blockedCapabilities.length,
      done_count: completedCapabilities.length,
    },
    next_actionable_capability: {
      capability_id: nextActionableCapability?.id ?? null,
      name: nextActionableCapability?.name ?? null,
      priority: nextActionableCapability?.priority ?? null,
      rationale: nextActionRationale,
    },
    active_capabilities: activeCapabilities.map((capability) => capability.id),
    ready_capabilities: readyCapabilities.map((capability) => capability.id),
    blocked_capabilities: blockedCapabilities.map((capability) => capability.id),
    completed_capabilities: completedCapabilities.map((capability) => capability.id),
    dependency_warnings: {
      missing_dependencies: missingDependencies,
      missing_unlock_targets: missingUnlockTargets,
    },
    capabilities: Object.fromEntries(
      computedCapabilities.map((capability) => {
        const { id, ...rest } = capability;
        return [id, rest];
      }),
    ),
  };
}

export async function runExecutionRefreshStatusCommand(): Promise<number> {
  const registry = loadCapabilityRegistry();
  const readModel = buildExecutionStatusReadModel(registry);
  writeExecutionStatusReadModel(readModel);

  process.stdout.write(
    [
      `execution_status_path=${EXECUTION_STATUS_PATH}`,
      `source_registry_ref=${readModel.source_registry_ref}`,
      `source_registry_hash=${readModel.source_registry_hash}`,
      `next_capability=${readModel.next_actionable_capability.capability_id ?? "NONE"}`,
      `next_priority=${readModel.next_actionable_capability.priority ?? "NONE"}`,
      `ready_count=${readModel.graph.ready_count}`,
      `active_count=${readModel.graph.active_count}`,
      `blocked_count=${readModel.graph.blocked_count}`,
      `done_count=${readModel.graph.done_count}`,
    ].join("\n") + "\n",
  );
  return 0;
}

export async function runExecutionStatusCommand(): Promise<number> {
  const readModel = loadExecutionStatusReadModel();

  process.stdout.write(`${SEP}\n`);
  process.stdout.write("EOS  ·  Execution Graph Status  ·  Capability Registry SSOT\n");
  process.stdout.write(`${SEP}\n`);
  process.stdout.write(`Source registry : ${readModel.source_registry_ref}\n`);
  process.stdout.write(`Registry hash   : ${readModel.source_registry_hash}\n`);
  process.stdout.write(`Mission         : ${readModel.mission.target}\n`);
  process.stdout.write(`Phase           : ${readModel.mission.phase}\n`);
  process.stdout.write(`Agent state     : ${readModel.execution.default_agent_state}\n`);
  process.stdout.write(`Auto continue   : ${String(readModel.execution.auto_continue)}\n`);
  process.stdout.write("\n");

  process.stdout.write("── Graph Summary ────────────────────────────────────────────────\n");
  process.stdout.write(`  Total      : ${readModel.graph.total_capabilities}\n`);
  process.stdout.write(`  Ready      : ${readModel.graph.ready_count}\n`);
  process.stdout.write(`  Active     : ${readModel.graph.active_count}\n`);
  process.stdout.write(`  Blocked    : ${readModel.graph.blocked_count}\n`);
  process.stdout.write(`  Done       : ${readModel.graph.done_count}\n`);
  process.stdout.write("\n");

  process.stdout.write("── Next Actionable Capability ──────────────────────────────────\n");
  process.stdout.write(`  ID         : ${readModel.next_actionable_capability.capability_id ?? "NONE"}\n`);
  process.stdout.write(`  Name       : ${readModel.next_actionable_capability.name ?? "NONE"}\n`);
  process.stdout.write(`  Priority   : ${readModel.next_actionable_capability.priority ?? "NONE"}\n`);
  process.stdout.write(`  Why        : ${readModel.next_actionable_capability.rationale}\n`);
  process.stdout.write("\n");

  process.stdout.write("── Ready Capabilities ──────────────────────────────────────────\n");
  if (readModel.ready_capabilities.length === 0) {
    process.stdout.write("  NONE\n");
  } else {
    readModel.ready_capabilities.forEach((capabilityId) => {
      const capability = readModel.capabilities[capabilityId];
        if (!capability) {
          process.stdout.write(`  ${capabilityId}  ·  MISSING_IN_READ_MODEL\n`);
          return;
        }
      process.stdout.write(
        `  ${capabilityId}  ·  ${capability.priority}  ·  ${capability.name}  ·  progress=${capability.progressPercent}%\n`,
      );
    });
  }
  process.stdout.write("\n");

  process.stdout.write("── Active Capabilities ─────────────────────────────────────────\n");
  if (readModel.active_capabilities.length === 0) {
    process.stdout.write("  NONE\n");
  } else {
    readModel.active_capabilities.forEach((capabilityId) => {
      const capability = readModel.capabilities[capabilityId];
        if (!capability) {
          process.stdout.write(`  ${capabilityId}  ·  MISSING_IN_READ_MODEL\n`);
          return;
        }
      process.stdout.write(
        `  ${capabilityId}  ·  ${capability.effectiveStatus}  ·  ${capability.name}  ·  progress=${capability.progressPercent}%\n`,
      );
    });
  }
  process.stdout.write("\n");

  process.stdout.write("── Blocked Capabilities ────────────────────────────────────────\n");
  if (readModel.blocked_capabilities.length === 0) {
    process.stdout.write("  NONE\n");
  } else {
    readModel.blocked_capabilities.forEach((capabilityId) => {
      const capability = readModel.capabilities[capabilityId];
        if (!capability) {
          process.stdout.write(`  ${capabilityId}  ·  MISSING_IN_READ_MODEL\n`);
          return;
        }
      process.stdout.write(
        `  ${capabilityId}  ·  blocked_by=[${capability.blockedBy.join(", ")}]  ·  ${capability.name}\n`,
      );
    });
  }
  process.stdout.write(`${SEP}\n`);
  return 0;
}

export async function runExecutionNextCommand(): Promise<number> {
  const readModel = buildExecutionStatusReadModel(loadCapabilityRegistry());
  const nextAction = readModel.next_actionable_capability;
  if (!nextAction.capability_id || !nextAction.name || !nextAction.priority) {
    process.stdout.write("next_capability=NONE\n");
    process.stdout.write(`reason=${nextAction.rationale}\n`);
    return 0;
  }

  const capability = readModel.capabilities[nextAction.capability_id];
  if (!capability) {
    throw new Error(
      `Execution read model is inconsistent. Missing capability entry for ${nextAction.capability_id}.`,
    );
  }
  process.stdout.write(
    [
      `next_capability=${nextAction.capability_id}`,
      `name=${nextAction.name}`,
      `priority=${nextAction.priority}`,
      `effective_status=${capability.effectiveStatus}`,
      `next_transition=${capability.nextTransition}`,
      `progress_percent=${capability.progressPercent}`,
      `reason=${nextAction.rationale}`,
    ].join("\n") + "\n",
  );
  return 0;
}

export async function runExecutionAdvanceCommand(
  capabilityId: string,
): Promise<number> {
  const registry = loadCapabilityRegistry();
  const capability = getCapabilityOrThrow(registry, capabilityId);
  const readModel = buildExecutionStatusReadModel(registry);
  const computed = readModel.capabilities[capabilityId];

  if (!computed) {
    throw new Error(
      `Execution read model is inconsistent. Missing capability entry for ${capabilityId}.`,
    );
  }

  if (computed.nextTransition === "WAIT_FOR_DEPENDENCIES") {
    throw new Error(
      `Capability ${capabilityId} is blocked by dependencies: ${computed.blockedBy.join(", ")}`,
    );
  }

  if (computed.nextTransition === "FIX_DEFINITION_OF_DONE") {
    throw new Error(
      `Capability ${capabilityId} cannot advance to DONE because Definition of Done is incomplete.`,
    );
  }

  if (computed.nextTransition === "UNLOCK_NEXT") {
    process.stdout.write(
      [
        `capability=${capabilityId}`,
        `status=${computed.effectiveStatus}`,
        "result=ALREADY_DONE",
        `next_capability=${readModel.next_actionable_capability.capability_id ?? "NONE"}`,
      ].join("\n") + "\n",
    );
    return 0;
  }

  const nextStatus = computed.nextTransition;
  const updatedRegistry: CapabilityRegistry = {
    ...registry,
    capabilities: {
      ...registry.capabilities,
      [capabilityId]: {
        ...capability,
        status: nextStatus,
      },
    },
  };

  const refreshed = persistRegistryAndRefreshStatus(updatedRegistry);
  const refreshedCapability = refreshed.capabilities[capabilityId];
  if (!refreshedCapability) {
    throw new Error(
      `Execution read model is inconsistent after update. Missing capability entry for ${capabilityId}.`,
    );
  }

  process.stdout.write(
    [
      `capability=${capabilityId}`,
      `previous_status=${computed.rawStatus}`,
      `next_status=${nextStatus}`,
      `effective_status=${refreshedCapability.effectiveStatus}`,
      `progress_percent=${refreshedCapability.progressPercent}`,
      `next_transition=${refreshedCapability.nextTransition}`,
      `next_capability=${refreshed.next_actionable_capability.capability_id ?? "NONE"}`,
    ].join("\n") + "\n",
  );
  return 0;
}

export async function runExecutionCompleteDefinitionOfDoneItemCommand(
  capabilityId: string,
  item: string,
): Promise<number> {
  const registry = loadCapabilityRegistry();
  const capability = getCapabilityOrThrow(registry, capabilityId);

  if (!capability.definition_of_done.includes(item)) {
    throw new Error(
      `Definition of Done item '${item}' is not declared for ${capabilityId}. Allowed items: ${capability.definition_of_done.join(", ")}`,
    );
  }

  const completedItems = capability.completed_definition_of_done.includes(item)
    ? capability.completed_definition_of_done
    : [...capability.completed_definition_of_done, item];

  const updatedRegistry: CapabilityRegistry = {
    ...registry,
    capabilities: {
      ...registry.capabilities,
      [capabilityId]: {
        ...capability,
        completed_definition_of_done: completedItems,
      },
    },
  };

  const refreshed = persistRegistryAndRefreshStatus(updatedRegistry);
  const refreshedCapability = refreshed.capabilities[capabilityId];
  if (!refreshedCapability) {
    throw new Error(
      `Execution read model is inconsistent after DoD update. Missing capability entry for ${capabilityId}.`,
    );
  }

  process.stdout.write(
    [
      `capability=${capabilityId}`,
      `completed_definition_of_done_item=${item}`,
      `completed_count=${refreshedCapability.definitionOfDoneCompletedCount}`,
      `total_count=${refreshedCapability.definitionOfDoneTotalCount}`,
      `progress_percent=${refreshedCapability.progressPercent}`,
      `next_transition=${refreshedCapability.nextTransition}`,
    ].join("\n") + "\n",
  );
  return 0;
}

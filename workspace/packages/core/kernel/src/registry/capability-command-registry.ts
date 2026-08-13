import type { CapabilityCommand } from "../types";
import { caseCommands } from "@capabilities/legal-case/implementation/commands/case.commands";
import { serviceDirectoryCommands } from "@capabilities/service-directory/implementation/commands/service.commands";
import { legalCommunityCommands } from "@capabilities/legal-community/implementation/commands/community.commands";
import { documentCommands } from "@capabilities/legal-document/implementation/commands/document.commands";
import { requirementCommands } from "@capabilities/requirement-management/implementation/commands/requirement.commands";
import { identityCommands } from "@capabilities/identity/implementation/commands";

export interface CommandInvocationRecord {
  readonly commandKey: string;
  readonly capability: string;
  readonly commandName: string;
  readonly invokedAt: string;
  readonly inputSize: number;
  readonly ok: boolean;
  readonly errorMessage?: string;
}

const GLOBAL_REGISTRY: Readonly<Record<string, CapabilityCommand>> = {
  ...identityCommands,
  ...caseCommands,
  ...serviceDirectoryCommands,
  ...legalCommunityCommands,
  ...documentCommands,
  ...requirementCommands,
} as const;

const CAPABILITY_PREFIX_ALIASES: Readonly<Record<string, readonly string[]>> = {
  identity: ["identity."],
  auth: ["identity."],
  i: ["identity."],
  tenant: ["identity."],
  tnt: ["identity."],
  "saas-context": ["identity."],
  workspace: ["identity."],
  ws: ["identity."],
  membership: ["identity."],
  "legal-case": ["case.", "legal-case."],
  lawyershub: ["case.", "legal-case."],
  "legal-document": ["document.", "legal-document."],
  documents: ["document.", "legal-document."],
  "requirement-management": ["requirement.", "requirement-management."],
  requirements: ["requirement.", "requirement-management."],
  "service-directory": ["service-directory."],
  "services-id": ["service-directory."],
  services: ["service-directory."],
  "legal-community": ["legal-community."],
  ilc: ["legal-community."],
  academic: ["legal-community."],
  community: ["legal-community."],
} as const;

function normalizeCommandName(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

const ALL_KEYS = Object.keys(GLOBAL_REGISTRY);
const KEY_INDEX: ReadonlyMap<string, string> = new Map(
  ALL_KEYS.map((k) => [normalizeCommandName(k), k]),
);

export const capabilityRegistry = {
  listCommandKeys(): readonly string[] {
    return [...ALL_KEYS].sort();
  },
  resolve(commandKey: string): CapabilityCommand | undefined {
    return GLOBAL_REGISTRY[commandKey];
  },
  prefixesFor(capability: string): readonly string[] {
    const aliases = CAPABILITY_PREFIX_ALIASES[capability.toLowerCase()];
    if (aliases !== undefined) return aliases;
    const short = capability.toLowerCase().split("-").slice(-1)[0] ?? capability.toLowerCase();
    return [`${capability.toLowerCase()}.`, `${short}.`];
  },
  resolveByParts(capability: string, commandName: string): {
    readonly command: CapabilityCommand | undefined;
    readonly candidates: readonly string[];
    readonly attemptedKeys: readonly string[];
  } {
    const attemptedKeys: string[] = [];
    const candidates: string[] = [];
    const capLower = capability.toLowerCase();
    const cmdNorm = normalizeCommandName(commandName);
    const prefixes = this.prefixesFor(capLower);

    for (const prefix of prefixes) {
      const directKey = `${prefix}${commandName}`;
      attemptedKeys.push(directKey);
      if (GLOBAL_REGISTRY[directKey] !== undefined) {
        const related = ALL_KEYS.filter((k) => k.startsWith(prefix)).slice(0, 12);
        return { command: GLOBAL_REGISTRY[directKey], candidates: related, attemptedKeys };
      }
      const stripped = commandName.replace(/^create|^publish|^accept|^mark|^assign|^close|^update|^approve|^start|^verify|^get|^search|^sign|^archive|^list/i, "");
      const lowFirst = stripped.length > 0 ? stripped[0]!.toLowerCase() + stripped.slice(1) : stripped;
      const variants = [
        `${prefix}${commandName}`,
        `${prefix}${commandName.charAt(0)!.toLowerCase()}${commandName.slice(1)}`,
        `${prefix}${lowFirst}`,
      ];
      for (const v of variants) attemptedKeys.push(v);
    }

    const normExact = KEY_INDEX.get(cmdNorm);
    if (normExact !== undefined) {
      attemptedKeys.push(`norm:${normExact}`);
      const command = GLOBAL_REGISTRY[normExact];
      if (command !== undefined) {
        return { command, candidates: this.listCommandKeys().slice(0, 12), attemptedKeys };
      }
    }

    const prefixCandidates = new Set<string>();
    for (const prefix of prefixes) {
      for (const k of ALL_KEYS) if (k.startsWith(prefix)) prefixCandidates.add(k);
    }
    const suffixMatches = ALL_KEYS.filter((k) => normalizeCommandName(k).endsWith(cmdNorm) || cmdNorm.endsWith(normalizeCommandName(k.split(".").pop()!)));
    for (const k of suffixMatches.slice(0, 8)) prefixCandidates.add(k);

    return { command: undefined, candidates: Array.from(prefixCandidates).slice(0, 12), attemptedKeys };
  },
  invoke<Output = unknown>(
    capability: string,
    commandName: string,
    input: unknown,
  ): { readonly output: Output; readonly record: CommandInvocationRecord } {
    const { command, candidates, attemptedKeys } = this.resolveByParts(capability, commandName);
    if (command === undefined) {
      const sortedCandidates = candidates.slice(0, 8).join(", ");
      throw new Error(
        `[capability-registry] Command not found: capability=${capability}, commandName=${commandName}. attempted=${attemptedKeys.join(" | ")}. Available candidates (${candidates.length}): ${sortedCandidates.length > 0 ? sortedCandidates : "(none)"}. Global total keys: ${ALL_KEYS.length}.`,
      );
    }
    const matchedKey =
      ALL_KEYS.find((k) => GLOBAL_REGISTRY[k] === command) ?? `${capability}.${commandName}`;
    const inputSize =
      typeof input === "string"
        ? input.length
        : typeof input === "object" && input !== null
          ? JSON.stringify(input).length
          : String(input).length;
    const recordBase: Omit<CommandInvocationRecord, "ok" | "errorMessage"> = {
      commandKey: matchedKey,
      capability,
      commandName,
      invokedAt: new Date().toISOString(),
      inputSize,
    };
    try {
      const output = command.execute(input as never) as Output;
      return {
        output,
        record: { ...recordBase, ok: true },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw Object.assign(new Error(message), {
        invocationRecord: { ...recordBase, ok: false, errorMessage: message },
      });
    }
  },

  async invokeAsync<Output = unknown>(
    capability: string,
    commandName: string,
    input: unknown,
  ): Promise<{ readonly output: Awaited<Output>; readonly record: CommandInvocationRecord }> {
    const { command, candidates, attemptedKeys } = this.resolveByParts(capability, commandName);
    if (command === undefined) {
      const sortedCandidates = candidates.slice(0, 8).join(", ");
      throw new Error(
        `[capability-registry] Command not found: capability=${capability}, commandName=${commandName}. attempted=${attemptedKeys.join(" | ")}. Available candidates (${candidates.length}): ${sortedCandidates.length > 0 ? sortedCandidates : "(none)"}. Global total keys: ${ALL_KEYS.length}.`,
      );
    }
    const matchedKey =
      ALL_KEYS.find((k) => GLOBAL_REGISTRY[k] === command) ?? `${capability}.${commandName}`;
    const inputSize =
      typeof input === "string"
        ? input.length
        : typeof input === "object" && input !== null
          ? JSON.stringify(input).length
          : String(input).length;
    const recordBase: Omit<CommandInvocationRecord, "ok" | "errorMessage"> = {
      commandKey: matchedKey,
      capability,
      commandName,
      invokedAt: new Date().toISOString(),
      inputSize,
    };
    try {
      const output = await command.execute(input as never) as Awaited<Output>;
      return {
        output,
        record: { ...recordBase, ok: true },
      };
    } catch (err) {
      console.error("[capability-registry] Original error in command execution:", err);
      const message = err instanceof Error ? err.message : String(err);
      throw Object.assign(new Error(message), {
        invocationRecord: { ...recordBase, ok: false, errorMessage: message },
      });
    }
  },
} as const;
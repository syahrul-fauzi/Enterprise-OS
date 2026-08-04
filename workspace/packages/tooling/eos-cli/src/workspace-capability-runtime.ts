import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parseCapabilityEntries(serialized: string): readonly string[] {
  return serialized
    .split(",")
    .map((entry) => entry.trim().replaceAll(/["']/g, ""))
    .filter((entry) => entry.length > 0);
}

function escapeRegex(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function readWorkspaceCapabilities(path: string): readonly string[] {
  const sources = [path, resolve(dirname(path), "workspace.binding.ts")].filter((candidate, index, all) =>
    all.indexOf(candidate) === index && existsSync(candidate),
  );

  for (const sourcePath of sources) {
    const source = readFileSync(sourcePath, "utf8");
    const match = source.match(/capabilities:\s*\[([^\]]+)\]/m);
    if (!match?.[1]) {
      continue;
    }

    const entries = parseCapabilityEntries(match[1]);
    if (entries.length === 1 && entries[0]?.startsWith("...")) {
      const arrayRef = entries[0].slice(3);
      const arrayMatch = source.match(
        new RegExp(
          `const\\s+${escapeRegex(arrayRef)}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as const`,
          "m",
        ),
      );
      if (arrayMatch?.[1]) {
        return parseCapabilityEntries(arrayMatch[1]);
      }
    }

    return entries;
  }

  throw new Error(`Unable to parse workspace capabilities from ${path}`);
}

export function tryReadWorkspaceCapabilities(path: string): readonly string[] {
  try {
    return readWorkspaceCapabilities(path);
  } catch {
    return [];
  }
}

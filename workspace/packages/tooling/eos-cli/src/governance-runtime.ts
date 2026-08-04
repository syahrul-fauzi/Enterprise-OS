import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "yaml";

export function ensureDirectory(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function writeJsonArtifact(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeYamlArtifact(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.stringify(value), "utf8");
}

export function writeTextArtifact(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function readJsonArtifact<T>(path: string): T {
  return JSON.parse(requireFileText(path)) as T;
}

export function readYamlArtifact<T>(path: string): T {
  return yaml.parse(requireFileText(path)) as T;
}

export function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

export function resetArtifact(path: string): void {
  rmSync(path, { force: true });
}

export function captureExecutionTimestampUtc(): string {
  return new Date().toISOString();
}

export function fail(message: string): never {
  throw new Error(message);
}

function requireFileText(path: string): string {
  return readFileSync(path, "utf8");
}

export function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  extraEnv: Readonly<Record<string, string>> = {},
): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  if (result.status !== 0) {
    throw new Error(
      [result.stdout, result.stderr].filter(Boolean).join("\n") || `Command failed: ${command}`,
    );
  }
  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

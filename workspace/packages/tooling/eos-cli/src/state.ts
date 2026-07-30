import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import { GovernanceStateSchema, GovernanceState, RepositoryState } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const EOS_ROOT = resolve(__dirname, "../../../../..");
export const GOVERNANCE_DIR = resolve(EOS_ROOT, "governance");
export const GOVERNANCE_STATE_PATH = resolve(GOVERNANCE_DIR, "GOVERNANCE_STATE.yaml");

export function loadGovernanceState(): GovernanceState {
  if (!existsSync(GOVERNANCE_STATE_PATH)) {
    throw new Error(
      `GOVERNANCE_STATE.yaml not found at ${GOVERNANCE_STATE_PATH}. Verify repository checkout.`
    );
  }
  const raw = readFileSync(GOVERNANCE_STATE_PATH, "utf8");
  const parsed = yaml.parse(raw) as unknown;
  const result = GovernanceStateSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i: { readonly path: readonly unknown[]; readonly message: string }) => `  · ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `GOVERNANCE_STATE.yaml failed schema validation:\n${issues}\n\nThis file is the single read model. ACL/CLI/CI semuanya membaca file ini. Perbaiki terlebih dahulu.`
    );
  }
  return result.data;
}

export function getRepositoryState(): RepositoryState {
  return loadGovernanceState().repository_state;
}

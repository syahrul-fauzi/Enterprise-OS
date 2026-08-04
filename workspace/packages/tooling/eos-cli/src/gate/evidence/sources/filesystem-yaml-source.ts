import { join } from "node:path";

import type { EvidenceSource } from "./evidence-source.js";

export type FilesystemYamlEvidenceSource = EvidenceSource<
  string,
  Record<string, unknown>
>;

export function createFilesystemYamlEvidenceSource(input: {
  readonly rootDir: string;
  readonly readYamlRecord: (path: string) => Record<string, unknown>;
}): FilesystemYamlEvidenceSource {
  return {
    read(path) {
      return input.readYamlRecord(join(input.rootDir, path));
    },
  };
}

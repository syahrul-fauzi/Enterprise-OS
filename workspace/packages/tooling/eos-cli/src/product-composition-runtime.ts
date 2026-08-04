import { readFileSync } from "node:fs";
import yaml from "yaml";

export type ProductMappingRow = {
  readonly feature: string;
  readonly capability: string;
  readonly module: string;
  readonly primitive: string;
};

export type ProductCompositionManifest = {
  readonly id: string;
  readonly extends?: readonly string[];
  readonly patterns?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly surfaces?: readonly string[];
};

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function primitiveList(value: string): readonly string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function readProductCompositionManifest(path: string): ProductCompositionManifest {
  return yaml.parse(readFileSync(path, "utf8")) as ProductCompositionManifest;
}

export function materializeCompositionTree(input: {
  readonly productId: string;
  readonly compositionManifest: ProductCompositionManifest;
  readonly rows: readonly ProductMappingRow[];
}): string {
  const lines = [
    input.productId,
    `├── composition: ${input.compositionManifest.id}`,
    ...(input.compositionManifest.extends ?? []).map((entry) => `│   ├── extends: ${entry}`),
    ...(input.compositionManifest.patterns ?? []).map((entry) => `│   ├── pattern: ${entry}`),
    ...(input.compositionManifest.surfaces ?? []).map((entry) => `│   ├── surface: ${entry}`),
    "└── features",
    ...input.rows.flatMap((row, index) => {
      const prefix = index === input.rows.length - 1 ? "    " : "│   ";
      return [
        `${prefix}├── ${row.feature}`,
        `${prefix}│   ├── capability: ${row.capability}`,
        `${prefix}│   ├── module: ${row.module}`,
        ...primitiveList(row.primitive).map((entry) => `${prefix}│   └── primitive: ${entry}`),
      ];
    }),
  ];
  return `${lines.join("\n")}\n`;
}

export function materializeCapabilityMappingMatrixCsv(
  rows: readonly ProductMappingRow[],
): string {
  const header = "Feature,Capability,Module,Primitive\n";
  const body = rows
    .map((row) =>
      [row.feature, row.capability, row.module, row.primitive].map(csvEscape).join(","),
    )
    .join("\n");
  return `${header}${body}\n`;
}

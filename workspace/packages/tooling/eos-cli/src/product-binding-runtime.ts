import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "yaml";

export type ProductBindingManifest = {
  readonly product?: {
    readonly id?: string;
  };
  readonly experience?: {
    readonly surface?: string;
    readonly route?: string;
  };
  readonly capabilities?: readonly string[];
};

function readYamlFile<T>(path: string): T {
  return yaml.parse(readFileSync(path, "utf8")) as T;
}

export function resolveProductBindingPath(input: {
  readonly workspaceRoot: string;
  readonly productId: string;
}): string {
  return resolve(input.workspaceRoot, `products/${input.productId}/product.binding.yaml`);
}

export function readProductBindingManifest(path: string): ProductBindingManifest {
  return readYamlFile<ProductBindingManifest>(path);
}

export function resolveProductWorkspaceManifestPath(input: {
  readonly workspaceRoot: string;
  readonly productId: string;
}): string {
  const bindingPath = resolveProductBindingPath(input);
  if (existsSync(bindingPath)) {
    const binding = readProductBindingManifest(bindingPath);
    const surface = binding.experience?.surface;
    if (surface && surface.trim().length > 0) {
      return resolve(input.workspaceRoot, `apps/${surface}/workspace.manifest.ts`);
    }
  }

  return resolve(input.workspaceRoot, `apps/${input.productId}/workspace.manifest.ts`);
}

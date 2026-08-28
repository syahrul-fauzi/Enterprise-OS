import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ProductPreviewBinding {
  readonly productId: string;
  readonly displayName: string;
  readonly route: string;
  readonly surface: string;
}

interface ProductBindingManifest {
  readonly product?: {
    readonly id?: string;
    readonly display_name?: string;
  };
  readonly experience?: {
    readonly route?: string;
    readonly surface?: string;
  };
}

function workspaceRoot(): string {
  // REALITY PATH ONLY: Detect correct workspace root for both local and containerized environments
  const localRoot = resolve("/root/Enterprise-OS/workspace");
  const containerRoot = resolve("/app");
  const isLocal = existsSync(resolve(localRoot, "products"));
  const workspaceRoot = isLocal ? localRoot : containerRoot;
  console.log(`[product-binding.ts] REALITY_PATH_ONLY: workspaceRoot set to ${workspaceRoot}, products exists?`, existsSync(resolve(workspaceRoot, "products")));
  return workspaceRoot;
}

function resolveProductBindingPath(productId: string): string {
  return resolve(workspaceRoot(), `products/${productId}/product.binding.yaml`);
}

function readScalarField(raw: string, fieldName: string): string | undefined {
  const flatEscaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flatMatch = raw.match(new RegExp(`^\\s*${flatEscaped}:\\s*(.+)$`, "m"));
  if (flatMatch && flatMatch[1]) {
    const v = flatMatch[1].trim().replace(/^["']|["']$/g, "");
    if (v) return v;
  }

  const parts = fieldName.split(".");
  if (parts.length !== 2) return undefined;

  const parent = parts[0];
  const child = parts[1];
  if (!parent || !child) return undefined;
  const parentEscaped = parent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const childEscaped = child.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nestedMatch = raw.match(
    new RegExp(
      `^\\s*${parentEscaped}:\\s*\\n((?:\\s+[^\\n]*\\n)*?)\\s*${childEscaped}:\\s*(.+)$`,
      "m",
    ),
  );
  const nestedValue = nestedMatch?.[2];
  return nestedValue ? nestedValue.trim().replace(/^["']|["']$/g, "") : undefined;
}

function readProductBindingManifest(productId: string): ProductBindingManifest {
  const raw = readFileSync(resolveProductBindingPath(productId), "utf8");

  return {
    product: {
      id: readScalarField(raw, "product.id"),
      display_name: readScalarField(raw, "product.display_name"),
    },
    experience: {
      route: readScalarField(raw, "experience.route"),
      surface: readScalarField(raw, "experience.surface"),
    },
  };
}

export function readProductBinding(productId: string): ProductPreviewBinding {
  const manifest = readProductBindingManifest(productId);
  
  return {
    productId: manifest.product?.id || productId,
    displayName: manifest.product?.display_name || productId,
    route: manifest.experience?.route || `/${productId}`,
    surface: manifest.experience?.surface || "web",
  };
}
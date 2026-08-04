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
  const current = resolve(process.cwd());
  if (existsSync(resolve(current, "products"))) {
    return current;
  }

  const candidate = resolve(current, "../..");
  if (existsSync(resolve(candidate, "products"))) {
    return candidate;
  }

  return current;
}

function resolveProductBindingPath(productId: string): string {
  return resolve(workspaceRoot(), `products/${productId}/product.binding.yaml`);
}

function readScalarField(raw: string, fieldName: string): string | null {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = raw.match(new RegExp(`^\\s*${escaped}:\\s*(.+)$`, "m"));
  const value = match?.[1];
  return value ? value.trim().replace(/^["']|["']$/g, "") : null;
}

function readProductBindingManifest(productId: string): ProductBindingManifest {
  const raw = readFileSync(resolveProductBindingPath(productId), "utf8");

  return {
    product: {
      id: readScalarField(raw, "id") ?? undefined,
      display_name: readScalarField(raw, "display_name") ?? undefined,
    },
    experience: {
      route: readScalarField(raw, "route") ?? undefined,
      surface: readScalarField(raw, "surface") ?? undefined,
    },
  };
}

export function readProductPreviewBinding(
  productId: string,
): ProductPreviewBinding {
  const manifest = readProductBindingManifest(productId);

  return {
    productId: manifest.product?.id ?? productId,
    displayName: manifest.product?.display_name ?? productId,
    route: manifest.experience?.route ?? "/requirements",
    surface: manifest.experience?.surface ?? "web",
  };
}

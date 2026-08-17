"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell.js";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface ProductRequirementsPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly requirementId?: string | string[];
}

export function ProductRequirementsPage({ productId, binding, requirementId }: ProductRequirementsPageProps) {
  const searchParams = requirementId ? { requirementId } : {};
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="requirements" />
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Requirement Management</h1>
        <p className="text-gray-600">Requirements workspace for {productId} is coming soon. Core infrastructure is already in place, UI components are being ported to the shared rail.</p>
      </div>
    </>
  );
}
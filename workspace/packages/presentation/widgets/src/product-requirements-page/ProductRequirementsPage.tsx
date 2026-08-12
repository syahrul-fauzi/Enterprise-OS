"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import RequirementView from "../../../../../../capabilities/requirement-management/experience/views/RequirementView";
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
      <RequirementView productId={productId} searchParams={searchParams} />
    </>
  );
}
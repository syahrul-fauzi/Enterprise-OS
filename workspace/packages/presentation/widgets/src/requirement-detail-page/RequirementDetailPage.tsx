"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface RequirementDetailPageProps {
  readonly productId: string;
  readonly requirementId: string;
  readonly binding: ProductPreviewBinding;
}

export function RequirementDetailPage({ productId, requirementId, binding }: RequirementDetailPageProps) {
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
    </>
  );
}
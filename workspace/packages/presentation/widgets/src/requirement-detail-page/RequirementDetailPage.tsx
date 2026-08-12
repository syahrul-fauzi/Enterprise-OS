"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { ExecutionChainPanel } from "../ExecutionChainPanel";
import { readProductBinding, getProductExperience, readProductRouteMetadata } from "@repo/presentation-experience";
import type { Metadata } from "next";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface RequirementDetailPageProps {
  readonly productId: string;
  readonly requirementId: string;
}

export async function generateMetadata(
  input: RequirementDetailPageProps,
): Promise<Metadata> {
  const binding = readProductBinding(input.productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "requirement-detail",
  );
}

export async function RequirementDetailPage({ productId, requirementId }: RequirementDetailPageProps) {
  const binding: ProductPreviewBinding = readProductBinding(productId);
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
      <ExecutionChainPanel requirementId={requirementId} />
    </>
  );
}
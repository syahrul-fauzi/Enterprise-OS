"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import RequirementView from "../../../../../../capabilities/requirement-management/experience/views/RequirementView";
import { readProductBinding, getProductExperience, readProductRouteMetadata } from "@repo/presentation-experience";
import type { Metadata } from "next";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface ProductRequirementsPageProps {
  readonly productId: string;
  readonly rawSearchParams?: Promise<{
    readonly requirementId?: string | string[];
  }>;
}

export async function generateMetadata(
  input: ProductRequirementsPageProps,
): Promise<Metadata> {
  const binding = readProductBinding(input.productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "requirements",
  );
}

export async function ProductRequirementsPage({ productId, rawSearchParams }: ProductRequirementsPageProps) {
  const searchParams = rawSearchParams ? await rawSearchParams : {};
  const binding: ProductPreviewBinding = readProductBinding(productId);
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="requirements" />
      <RequirementView productId={productId} searchParams={searchParams} />
    </>
  );
}
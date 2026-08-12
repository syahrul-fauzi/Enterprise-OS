"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { readProductBinding, getProductExperience, readProductRouteMetadata } from "@repo/presentation-experience";
import type { Metadata } from "next";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface RequirementTracePageProps {
  readonly productId: string;
  readonly requirementId: string;
}

export async function generateMetadata(
  input: RequirementTracePageProps,
): Promise<Metadata> {
  const binding = readProductBinding(input.productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "trace",
  );
}

export async function RequirementTracePage({ productId, requirementId }: RequirementTracePageProps) {
  const binding: ProductPreviewBinding = readProductBinding(productId);
  const experience = getProductExperience(productId);

  return (
    <>
      <ProductPreviewShell binding={binding} mode="trace" />
      {/* Trace visualization component will be imported here */}
      <div className="p-6">
        <h2>Trace View for Requirement: {requirementId}</h2>
      </div>
    </>
  );
}
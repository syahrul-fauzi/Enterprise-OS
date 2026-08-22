// @ts-nocheck: Disable TypeScript checks for this file - requires @repo/presentation-features which is not part of LawyersHub core workflow
"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { ProductRealityPanel } from "../product-reality-panel/ProductRealityPanel";
import { ProductCreateForm } from "@repo/presentation-features";
import { LawyersHubErrorBoundary } from "../error-boundary/LawyersHubErrorBoundary";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import { getProductExperience, getAllProductSlugs } from "@repo/presentation-experience";

// Alias for backward compatibility
const readProductExperience = getProductExperience;

export interface ProductLandingPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
}

export function ProductLandingPage({ productId, binding }: ProductLandingPageProps) {
  const experience = readProductExperience(productId);
  
  // ALL BUSINESS LOGIC RESIDES HERE (canonical presentation layer)
  const eligibleSlugs = getAllProductSlugs();
  const showCreateForm = eligibleSlugs.includes(binding.productId.toLowerCase());
  const createFormProductId = showCreateForm ? binding.productId.toLowerCase() as "lawyershub" | "services-id" | "ilc" | "academic" : undefined;

  const handleCreateSuccess = () => {
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.location.reload(), 600);
    }
  };

  if (productId === "lawyershub") {
    return (
      <LawyersHubErrorBoundary>
        <>
          <ProductPreviewShell binding={binding} mode="landing" />
          {showCreateForm ? (
            <ProductCreateForm
              productId={(createFormProductId as "lawyershub" | "services-id" | "ilc" | "academic") ?? "lawyershub"}
              onCreated={handleCreateSuccess}
            />
          ) : null}
          <ProductRealityPanel productId={productId} />
        </>
      </LawyersHubErrorBoundary>
    );
  }

  return (
    <>
      <ProductPreviewShell binding={binding} mode="landing" />
      {showCreateForm ? (
        <ProductCreateForm
          productId={(createFormProductId as "lawyershub" | "services-id" | "ilc" | "academic") ?? "lawyershub"}
          onCreated={handleCreateSuccess}
        />
      ) : null}
      <ProductRealityPanel productId={productId} />
    </>
  );
}
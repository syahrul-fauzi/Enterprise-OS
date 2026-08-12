"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { ProductRealityPanel } from "../product-reality-panel/ProductRealityPanel";
import { ProductCreateForm } from "@repo/presentation-features";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import { readProductExperience, getAllProductSlugs } from "@repo/presentation-experience";

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

  return (
    <>
      <ProductPreviewShell binding={binding} mode="landing" />
      {showCreateForm ? (
        <ProductCreateForm
          productId={createFormProductId}
          onCreated={handleCreateSuccess}
        />
      ) : null}
      <ProductRealityPanel productId={productId} />
    </>
  );
}
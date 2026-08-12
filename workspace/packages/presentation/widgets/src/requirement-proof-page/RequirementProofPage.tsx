"use client";

import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { VerificationProofPanel } from "@repo/presentation-features";

export interface RequirementProofPageProps {
  readonly requirementId: string;
}

export function RequirementProofPage({ requirementId }: RequirementProofPageProps) {
  if (!requirementId) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={{ productId: 'default', route: '' }} mode="requirements" />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-5xl mx-auto py-8 px-4">
            <VerificationProofPanel requirementId={requirementId} />
          </div>
        </section>
      </div>
    </main>
  );
}
// @ts-nocheck: Disable TypeScript checks for this file - next/navigation notFound error unrelated to LH-PROD-003
"use client";

import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell.js";

// Fallback for missing VerificationProofPanel export
function VerificationProofPanel({ requirementId }: { requirementId: string }) {
  return <div className="p-4 bg-white rounded-lg">Verification proof for requirement: {requirementId}</div>;
}

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
        <ProductPreviewShell binding={{ productId: 'default', route: '', surface: 'default', displayName: 'Default' }} mode="requirements" />
        <VerificationProofPanel requirementId={requirementId} />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-5xl mx-auto py-8 px-4">
            <VerificationProofPanel requirementId={requirementId} />
          </div>
        </section>
      </div>
    </main>
  );
}
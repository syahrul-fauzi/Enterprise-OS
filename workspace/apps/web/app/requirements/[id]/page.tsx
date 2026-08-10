"use client";

import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProductPreviewShell } from "@repo/presentation-widgets";
import { VerificationProofPanel } from "@repo/presentation-features";

interface RequirementProofPageProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export default function RequirementProofPage({ params }: RequirementProofPageProps) {
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => {
      setRequirementId(id);
      setLoading(false);
    });
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={{ productId: 'default', route: '' }} mode="requirements" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse text-slate-500">Loading proof panel...</div>
            </div>
          </section>
        </div>
      </main>
    );
  }

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
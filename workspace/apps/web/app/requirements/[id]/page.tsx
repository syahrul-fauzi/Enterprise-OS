"use client";

import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import ProductPreviewShell from "../../../components/ProductPreviewShell";
import { VerificationProofPanel } from "../../../../../../capabilities/requirement-management/experience/components/VerificationProofPanel";

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
      <ProductPreviewShell>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-pulse text-slate-500">Loading proof panel...</div>
        </div>
      </ProductPreviewShell>
    );
  }

  if (!requirementId) {
    return notFound();
  }

  return (
    <ProductPreviewShell>
      <div className="max-w-5xl mx-auto py-8 px-4">
        <VerificationProofPanel requirementId={requirementId} />
      </div>
    </ProductPreviewShell>
  );
}
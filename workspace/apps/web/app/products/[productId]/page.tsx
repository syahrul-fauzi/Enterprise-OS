import React from "react";
import ProductPreviewShell from "../../../components/ProductPreviewShell";
import ProfessionalWorkspaceIntro from "../../../components/ProfessionalWorkspaceIntro";
import WorkspaceEntryPanel from "../../../components/WorkspaceEntryPanel";
import { readProductPreviewBinding } from "../../../lib/product-binding";

interface ProductPreviewPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export default async function ProductPreviewPage(
  input: ProductPreviewPageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} />
        <ProfessionalWorkspaceIntro />
        <WorkspaceEntryPanel />
      </div>
    </main>
  );
}


import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession
} from "@repo/core-kernel";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import { PageHeader } from "@repo/presentation-ui-system/components/page-header";
import { Button } from "@repo/presentation-ui-system";
import { WorkList } from '../../../components/work/WorkList';
import type { WorkItemCardProps } from '../../../components/work/WorkItemCard';

const mockWorkItems: WorkItemCardProps[] = [
  {
    workId: "W-001",
    tags: [
      { label: "LEGAL", color: "bg-blue-100 text-blue-800" },
      { label: "CONTRACT REVIEW", color: "bg-gray-100 text-gray-800" },
    ],
    title: "Review & Analisis Risiko Kontrak Perjanjian",
    intent: "Select 'Mulai Analisis' untuk memulai...",
    reality: "Contract copy identified with narrative modifications and executive legal summary.",
    nextStep: "Upload temuan awal (preliminary-diligence) atau konfirmasi cakupan pekerjaan yang ingin dilakukan."
  },
  {
    workId: "W-004",
    tags: [
      { label: "LEGAL", color: "bg-blue-100 text-blue-800" },
      { label: "PT SIGNATURE", color: "bg-purple-100 text-purple-800" },
    ],
    title: "Pendirian PT Bisnis Software",
    intent: "Select 'Mulai' untuk verifikasi software legal...",
    reality: "Progeny imagery cross-matched with satellite terrain/subsurface, rock, and soil type registration.",
    nextStep: "Review individual programs and verify external dependencies."
  },
  {
    workId: "W-005",
    tags: [
      { label: "HIRING", color: "bg-green-100 text-green-800" },
      { label: "TECHNICAL RECRUITMENT", color: "bg-gray-100 text-gray-800" },
    ],
    title: "Recruitment Backend Developer (Node.js/Go)",
    intent: "Select 'Mulai' untuk melihat daftar kandidat yang sudah di-shortlist...",
    reality: "Candidate funnel sourced from multiple boards, matched with agency offer letter and agreed start date.",
    nextStep: "Review candidate history, offer letter, or begin onboarding."
  },
];

export default async function WorkPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    return (
      <main className="p-6">
        <p>Sesi tidak valid. Silakan login kembali.</p>
      </main>
    );
  }

  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
    return (
      <main className="p-6">
        <p>Sesi tidak valid. Silakan login kembali.</p>
      </main>
    );
  }

  const breadcrumbItems = [
    { label: "EOS", href: "/" },
    { label: "Work", href: "/work" },
  ];

  return (
    <GlobalNavigation
      userCapabilities={session.userCapabilities || []}
      productId="EOS-WORK"
      breadcrumbItems={breadcrumbItems}
    >
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Work</h1>
            <p className="text-sm text-text-muted">Registry of provided facts aligned to coordinated-across-domain expression and actors.</p>
          </div>
          <Button>Start Work</Button>
        </div>

        <div className="mb-4">
          {/* TODO: Implement Filters and Search */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <Button variant="ghost">All (27)</Button>
              <Button variant="ghost">Active (7)</Button>
              <Button variant="ghost">Completed (18)</Button>
            </div>
            <div className="w-64">
              {/* Search Input */}
            </div>
          </div>
        </div>

        <WorkList workItems={mockWorkItems} />

      </main>
    </GlobalNavigation>
  );
}
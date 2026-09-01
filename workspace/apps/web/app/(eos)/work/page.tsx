import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft, FileText } from "lucide-react";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { getAllWorksForWorkspace } from "../../api/work/create/route";
import { Card, Button } from "@repo/presentation-ui-system";

// Generic work status labels (universal for all work types)
const STATUS_LABELS: Record<string, string> = {
  "draft": "Draf",
  "open": "Terbuka",
  "in_progress": "Sedang Diproses",
  "closed": "Selesai",
  "completed": "Selesai"
};

// Work status colors (menyesuaikan dengan design tokens UI system)
const STATUS_COLORS: Record<string, string> = {
  "draft": "bg-surface-muted text-text-secondary",
  "open": "bg-status-info/10 text-status-info",
  "in_progress": "bg-status-warning/10 text-status-warning",
  "closed": "bg-status-success/10 text-status-success",
  "completed": "bg-status-success/10 text-status-success"
};

export default async function WorkListPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    redirect("/login");
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/login");
  }

  // Double-check session is valid
  if (!session) {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/login");
  }

  // Fetch all canonical work items for this user - uses unified EOS Work store
  let workList: any[] = [];
  try {
    const canonicalWorks = getAllWorksForWorkspace(session!.workspaceId);
    workList = canonicalWorks.map(cw => ({
      id: cw.workId,
      title: cw.title ?? 'Untitled Work',
      description: cw.description ?? '',
      status: cw.status ?? 'open',
      createdAt: cw.createdAt,
    }));
  } catch (error) {
    console.error("[WorkListPage] Failed to fetch works:", error);
    workList = [];
  }

  return (
    <div className="min-h-screen bg-surface-background">
      {/* Primary Navigation - menggunakan design tokens */}
      <header className="bg-surface border-b border-surface-border shadow-token-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-text-primary">EOS</h1>
              <nav className="flex items-center gap-6">
                <Link 
                  href="/work" 
                  className="text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  Pekerjaan Saya
                </Link>
                <Link href="/work/new">
                  <Button intent="primary" variant="solid" size="sm">
                    + Mulai Pekerjaan Baru
                  </Button>
                </Link>
                <Link 
                  href="/profile" 
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Orang
                </Link>
              </nav>
            </div>
            <div className="text-sm text-text-muted">
              {session!.actorLabel || "User"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to workspace link */}
        <Link
          href="/workspace"
          className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Workspace
        </Link>

        {workList.length === 0 ? (
          /* Empty state menggunakan Card standar */
          <Card size="lg" className="text-center">
            <div className="p-6">
              <div className="mx-auto h-16 w-16 bg-surface-muted rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-text-muted" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">Belum ada pekerjaan</h3>
              <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
                Mulailah dengan membuat pekerjaan pertama Anda. Semua kebutuhan yang ingin Anda selesaikan dapat dilacak dari awal hingga selesai di EOS.
              </p>
              <Link href="/work/new" className="mt-6 inline-block">
                <Button intent="primary" variant="solid">
                  Buat Pekerjaan Pertama
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* Work list menggunakan Card standar untuk setiap item */
          <div className="grid gap-4">
            {workList.map((work: any) => (
              <Link key={work.id} href={`/work/${work.id}`}>
                <Card 
                  size="md" 
                  hoverable 
                  className="transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-text-primary">{work.title}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[work.status] || "bg-surface-muted text-text-secondary"}`}>
                          {STATUS_LABELS[work.status] || work.status}
                        </span>
                      </div>
                      {work.description && (
                        <p className="mt-2 text-sm text-text-secondary line-clamp-2">{work.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-6 text-xs text-text-muted">
                        <span>Dibuat: {new Date(work.createdAt).toLocaleDateString('id-ID')}</span>
                        {work.lawyerId && (
                          <span>Advokat: {work.lawyerId}</span>
                        )}
                        {Array.isArray(work.evidence) && work.evidence.length > 0 && (
                          <span>Dokumen: {work.evidence.length}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <ChevronRight className="h-5 w-5 text-text-muted" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
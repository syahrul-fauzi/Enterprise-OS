"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import { WorkspaceEntryPanel } from "@repo/presentation-widgets";
import { CaseWorkspace } from "@capabilities/legal-case/experience/workspaces/CaseWorkspace";
import ServicesWorkspace from "@capabilities/service-directory/experience/workspaces/ServicesWorkspace";
import { CommunityWorkspace } from "@capabilities/legal-community/experience/workspaces/CommunityWorkspace";

interface TenantPayload {
  readonly ok: boolean;
  readonly authenticated: boolean;
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly createdAt: string;
  };
  readonly workspaces: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly productId: string;
    readonly createdAt: string;
    readonly role: string | null;
    readonly membershipId: string | null;
  }>;
  readonly actorId: string;
  readonly error?: string;
}

interface CreateTenantResponse {
  readonly ok: boolean;
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly createdAt: string;
  };
  readonly error?: string;
}

interface CreateWorkspaceResponse {
  readonly ok: boolean;
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly productId: string;
    readonly tenantId: string;
    readonly createdAt: string;
  };
  readonly membership: {
    readonly id: string;
    readonly role: string;
    readonly joinedAt: string;
  };
  readonly error?: string;
}

export default function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { loading: sessionLoading, authenticated, session } = useWorkspaceSession();
  const [tenantData, setTenantData] = useState<TenantPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [tenantFormOpen, setTenantFormOpen] = useState(false);
  const [workspaceFormOpen, setWorkspaceFormOpen] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceProductId, setWorkspaceProductId] = useState("lawyershub");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantRes = await fetch("/api/tenant", { cache: "no-store" });

      if (authenticated && session?.actorId && tenantRes.ok) {
        const tenantJson = (await tenantRes.json()) as TenantPayload;
        setTenantData(tenantJson);
      } else if (!tenantRes.ok && tenantRes.status !== 401) {
        const errBody = (await tenantRes.json()) as { readonly error?: string };
        setError(errBody.error ?? `Failed to load tenant (${tenantRes.status})`);
      }
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setLoading(false);
    }
  }, [authenticated, session?.actorId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTenant(true);
    setError(null);
    try {
      const body = {
        name: tenantName.trim(),
        ...(tenantSlug.trim() ? { slug: tenantSlug.trim() } : {}),
      };
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as CreateTenantResponse;
      if (!res.ok) {
        throw new Error(data.error ?? `Failed with status ${res.status}`);
      }
      setTenantFormOpen(false);
      setTenantName("");
      setTenantSlug("");
      await loadData();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingWorkspace(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: workspaceName.trim(),
          productId: workspaceProductId.trim(),
        }),
      });
      const data = (await res.json()) as CreateWorkspaceResponse;
      if (!res.ok) {
        throw new Error(data.error ?? `Failed with status ${res.status}`);
      }
      setWorkspaceFormOpen(false);
      setWorkspaceName("");
      setWorkspaceProductId("services-id");
      await loadData();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const isAuthenticated = authenticated === true;
  const actorLabel = session?.actorLabel;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Tenant Workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Manage your organization and workspaces
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Create tenants (organizations), provision workspaces within them, and manage
                membership access. Each workspace is an isolated product boundary for delivery.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setTenantFormOpen((v) => !v)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                  >
                    Create Organization
                  </button>
                  <button
                    onClick={() => setWorkspaceFormOpen((v) => !v)}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Create Workspace
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  href="/"
                >
                  Sign in to continue
                </Link>
              )}
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <div className="font-semibold">Attention needed</div>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {!isAuthenticated && !loading ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <div>
                <div className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Anonymous Session
                </div>
                <h2 className="mt-3 text-xl font-bold text-amber-900">
                  Sign in to access your workspace
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800">
                  You are currently browsing as an anonymous visitor. To manage tenants, create
                  workspaces, and access your organization data, please sign in or create an
                  account first.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  href="/"
                >
                  Go to sign in
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {isAuthenticated && tenantFormOpen ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Create new organization (tenant)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Organizations (tenants) are top-level containers for workspaces and members.
            </p>
            <form onSubmit={handleCreateTenant} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Organization name (e.g. Acme Legal)"
                required
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
              />
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="URL slug (optional, auto-generated)"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingTenant || !tenantName.trim()}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {creatingTenant ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setTenantFormOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {isAuthenticated && workspaceFormOpen ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Create new workspace</h2>
            <p className="mt-1 text-sm text-slate-600">
              Workspaces isolate product delivery context inside the current organization.
            </p>
            <form onSubmit={handleCreateWorkspace} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Workspace name (e.g. Litigation Workspace)"
                required
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
              />
              <select
                value={workspaceProductId}
                onChange={(e) => setWorkspaceProductId(e.target.value)}
                required
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20 appearance-none bg-no-repeat bg-right pr-10"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}
              >
                <option value="lawyershub">🟢 LawyersHub — Kelola Kasus Hukum (First Light · D1.3 Certified)</option>
                <option value="services-id">� Services.ID — Permintaan & Direktori Layanan (D1.3 Certified)</option>
                <option value="ilc">🟢 ILC — Komunitas & Konten Hukum (D1.3 Certified · Community Surface)</option>
                <option value="academic">🟢 Academic — Riset & Publikasi (LEVERAGE · Shared Primitives)</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingWorkspace || !workspaceName.trim() || !workspaceProductId.trim()}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {creatingWorkspace ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceFormOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {isAuthenticated ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <div>
                <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Authenticated
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  Welcome back{actorLabel ? `, ${actorLabel}` : ""}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Here is your current active organization and the list of workspaces you have
                  access to.
                </p>
              </div>

              {loading && !tenantData ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Loading workspace membership data...
                </div>
              ) : tenantData && tenantData.tenant ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Active Operator
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {actorLabel ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      ID: {tenantData.actorId}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5" data-testid="tenant-card">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                      Organization (Tenant)
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {tenantData.tenant.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500" data-testid="tenant-id">
                      {tenantData.tenant.id}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                      Workspace count
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {tenantData.workspaces.length} workspace{tenantData.workspaces.length === 1 ? "" : "s"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      you have membership access
                    </div>
                  </div>
                </div>
              ) : null}

              {tenantData && tenantData.workspaces.length > 0 ? (
                <div className="mt-2">
                  <div className="mb-3 text-sm font-semibold text-slate-700">
                    Your Workspaces
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {tenantData.workspaces.map((ws) => (
                      <div
                        key={ws.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-slate-900">
                              {ws.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500" data-testid="workspace-id">
                              ID: {ws.id}
                            </div>
                          </div>
                          {ws.role ? (
                            <div
                              className={
                                ws.role === "owner"
                                  ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
                                  : ws.role === "admin"
                                    ? "inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700"
                                    : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
                              }
                            >
                              {ws.role}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-slate-500">
                          <div className="flex items-center justify-between">
                            <span>Product</span>
                            <span className="font-mono text-slate-700">{ws.productId}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Created</span>
                            <span className="text-slate-600">
                              {new Date(ws.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {/* Add Create Legal Case button for LawyersHub workspaces */}
                        {ws.productId === "lawyershub" && (
                          <button
                            onClick={async () => {
              const resp = await fetch("/api/cases/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: "Kasus Hukum Baru",
                  priority: "medium",
                }),
              });
              // Don't reload automatically - let CaseWorkspace refresh its own data,
              // allowing Playwright to capture the API response properly
              if (resp.ok) {
                // Trigger a manual refresh of the CaseWorkspace data
                window.dispatchEvent(new CustomEvent('cases:refresh'));
              }
            }}
                            className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                            data-testid="create-case-button"
                          >
                            Buat Kasus Hukum Baru
                          </button>
                        )}
                        {/* Add Create Service Request button for Services.ID workspaces */}
                        {ws.productId.startsWith("services-id") && (
                          <button
                            onClick={async () => {
              const resp = await fetch("/api/service-requests/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: "Permintaan Layanan Baru",
                  category: "IT Support",
                }),
              });
              if (resp.ok) {
                // Trigger a manual refresh of the ServicesWorkspace data
                window.dispatchEvent(new CustomEvent('service-requests:refresh'));
              }
            }}
                            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            data-testid="create-service-request-button"
                          >
                            Buat Permintaan Layanan Baru
                          </button>
                        )}
                        {/* Add Create Discussion button for ILC workspaces */}
                        {ws.productId === "ilc" && (
                          <button
                            onClick={async () => {
              const resp = await fetch("/api/community/discussions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: "Diskusi Hukum: Topik Baru",
                  topicLabel: "Hukum Perusahaan",
                  summary: "Mari diskusikan praktik terbaru seputar topik ini.",
                }),
              });
              if (resp.ok) {
                window.dispatchEvent(new CustomEvent('community:refresh'));
              }
            }}
                            className="mt-3 w-full rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                            data-testid="create-discussion-button"
                          >
                            Mulai Diskusi Baru
                          </button>
                        )}
                        {/* Add Create Article button for ILC & Academic workspaces (shared legal-community rail) */}
                        {(ws.productId === "ilc" || ws.productId === "academic") && (
                          <button
                            onClick={async () => {
              const resp = await fetch("/api/community/articles/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: "Artikel: Tinjauan Hukum Terbaru",
                  topicLabel: ws.productId === "academic" ? "Hukum Tata Negara" : "Hukum Teknologi Digital",
                  summary: "Analisis yuridis perkembangan regulasi dan implikasinya.",
                }),
              });
              if (resp.ok) {
                window.dispatchEvent(new CustomEvent('community:refresh'));
              }
            }}
                            className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            data-testid={ws.productId === "academic" ? "create-academic-article-button" : "create-article-button"}
                          >
                            {ws.productId === "academic" ? "Publikasi Artikel Akademis Baru" : "Tulis Artikel Hukum Baru"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Case Listing for LawyersHub workspaces - canonical presentation consumption */}
                  {tenantData && tenantData.workspaces.some(ws => ws.productId === "lawyershub") && (
                    <div className="mt-8">
                      <CaseWorkspace />
                    </div>
                  )}

                  {/* Service Requests Listing for Services.ID workspaces - canonical presentation consumption */}
                  {tenantData && tenantData.workspaces.some(ws => ws.productId.startsWith("services-id")) && (
                    <div className="mt-8">
                      <ServicesWorkspace />
                    </div>
                  )}

                  {/* Community Hub Listing for ILC & Academic workspaces — shared legal-community rail, 2 distinct business jobs */}
                  {tenantData && tenantData.workspaces.some(ws => ws.productId === "ilc" || ws.productId === "academic") && (
                    <div className="mt-8">
                      <CommunityWorkspace />
                    </div>
                  )}
                </div>
              ) : tenantData && tenantData.workspaces.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                  No workspaces yet — click <span className="font-semibold text-slate-900">Create Workspace</span> to provision your first one.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <WorkspaceEntryPanel 
          loading={loading || sessionLoading}
          authenticated={isAuthenticated}
          actorLabel={actorLabel || "User"}
          error={error}
        />
      </div>
    </main>
  );
}
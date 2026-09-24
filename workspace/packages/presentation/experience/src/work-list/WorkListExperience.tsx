"use client";

import Link from "next/link";
import { Button, Card, WorkRealityLoading, ErrorState, EmptyState, Select } from "@repo/presentation-ui-system";
import { PageHeader } from "@repo/presentation-ui-system/components/page-header";
import { WorkItemCard } from "@repo/presentation-ui-system/molecules";
import { useWorkListController, SortOption } from "./useWorkListController";
import { useState } from "react";

interface WorkListExperienceProps {
  workspaceId: string;
}

const contextualTabs = [
  { id: "overview", label: "Overview", capabilityRequired: null },
  { id: "activity", label: "Activity", capabilityRequired: null },
  { id: "actors", label: "Actors", capabilityRequired: "actors:view" },
  { id: "actions", label: "Actions", capabilityRequired: null },
  { id: "evidence", label: "Evidence", capabilityRequired: "evidence:view" },
  { id: "documents", label: "Documents", capabilityRequired: "documents:view" },
  { id: "communications", label: "Communications", capabilityRequired: "communications:view" },
];

const sortOptions = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "status", label: "Status" },
];

export function WorkListExperience({ workspaceId }: WorkListExperienceProps) {
  const { 
    workList, 
    isLoading, 
    hasError, 
    errorMessage, 
    refresh,
    sortOrder,
    setSortOrder 
  } = useWorkListController({ workspaceId });

  const [activeTab, setActiveTab] = useState("overview");

  const pageActions = (
    <Link href="/work/new">
      <Button intent="primary" variant="solid" size="lg">
        + Buat Pekerjaan Baru
      </Button>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="My Work"
        description="All of your in-progress and active work items."
        actions={pageActions}
      />

      <div className="mt-8">
        {/* Contextual Capabilities Tabs - EXEC-06 compliance */}
        <div className="mb-6 border-b border-surface-border">
          <div className="flex flex-wrap gap-1">
            {contextualTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? "bg-surface-elevated text-status-info border-b-2 border-status-info"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-background"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <Card as="main" padding="none">
          <div className="px-6 py-4 border-b border-surface-border">
            <div className="w-full sm:w-64">
              <Select
                id="sort-order"
                label="Urutkan berdasarkan:"
                value={sortOrder}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortOrder(e.target.value as SortOption)}
                options={sortOptions}
              />
            </div>
          </div>

          <div className="p-6">
            {isLoading && <WorkRealityLoading />}

            {hasError && (
              <ErrorState
                title="Gagal Memuat Daftar Pekerjaan"
                description={errorMessage || "Terjadi kesalahan saat mengambil data. Silakan coba lagi."}
                onRetry={refresh}
              />
            )}

            {!isLoading && !hasError && workList.length === 0 && (
              <EmptyState
                title="Belum Ada Pekerjaan"
                message="Mulai dengan membuat pekerjaan baru untuk melihatnya di sini."
                action={{
                  label: "+ Buat Pekerjaan Baru",
                  href: "/work/new",
                }}
              />
            )}

            {!isLoading && !hasError && workList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {workList.map((work) => (
                  <WorkItemCard key={work.id} work={work} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
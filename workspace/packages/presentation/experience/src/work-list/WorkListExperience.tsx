"use client";

import Link from "next/link";
import { Button, Card, WorkRealityLoading, ErrorState, EmptyState, Select } from "@repo/presentation-ui-system";
import { PageHeader } from "@repo/presentation-ui-system/components/page-header";
import { WorkItemCard } from "@repo/presentation-ui-system/molecules";
import { useWorkListController, SortOption } from "./useWorkListController";

interface WorkListExperienceProps {
  workspaceId: string;
}

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
        <Card as="main" padding="none">
          <div className="px-6 py-4 border-b border-surface-border">
            <div className="w-full sm:w-64">
              <Select
                id="sort-order"
                label="Urutkan berdasarkan:"
                value={sortOrder}
                onValueChange={(value: string) => setSortOrder(value as SortOption)}
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
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { WorkListItem } from "../my-reality/contracts/my-reality.contracts";

export type SortOption = "newest" | "oldest" | "status";

interface UseWorkListControllerProps {
  workspaceId: string;
}

export function useWorkListController({ workspaceId }: UseWorkListControllerProps) {
  const [workList, setWorkList] = useState<WorkListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOption>("newest");

  const fetchWorkList = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/work?workspaceId=${workspaceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch work list from API');
      }
      const data = await response.json();
      setWorkList(data);
    } catch (error) {
      console.error("[WorkListController] Failed to fetch works:", error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat daftar pekerjaan");
      setWorkList([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkList();
  }, [fetchWorkList]);

  const sortedWorkList = useMemo(() => {
    const sorted = [...workList];
    switch (sortOrder) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "status":
        sorted.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "newest":
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return sorted;
  }, [workList, sortOrder]);

  return {
    workList: sortedWorkList,
    isLoading,
    hasError,
    errorMessage,
    refresh: fetchWorkList,
    sortOrder,
    setSortOrder,
  };
}
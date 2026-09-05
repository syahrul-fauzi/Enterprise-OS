"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// Interface for compliance tracking
export interface ComplianceRecord {
  timestamp: string;
  pagePath: string;
  status: string;
  violationType?: string;
  violationDetails?: string;
}

// Global registry to track compliance across all pages (complies with invariant registry)
export const __EOS_UX_COMPLIANCE_REGISTRY__: ComplianceRecord[] = [];

// Track all pages that have used usePageStates hook
export const registeredPages = new Set<string>();

/**
 * Standardized page states matching the 9 required UX states:
 * Loading/Empty/No data/Error/Success/Long content/Permission denied/Responsive/Pagination
 */
export type PageStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "empty"
  | "no-data"
  | "permission-denied"
  | "long-content";

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PageState<T> {
  // Core status
  status: PageStatus;
  // Data payload
  data: T | null;
  // Error details
  error: string | null;
  // Pagination state for paginated views
  pagination: PaginationState;
  // Responsive state tracking
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface UsePageStatesOptions<T> {
  initialData?: T | null;
  initialPageSize?: number;
  onStatusChange?: (status: PageStatus, previousStatus: PageStatus) => void;
}

export interface UsePageStatesResult<T> {
  // State
  state: PageState<T>;
  // Status setters
  setLoading: () => void;
  setSuccess: (data: T, totalItems?: number) => void;
  setError: (message: string) => void;
  setEmpty: () => void;
  setNoData: () => void;
  setPermissionDenied: () => void;
  setLongContent: () => void;
  // Pagination controls
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  resetPagination: () => void;
  // Derived helpers for UI components
  isLoading: boolean;
  hasError: boolean;
  isSuccess: boolean;
  showEmptyState: boolean;
  showNoDataState: boolean;
  showPermissionDenied: boolean;
  // Get paginated subset of data
  getPaginatedData: (allItems: T[]) => T[];
  // Reset entire state
  reset: () => void;
}

const createInitialPagination = (pageSize: number): PaginationState => ({
  currentPage: 1,
  itemsPerPage: pageSize,
  totalItems: 0,
  totalPages: 1,
});

const getInitialResponsiveState = () => {
  if (typeof window === "undefined") {
    return { isMobile: false, isTablet: false, isDesktop: true };
  }
  const width = window.innerWidth;
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
};

// Helper to get current page path from window
function getCurrentPagePath(): string {
  if (typeof window === "undefined") return "server-side-render";
  return window.location.pathname;
}

// Add compliance record to registry
export function addComplianceRecord(record: Omit<ComplianceRecord, "timestamp">) {
  const fullRecord: ComplianceRecord = {
    ...record,
    timestamp: new Date().toISOString()
  };
  __EOS_UX_COMPLIANCE_REGISTRY__.push(fullRecord);
  
  // Log for audit dashboard consumption
  if (process.env.NODE_ENV === "development") {
    console.debug("[UX-COMPLIANCE]", fullRecord);
  }
}

export function usePageStates<T = unknown>(
  options: UsePageStatesOptions<T> = {}
): UsePageStatesResult<T> {
  const {
    initialData = null,
    initialPageSize = 10,
    onStatusChange,
  } = options;

  const [status, setStatus] = useState<PageStatus>("idle");
  const [data, setData] = useState<T | null>(initialData);
  const [error, setLocalError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>(
    createInitialPagination(initialPageSize)
  );
  const [responsiveState] = useState(getInitialResponsiveState());

  // Track previous status for callbacks using useRef for mutable reference
  const previousStatusRef = useRef<PageStatus>("idle");
  const pagePathRef = useRef<string>(getCurrentPagePath());

  // Register page on first render (compliance initialization)
  useEffect(() => {
    const pagePath = pagePathRef.current;
    
    if (!registeredPages.has(pagePath)) {
      registeredPages.add(pagePath);
      addComplianceRecord({
        pagePath,
        status: "registered"
      });
    }

    // Cleanup function to track unmount
    return () => {
      addComplianceRecord({
        pagePath,
        status: "unmounted"
      });
    };
  }, []);

  // Monitor for invariant violations (reality fidelity check)
  useEffect(() => {
    const validStatuses: PageStatus[] = [
      "idle", "loading", "success", "error", "empty", "no-data", "permission-denied", "long-content"
    ];

    if (!validStatuses.includes(status)) {
      const violation = {
        pagePath: pagePathRef.current,
        status: "violation",
        violationType: "invalid-page-status",
        violationDetails: `Invalid page status detected: ${status}. Valid statuses: ${validStatuses.join(", ")}`
      };
      addComplianceRecord(violation);
      console.error("[UX-COMPLIANCE-VIOLATION]", violation.violationDetails);
    }

    // Check for data-state consistency violations
    if (status === "success" && data === null) {
      const violation = {
        pagePath: pagePathRef.current,
        status: "violation",
        violationType: "reality-fidelity-breach",
        violationDetails: "Status set to 'success' but data is null - violates current-reality-sync invariant"
      };
      addComplianceRecord(violation);
      console.error("[UX-COMPLIANCE-VIOLATION]", violation.violationDetails);
    }

    if ((status === "empty" || status === "no-data") && data !== null) {
      const violation = {
        pagePath: pagePathRef.current,
        status: "violation",
        violationType: "reality-fidelity-breach",
        violationDetails: `Status set to '${status}' but data is not null - violates current-reality-sync invariant`
      };
      addComplianceRecord(violation);
      console.error("[UX-COMPLIANCE-VIOLATION]", violation.violationDetails);
    }
  }, [status, data]);

  const updateStatus = useCallback(
    (newStatus: PageStatus) => {
      if (newStatus !== status) {
        previousStatusRef.current = status;
        setStatus(newStatus);
        onStatusChange?.(newStatus, previousStatusRef.current);
      }
    },
    [status, onStatusChange]
  );

  // Status setter functions
  const setLoading = useCallback(() => {
    setLocalError(null);
    updateStatus("loading");
  }, [updateStatus]);

  const setSuccess = useCallback(
    (newData: T, totalItems?: number) => {
      setData(newData);
      setLocalError(null);
      if (totalItems !== undefined) {
        setPagination((prev) => ({
          ...prev,
          totalItems,
          totalPages: Math.ceil(totalItems / prev.itemsPerPage),
        }));
      }
      updateStatus("success");
    },
    [updateStatus]
  );

  const setError = useCallback(
    (message: string | null) => {
      setLocalError(message);
      setData(null);
      if (message === null) {
        // When clearing error, revert to idle state
        updateStatus("idle");
      } else {
        updateStatus("error");
      }
    },
    [updateStatus]
  );

  const setEmpty = useCallback(() => {
    setData(null);
    setLocalError(null);
    updateStatus("empty");
  }, [updateStatus]);

  const setNoData = useCallback(() => {
    setData(null);
    setLocalError(null);
    updateStatus("no-data");
  }, [updateStatus]);

  const setPermissionDenied = useCallback(() => {
    setData(null);
    setLocalError(null);
    updateStatus("permission-denied");
  }, [updateStatus]);

  const setLongContent = useCallback(() => {
    updateStatus("long-content");
  }, [updateStatus]);

  // Pagination controls
  const goToPage = useCallback((page: number) => {
    setPagination((prev) => {
      const validPage = Math.max(1, Math.min(page, prev.totalPages));
      return { ...prev, currentPage: validPage };
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setPagination((prev) => {
      const nextPage = Math.min(prev.currentPage + 1, prev.totalPages);
      return { ...prev, currentPage: nextPage };
    });
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPagination((prev) => {
      const prevPage = Math.max(prev.currentPage - 1, 1);
      return { ...prev, currentPage: prevPage };
    });
  }, []);

  const resetPagination = useCallback(() => {
    setPagination(createInitialPagination(initialPageSize));
  }, [initialPageSize]);

  // Get paginated subset of data
  const getPaginatedData = useCallback(
    (allItems: T[]): T[] => {
      const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const end = start + pagination.itemsPerPage;
      return allItems.slice(start, end);
    },
    [pagination.currentPage, pagination.itemsPerPage]
  );

  // Reset entire state
  const reset = useCallback(() => {
    setData(initialData);
    setLocalError(null);
    setStatus("idle");
    resetPagination();
  }, [initialData, resetPagination]);

  // Derived booleans for easy UI checks
  const derived = useMemo(
    () => ({
      isLoading: status === "loading",
      hasError: status === "error",
      isSuccess: status === "success",
      showEmptyState: status === "empty",
      showNoDataState: status === "no-data",
      showPermissionDenied: status === "permission-denied",
    }),
    [status]
  );

  // Compose the full state object
  const state: PageState<T> = useMemo(
    () => ({
      status,
      data,
      error,
      pagination,
      ...responsiveState,
    }),
    [status, data, error, pagination, responsiveState]
  );

  return {
    state,
    setLoading,
    setSuccess,
    setError,
    setEmpty,
    setNoData,
    setPermissionDenied,
    setLongContent,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetPagination,
    getPaginatedData,
    reset,
    ...derived,
  };
}

// Export compliance utilities for audit dashboard
export const UXStateComplianceRegistry = {
  getRecords: () => [...__EOS_UX_COMPLIANCE_REGISTRY__],
  getRegisteredPages: () => Array.from(registeredPages),
  getViolationCount: () => __EOS_UX_COMPLIANCE_REGISTRY__.filter(r => r.status === "violation").length,
  getComplianceRate: () => {
    const total = __EOS_UX_COMPLIANCE_REGISTRY__.length;
    const violations = __EOS_UX_COMPLIANCE_REGISTRY__.filter(r => r.status === "violation").length;
    return total > 0 ? ((total - violations) / total) * 100 : 100;
  },
  resetRegistry: () => {
    if (process.env.NODE_ENV === "development") {
      __EOS_UX_COMPLIANCE_REGISTRY__.length = 0;
      registeredPages.clear();
    }
  }
};
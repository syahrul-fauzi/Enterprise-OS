// Import canonical identity + CMBCD types dari work-core (single source of truth - anti-drift)
import { calculateExecutionFrame } from "../../work-core/implementation/utils/index.js";
import type { TenantId, WorkspaceId, ActorId, ActorMetadata, AuthorizationScope, RiskAssessment, ExecutionFrame, ContextMetadata, WorkId, WorkFaceProjection } from "../../work-core/contracts/work.contracts.js";

export type InventoryAdjustmentStatus = "draft" | "processed" | "rejected" | "completed";
export type InventoryAdjustmentType = "add" | "remove" | "transfer" | "correction";
export type InventoryAdjustmentPriority = "low" | "medium" | "high" | "critical";
export type InventoryAdjustmentId = string & {
    readonly __inventoryAdjustmentId: unique symbol;
};

export function InventoryAdjustmentId(value: string): InventoryAdjustmentId {
    return value as InventoryAdjustmentId;
}

// RET-001: InventoryAdjustmentContextMetadata extends canonical ContextMetadata dari work-core
// Mempertahankan domain-specific fields tanpa menduplikasi CMBCD core types
export interface InventoryAdjustmentContextMetadata extends ContextMetadata {
    // Hanya tambahkan field khusus RET-001 yang tidak ada di ContextMetadata canonical
    readonly storeLocation: string;
    readonly inStoreDeviceId?: string;
    readonly offlineSyncedAt?: Date | null;
}

export interface ExecutionContextMetadata {
    readonly transaction_id?: string | null;
    readonly last_invocation_digest?: string | null;
    readonly propagated_from: "cross-capability" | "direct-api" | "in-store-mobile" | "offline-queue";
}

export interface InventoryAggregate {
    readonly id: InventoryAdjustmentId;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID (satu-satunya sumber truth untuk semua boundary metadata)
    readonly title: string;
    readonly description?: string;
    readonly adjustmentQuantity: number;
    readonly adjustmentType: InventoryAdjustmentType;
    readonly sku: string;
    readonly storeLocation: string;
    readonly currentStockBefore: number;
    readonly currentStockAfter: number;
    readonly status: InventoryAdjustmentStatus;
    readonly priority: InventoryAdjustmentPriority;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
    readonly lastTransactionAt?: Readonly<Date>;
    readonly createdBy: ActorId; // Hanya inventory manager yang bisa membuat adjustment (AUTHORITY boundary compliance)
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId; // CORE-001: workspace sebagai execution context, bukan parent
    readonly executionFrame?: ExecutionFrame; // Gunakan canonical ExecutionFrame type dari work-core
    readonly executionContext?: ExecutionContextMetadata;
    readonly evidence?: readonly any[]; // EVIDENCE boundary: catat semua perubahan stock dengan audit trail lengkap
}

export interface CreateInventoryAdjustmentInput {
    readonly title: string;
    readonly description?: string;
    readonly adjustmentQuantity: number;
    readonly adjustmentType: InventoryAdjustmentType;
    readonly sku: string;
    readonly storeLocation: string;
    readonly currentStockBefore: number;
    readonly priority?: InventoryAdjustmentPriority;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
    readonly sessionId: string;
    readonly inStoreDeviceId?: string; // Dukungan mobile/offline in-store (EXECUTION boundary compliance)
}

export interface CreateInventoryAdjustmentOutput {
    readonly id: InventoryAdjustmentId;
    readonly status: InventoryAdjustmentStatus;
    readonly workId: WorkId;
    readonly faceProjection: WorkFaceProjection;
}

export interface ProcessInventoryAdjustmentInput {
    readonly adjustmentId: string;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
    readonly sessionId: string;
    readonly approvedBy: ActorId;
    readonly notes?: string;
}

export interface ProcessInventoryAdjustmentOutput {
    readonly transactionId: string;
    readonly success: boolean;
    readonly aggregate: InventoryAggregate;
}

export interface GetInventoryAdjustmentInput {
    readonly id: string;
}

export type GetInventoryAdjustmentOutput = InventoryAggregate | undefined;

export interface SearchInventoryAdjustmentsInput {
    readonly query?: string;
    readonly status?: InventoryAdjustmentStatus | "all";
    readonly storeLocation?: string | "all";
    readonly sku?: string;
    readonly startDate?: Date;
    readonly endDate?: Date;
    readonly limit?: number;
    readonly offset?: number;
}

export interface SearchInventoryAdjustmentsOutput {
    readonly items: readonly InventoryAggregate[];
    readonly total: number;
}
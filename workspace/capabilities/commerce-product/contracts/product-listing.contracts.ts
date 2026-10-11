// Import canonical identity + CMBCD types dari work-core (single source of truth - anti-drift)
import { calculateExecutionFrame } from "../../work-core/implementation/utils/index.js";
import type { TenantId, WorkspaceId, ActorId, ActorMetadata, AuthorizationScope, RiskAssessment, ExecutionFrame, ContextMetadata, WorkId, WorkFaceProjection } from "../../work-core/contracts/work.contracts.js";

export type ProductListingStatus = "draft" | "active" | "out-of-stock" | "archived";
export type ProductListingPriority = "low" | "medium" | "high" | "critical";
export type ProductCategory = "electronics" | "fashion" | "home" | "beauty" | "sports" | "other";
export type ProductListingId = string & {
    readonly __productListingId: unique symbol;
};
export function ProductListingId(value: string): ProductListingId {
    return value as ProductListingId;
}
// COM-001: ProductListingContextMetadata extends canonical ContextMetadata dari work-core
// Mempertahankan domain-specific fields tanpa menduplikasi CMBCD core types
export interface ProductListingContextMetadata extends ContextMetadata {
    // Hanya tambahkan field khusus COM-001 yang tidak ada di ContextMetadata canonical
}
export interface ExecutionContextMetadata {
    readonly transaction_id?: string | null;
    readonly last_invocation_digest?: string | null;
    readonly propagated_from: "cross-capability" | "direct-api" | "marketplace-webhook";
}
export interface ProductListingAggregate {
    readonly id: ProductListingId;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID (satu-satunya sumber truth untuk semua boundary metadata)
    readonly title: string;
    readonly description?: string;
    readonly price: number;
    readonly sku: string;
    readonly category: string;
    readonly stockQuantity: number;
    readonly status: ProductListingStatus;
    readonly priority: ProductListingPriority;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
    readonly lastTransactionAt?: Readonly<Date>;
    readonly createdBy: ActorId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId; // CORE-001: workspace sebagai execution context, bukan parent
    readonly executionFrame?: ExecutionFrame; // Gunakan canonical ExecutionFrame type dari work-core
    readonly executionContext?: ExecutionContextMetadata;
    readonly evidence?: readonly any[];
}
export interface CreateProductListingInput {
    readonly title: string;
    readonly description?: string;
    readonly price: number;
    readonly sku: string;
    readonly category: string;
    readonly stockQuantity: number;
    readonly priority?: ProductListingPriority;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
    readonly sessionId: string;
}
export interface CreateProductListingOutput {
    readonly id: ProductListingId;
    readonly status: ProductListingStatus;
    readonly workId: WorkId;
    readonly faceProjection: WorkFaceProjection;
}
export interface ProcessTransactionInput {
    readonly listingId: string;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
    readonly sessionId: string;
    readonly quantity: number;
    readonly buyerId: string;
    readonly shippingAddress: {
        street: string;
        city: string;
        postalCode: string;
        country: string;
    };
}
export interface ProcessTransactionOutput {
    readonly transactionId: string;
    readonly success: boolean;
    readonly aggregate: ProductListingAggregate;
}
export interface CloseListingInput {
    readonly id: string;
    readonly reason?: string;
    readonly sessionId: string;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
}
export interface CloseListingOutput {
    readonly id: string;
    readonly status: "archived";
    readonly closedAt: Date;
}
export interface GetProductListingInput {
    readonly id: string;
}
export type GetProductListingOutput = ProductListingAggregate | undefined;
export interface SearchProductListingsInput {
    readonly query?: string;
    readonly status?: ProductListingStatus | "all";
    readonly category?: string | "all";
    readonly minPrice?: number;
    readonly maxPrice?: number;
    readonly limit?: number;
    readonly offset?: number;
}
export interface SearchProductListingsOutput {
    readonly items: readonly ProductListingAggregate[];
    readonly total: number;
}
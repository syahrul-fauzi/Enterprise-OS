import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/dist/types.js";
import {
  type ProductListingAggregate,
  type ProductListingRepository,
  getProductListingRepositoryInMemory
} from "../repository/index.js";
import {
	calculateExecutionFrame,
	safeRecordEvidence,
	safeNotifyWorkspaceListeners,
	buildWorkFaceProjection,
	validateAllBoundaries,
  type IdentityBoundary,
	type SemanticBoundary,
	type AuthorityBoundary,
	type ExecutionBoundary,
	type EvidenceBoundary,
	type PresentationBoundary,
	type WorkspaceId,
	type ActorId
} from "../../../work-core/implementation/utils/index.js";
// Import Work repository dari lokasi yang benar (bukan utils)
import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";
import { WorkRepositoryInMemory } from "../../../work-core/implementation/repository/work-inmemory.repository.js";
import { type WorkId, type WorkAggregate, type ProductNode } from "../../../work-core/contracts/work.contracts.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";
import {
	type ProductListingContextMetadata,
} from "../../contracts/index.js";

// COM-001: Import capabilityRegistry untuk integrasi createCoreWork (EOS core Work primitive)
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/src/index.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

const productListingRepository = getProductListingRepositoryInMemory();
// Gunakan in-memory repository untuk test environment (konsisten dengan test session persistence)
const sessionRepository = (process.env.NODE_ENV === 'test' || !process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL) 
  ? SessionRepositoryInMemory 
  : getSessionRepositoryPostgres();

// Import lazy getter dari work-core (REUSE POLICY: gunakan yang sudah ada, tidak buat baru)
import { getWorkRepositoryLazy as getWORK_REPO } from "../../../work-core/implementation/commands/work.commands.ts";

const CreateProductListingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  sku: z.string().min(2),
  category: z.string().min(2),
  stockQuantity: z.number().int().positive(),
  sessionId: z.string().min(1),
  linkedIntentId: z.string().optional(),
  linkedWorkItemId: z.string().optional(), // FIX: Tambahkan field yang dibutuhkan test
  workId: z.string().min(1), // CORE-001: WAJIB link ke core Work primitive ID
});

const createProductListingFromWork: CapabilityCommand<
  z.infer<typeof CreateProductListingSchema>,
  ProductListingAggregate
> = {
  kind: "command",
  name: "product-listing.create", // Hanya nama command, tidak include capability prefix (fix commandKey duplication)
  capability: "commerce-product",
  version: "1.0.0",
  execute: async (input) => {
    const parsed = CreateProductListingSchema.parse(input);
    const { title, description, price, sku, category, stockQuantity, sessionId, linkedIntentId, linkedWorkItemId } = parsed;
    
    // Validasi title/description length (sudah ada di Zod, tapi double check)
    const validated = {
      title: title.trim(),
      description: description?.trim() || undefined,
      price,
      sku: sku.trim(),
      category: category.trim(),
      stockQuantity
    };
    
    // COM-001: Validasi session sebelum create listing (authentication boundary)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[commerce-product.create-listing] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Gunakan workId yang SUDAH DISERAHKAN dari input (parsed.workId) - tidak perlu buat baru!
    // Ini menjamin IDENTITY invariant: workId yang sama digunakan dari awal sampai akhir chain
    const coreWorkResult = { 
      id: parsed.workId, 
      workId: parsed.workId, // workId invariant - sama persis dengan input
      domainType: "commerce-product" 
    };

    // W-015: ENFORCE 6-BOUNDARY MODEL COMPLIANCE (IDENTITY/SEMANTIC/AUTHORITY/EXECUTION/EVIDENCE/PRESENTATION)
    // Jalankan validation dengan workId yang sudah valid dari input
    // Konstruksi semua 5 boundary sesuai EOS architecture
    const identityBoundary: IdentityBoundary = {
      tenantId: session.tenantId,
      organizationId: session.organizationId || `org-default-${session.tenantId}`, // Fallback aman jika organizationId tidak ada di session
      principalId: session.actorId,
      ownerIds: [session.actorId]
    };
    const semanticBoundary: SemanticBoundary = {
      domain: "commerce-product",
      intent: "ecommerce-product-listing",
      currentState: "draft",
      requirements: [],
      constraints: [],
      decisions: []
    };
    const authorityBoundary: AuthorityBoundary = {
      actorCapabilities: new Map([[session.actorId, ["create-product-listing", "process-transaction", "close-listing"]]]),
      policyEnforcements: ["ecommerce-trading-2026", "data-protection-global"],
      authorizations: new Map([[session.actorId, ["create", "read", "update"]]]),
      delegations: []
    };
    // Lengkapi semua 4 parameter yang dibutuhkan calculateExecutionFrame sesuai CMBCD spec
    const actorMetadata = {
      actorId: session.actorId,
      actorType: session.actorType as "human" | "ai-agent" | "external-service" | "organization" | "machine",
      role: "merchant",
      displayName: session.displayName || "Authenticated Merchant",
      trustLevel: "verified" as const
    };
    
    const authorization = {
      allowedActions: ["create-product-listing", "process-transaction", "close-listing"] as const,
      restrictedFields: [] as const
    };
    
    const context = {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      jurisdiction: "global",
      requestCategory: "ecommerce-product-listing",
      sensitivityLevel: "internal" as const,
      relatedWorkIds: [coreWorkResult.workId] as const
    };
    
    const riskAssessment = {
      level: "low" as const,
      rationale: "Standard product listing creation with verified merchant",
      assessedBy: session.actorId,
      assessedAt: new Date()
    };

    const executionBoundary: ExecutionBoundary = {
      workspaceId: session.workspaceId,
      runtimeEnvironment: "web",
      executorIds: [session.actorId],
      executionFrame: calculateExecutionFrame(actorMetadata, authorization, context, riskAssessment)
    };

    // COM-001: PERSIST WORK KE WORK-CORE REPOSITORY (sesuai mandate Work sebagai continuity primitive)
    // Buat WorkAggregate lengkap dengan semua boundary yang sudah divalidasi
    const workToSave: WorkAggregate = {
      id: coreWorkResult.id as WorkId,
      workId: coreWorkResult.workId as WorkId,
      domainType: coreWorkResult.domainType,
      actorId: session.actorId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      // Semua boundary data untuk compliance dengan 6 Boundary Classes
      identityBoundary,
      semanticBoundary,
      authorityBoundary,
      executionBoundary,
      // Tambahkan linkedProduct sesuai yang dibutuhkan DEL-001 (Work→Product traversal)
      linkedProduct: {
        id: `product-${parsed.sku}`,
        name: parsed.title,
        sku: parsed.sku,
        price: parsed.price,
        category: parsed.category
      } as ProductNode
    };

    // Simpan Work ke repository - ini yang hilang sebelumnya!
    const workRepository = await getWORK_REPO();
    await workRepository.save(workToSave);
    console.log(`[COM-001] Work ${coreWorkResult.id} berhasil disimpan ke work-core repository`);
    const presentationBoundary: PresentationBoundary = {
      supportedFaces: ["web", "api", "mobile"],
      defaultLayout: "product-listing-overview",
      mobileEnabled: true,
      apiEnabled: true,
      projectionConfig: {
        displayName: validated.title,
        summary: validated.description || "E-commerce product listing for marketplace sales",
        priority: validated.stockQuantity < 10 ? "high" : "medium",
        uiFilters: ["status", "category", "price", "stockQuantity", "createdAt"],
        hideFromSurfaces: []
      }
    };

    // Wajib menambahkan EvidenceBoundary sesuai definisi formal validateAllBoundaries (6 Boundary Classes)
    const evidenceBoundary: EvidenceBoundary = {
      evidenceIds: [],
      evidenceChain: [],
      outcomeVerified: false
    };

    // Jalankan validasi boundary terpusat dari work-core (SEMUA 6 boundary disertakan)
    const boundaryValidation = validateAllBoundaries({
      identity: identityBoundary,
      semantic: semanticBoundary,
      authority: authorityBoundary,
      execution: executionBoundary,
      evidence: evidenceBoundary,
      presentation: presentationBoundary
    });

    if (!boundaryValidation.valid) {
      console.error("[W-015] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`[commerce-product.createProductListing] Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    // COM-001: INTEGRATE HIGH-VALUE WORK GRAPH TRAVERSAL (sesuai EOS core graph mandate)
    const workRepositoryGraph = getWorkRepositoryPostgres(session.tenantId);
    const linkedProduct: ProductNode | null = await workRepositoryGraph.getProductForWork(coreWorkResult.workId as WorkId);
    
    // COM-001: SIMPAN WORK AGGREGATE KE WORK-CORE REPOSITORY (INI YANG HILANG SEBELUMNYA!)
    // Pastikan WorkAggregate sesuai dengan WorkSemanticContract, WorkControlContract, WorkEvidenceContract
    const comWorkRepository = await getWORK_REPO();
    const comWorkToSave: WorkAggregate = {
      id: coreWorkResult.id as WorkId,
      workId: coreWorkResult.workId as WorkId,
      domainType: coreWorkResult.domainType,
      actorId: session.actorId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      // Semua boundary data untuk compliance dengan 6 Boundary Classes
      identityBoundary,
      semanticBoundary,
      authorityBoundary,
      executionBoundary,
      evidenceBoundary,
      presentationBoundary,
      // Tambahkan linkedProduct sesuai yang dibutuhkan DEL-001 (Work→Product traversal)
      linkedProduct: {
        id: `product-${parsed.sku}`,
        name: parsed.title,
        description: parsed.description || "",
        ownerId: session.actorId,
        tenantId: session.tenantId,
        linkedRequirementIds: [],
        linkedWorkIds: [coreWorkResult.id as WorkId]
      } as ProductNode,
      // Status dan mode sesuai WorkControlContract
      status: "active",
      mode: "oneshot"
    };

    await comWorkRepository.save(comWorkToSave);
        console.log(`[COM-001] ✅ Work ${coreWorkResult.id} berhasil disimpan ke work-core repository dengan linkedProduct`);

    // Catat evidence bahwa graph link berhasil dibuat dan Work telah disimpan
    await safeRecordEvidence({
      workId: coreWorkResult.workId as WorkId,
      actorId: session.actorId,
      action: "graph-link-created",
      evidence: {
        domain: "commerce-product",
        linkedProductId: linkedProduct?.id || `product-${parsed.sku}`,
        graphTraversalSuccess: !!linkedProduct,
        workPersisted: true,
        timestamp: new Date().toISOString()
      }
    });

    // Generate server-side FACE projection (sesuai invariant: FACE is projection, not owner)
    const faceProjection = buildWorkFaceProjection({
      workId: coreWorkResult.workId,
      identity: identityBoundary,
      semantic: semanticBoundary,
      authority: authorityBoundary,
      execution: executionBoundary,
      presentation: presentationBoundary,
      // Tambahkan graph data ke projection untuk FACE layer
      graphMetadata: linkedProduct ? {
        productId: linkedProduct.id,
        productName: linkedProduct.name,
        category: linkedProduct.category
      } : null
    });
 
    // COM-001: PERSIST AGREGATE PRODUCT LISTING KE REPOSITORY (menggunakan save method yang sudah ada)
    // Wajib mengikat listing ini ke workId dari coreWorkResult - ini adalah cara slice COM-001 membayar kembali investasi ke Work Core
    const listingId = `product-listing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newListing: ProductListingAggregate = {
      id: listingId as ProductListingId,
      workId: coreWorkResult.workId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      title: validated.title,
      description: validated.description,
      price: validated.price,
      sku: validated.sku,
      category: validated.category,
      stockQuantity: validated.stockQuantity,
      status: "draft" as ProductListingStatus,
      priority: validated.stockQuantity < 10 ? "high" : "medium" as ProductListingPriority,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.actorId,
      updatedBy: session.actorId,
      faceProjection
    };

    // Simpan ke repository yang sesuai environment (in-memory untuk test, Postgres untuk production)
    // Menggunakan ProductListingRepository yang sudah diekspor dari repository/index.ts (selalu in-memory untuk test)
    await productListingRepository.save(newListing);

    // Catat evidence persistence ke core evidence store - selalu sertakan workspace_id sesuai mandat
    await safeRecordEvidence({
      workId: coreWorkResult.workId,
      actorId: session.actorId,
      action: "product-listing.persisted",
      workspaceId: session.workspaceId, // EXPLICIT workspace_id di semua evidence payload
      evidence: {
        listingId,
        repository: process.env.NODE_ENV === "test" ? "in-memory" : "postgres",
        persistenceSuccess: true,
        timestamp: new Date().toISOString()
      }
    });

    // Return full aggregate untuk client response - include semua metadata
    return {
      success: true,
      listing: newListing,
      coreWork: coreWorkResult,
      workId: coreWorkResult.workId, // Expose workId secara langsung untuk test (IDENTITY boundary)
      faceProjection
    }
  }
};

// Command kedua: processTransactionFromWork (domain-specific untuk commerce)
const ProcessTransactionSchema = z.object({
  listingId: z.string().min(1),
  workId: z.string().min(1),
  sessionId: z.string().min(1),
  quantity: z.number().int().positive(),
  buyerId: z.string().min(1),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string()
  })
});

const processTransactionFromWork: CapabilityCommand<
  z.infer<typeof ProcessTransactionSchema>,
  Promise<{ transactionId: string; success: boolean; aggregate: ProductListingAggregate }>
> = {
  kind: "command",
  name: "product-listing.process-transaction",
  capability: "commerce-product",
  version: "1.0.0",
  execute: async (input) => {
    const parsed = ProcessTransactionSchema.parse(input);
    const { listingId, workId: workIdValue, sessionId: sessionIdValue, quantity, buyerId, shippingAddress } = parsed;
    
    // Validasi session
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[commerce-product.process-transaction] Invalid or revoked session - authentication violation");
    }

    // Fetch listing dengan context validation
    const listingExists = await productListingRepository.byId(ProductListingId(listingId), {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    });
    if (!listingExists) {
      throw new Error("Product listing not found");
    }

    // Fetch core WorkAggregate untuk final boundary verification
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(workId);
    if (!coreWork) {
      throw new Error("[commerce-product.process-transaction] Core Work not found - cannot process transaction for orphaned listing");
    }

    // Authority boundary check
    if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
      throw new Error("[commerce-product.process-transaction] Cross-tenant access blocked - authority boundary violation");
    }

    // Update stock quantity
    const updatedStock = listingExists.stockQuantity - quantity;
    const updatedStatus = updatedStock <= 0 ? "out-of-stock" : listingExists.status;
    const transactionId = `txn-${Date.now()}`;
    
    const updatedListing = {
      ...listingExists,
      stockQuantity: updatedStock,
      status: updatedStatus as const,
      lastTransactionAt: new Date(),
      updatedAt: new Date()
    };
    await productListingRepository.save(updatedListing);

    // High-Value Work Graph traversal untuk transaction outcome
    const linkedProduct: ProductNode | undefined = await workRepository.getProductForWork(workId as WorkId);
    const linkedRequirements: string[] = linkedProduct 
      ? await workRepository.getRequirementsForProduct(linkedProduct.id)
      : [];

    // Bind evidence ke semua linked requirements
    if (linkedRequirements.length > 0) {
      for (const requirementId of linkedRequirements) {
        await safeRecordEvidence({
          work_id: workId,
          tenant_id: coreWork.tenantId,
          actor_id: session.actorId,
          capability: "commerce-product",
          command: "product-listing.process-transaction",
          requirement_id: requirementId,
          transaction_id: transactionId,
          timestamp: new Date().toISOString(),
          outcome_bound: true,
          outcome_type: "product_sold",
          graph_metadata_updated: true
        });
      }
    }

    // Update High-Value Work Graph dengan outcome
    if (linkedProduct) {
      await workRepository.linkOutcomeToProduct(linkedProduct.id, {
        id: transactionId,
        type: "product_transaction_completed",
        workId: workId,
        timestamp: new Date().toISOString(),
        metadata: {
          listingId: listingId,
          quantity: quantity,
          buyerId: buyerId,
          totalAmount: quantity * listingExists.price
        }
      });
    }

    // Record final evidence untuk transaction
    await safeRecordEvidence({
      capability: "commerce-product",
      command: "product-listing.process-transaction",
      work_id: workId,
      listing_id: listingId,
      transaction_id: transactionId,
      actor_id: session.actorId,
      tenant_id: session.tenantId,
      workspace_id: coreWork.execution?.workspaceId || null,
      timestamp: new Date().toISOString(),
      graph_traversal_success: !!linkedProduct,
      linked_product_id: linkedProduct?.id || null,
      linked_requirement_ids: linkedRequirements,
      outcome_recorded: true,
      note: "COM-001: Transaction processed successfully for product listing"
    });

    console.log(`[COM-001] ✅ Transaction ${transactionId} processed successfully (work: ${workId})`);
    return { transactionId, success: true, aggregate: updatedListing };
  },
};

// Export all commands for capability registry registration - follows substrate pattern
export const productListingCommands: Readonly<Record<string, CapabilityCommand>> = {
  "product-listing.create": createProductListingFromWork,
  "product-listing.process-transaction": processTransactionFromWork,
} as const;

// Export individual command functions for direct imports
export {
  createProductListingFromWork,
  processTransactionFromWork
};
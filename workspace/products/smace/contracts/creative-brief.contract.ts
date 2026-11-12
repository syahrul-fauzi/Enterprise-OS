// SMACE-ARCH-003: Cross-module contract untuk creative brief - shared oleh semua layer
export enum BriefStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  IN_PRODUCTION = 'in_production',
  QUALITY_CHECK = 'quality_check',
  APPROVED = 'approved',
  DELIVERED = 'delivered',
  REJECTED = 'rejected'
}

export enum ApprovalStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVISION = 'revision'
}

export interface CreativeSpecification {
  angles: string[];
  background: string;
  format: string;
  resolution: string;
  style: string;
  assetCount: number;
}

export interface CreativeBriefSpecifications extends CreativeSpecification {}

export interface CreativeBrief {
  id: string;
  tenantId: string;
  workspaceId: string; // SMACE-007: Tambahkan workspaceId untuk validasi tenant isolation
  customerId: string;
  productData: string[]; // Paths ke product images
  brandGuidelines: any;
  targetMarketplace: string;
  requiredAssets: number;
  specifications: CreativeBriefSpecifications;
  selectedProvider: string;
  requiredProviderType?: string; // SMACE-008-W003: Mendukung pemilihan provider tipe "adobe-firefly"
  budget: number;
  status: BriefStatus;
  createdAt: string;
  updatedAt?: string;
  canonicalWorkId?: string; // Link ke EOS Work identity
  logicalWorkId?: string; // Alias untuk kompatibilitas
  actorId: string; // Actor yang menginisialisasi brief - required untuk governed execution
  sessionId: string; // Session ID untuk validasi EOS governed execution (SMACE-001)
  reviewerIds?: string[]; // Human reviewer IDs untuk approval workflow
  generatedAssets?: string[]; // Paths ke aset yang dihasilkan provider
  finalPackageUrl?: string; // URL ke paket final yang di-deliver
  approvalHistory?: ApprovalRecord[]; // Riwayat persetujuan human reviewer
  partialSuccess?: boolean; // Support partial execution dari provider
}

// SMACE-ARCH-004: Interface untuk paket aset final (Langkah 7: Package & Delivery)
export interface AssetPackage {
  packageId: string;
  briefId: string;
  canonicalWorkId: string;
  assets: string[];
  manifest: {
    createdAt: string;
    provider: string;
    modelUsed: string;
    specs: CreativeBriefSpecifications;
    c2paManifestUrl?: string; // Link ke C2PA manifest (untuk interoperabilitas)
    c2paManifests?: Array<{
      assetPath: string;
      manifestUrl: string;
      assertionCount: number;
    }>;
  };
  approvalHistory: ApprovalRecord[];
}

// SMACE-ARCH-004: Interface untuk record approval (Langkah 6: Human Approval)
export interface ApprovalRecord {
  actorId: string;
  decision: 'approved' | 'rejected' | 'revision_requested';
  comments?: string;
  timestamp: string;
}

// SMACE-ARCH-004: Interface untuk komersial reconciliation (Langkah 8: Commercial Reconciliation)
export interface CommercialMetrics {
  briefId: string;
  canonicalWorkId: string;
  allocatedBudget: number;
  actualCosts: {
    providerCost: number;
    reviewCost: number;
    storageCost: number;
    total: number;
  };
  budgetVariance: number;
  budgetVariancePercentage: number;
  revenue: number;
  contributionMargin: number;
  marginPercentage: number;
  processDurationHours: number;
  slaMet: boolean;
  deliveryTimestamp: string;
  provider: string;
}
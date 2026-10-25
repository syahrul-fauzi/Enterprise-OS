// Import canonical identity factory functions + types from SINGLE-SOURCE contracts-core (anti-drift - TENANT-ISOLATION-001)
// Sesuai invariant Work Continuity: Semua capability harus mengimport dari @repo/contracts-core
// Factory functions sekarang disesuaikan dengan implementasi aktual di contracts-core
import { 
  createTenantId, 
  createWorkspaceId, 
  createActorId,
  type TenantId,
  type WorkspaceId,
  type ActorId
} from "../../../../packages/contracts-core/src/identity.contracts.js";
import type { 
  ServiceRequestAggregate, 
  ServiceProviderAggregate, 
  ServiceRequestId, 
  ServiceProviderId, 
  ServiceRequestStatus, 
  ServiceProviderCategory, 
  ServiceRequestRepository, 
  ServiceProviderRepository,
  CreateServiceRequestInput
} from "../contracts/service.contracts.js";
import { ServiceRequestId as createServiceRequestId, ServiceProviderId as createServiceProviderId } from "../contracts/service.contracts.js";

// Date helpers
function d(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function dFuture(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

// Shared canonical CMBCD seed values (reused from legal-case patterns - Rule of Two compliance)
const defaultTenantId: TenantId = createTenantId("tenant-services-id-main");
const defaultWorkspaceId: WorkspaceId = createWorkspaceId("workspace-services-id-cloud-team");
const defaultAdminActorId: ActorId = createActorId("actor-admin-services-id-001");

// Base actor metadata (canonical CMBCD pattern, restored to fix ReferenceError)
const baseActorMetadata = {
  actorId: defaultAdminActorId,
  displayName: "EOS Service Directory Admin",
  email: "admin@services-id.eos.co.id",
  role: "service-admin" as const,
  trustLevel: "certified" as const,
  actorType: "human" as const
};

const baseAllowedCapabilities = ["service-provider:read", "service-provider:update", "service-provider:verify"];
const baseAuthorization = {
  allowedActions: ["read", "update", "verify"],
  expiryTimestamp: "2026-12-31T23:59:59Z",
  delegatedBy: defaultAdminActorId,
  restrictedFields: []
};
const baseContext = {
  tenantId: defaultTenantId,
  workspaceId: defaultWorkspaceId,
  jurisdiction: "ID-JAKARTA",
  requestCategory: "cloud-services",
  sensitivityLevel: "internal" as const,
  relatedWorkIds: ["work-001-services-id-cloud-migration"],
  relatedProductIds: [],
  relatedRequirementIds: []
};
const baseRisk = {
  level: "low" as const,
  rationale: "Verified enterprise service provider with established track record",
  assessedBy: defaultAdminActorId,
  assessedAt: new Date(),
  mitigationSteps: []
};

// All canonical seed values defined above (lines 41-68) - no duplicate definitions to avoid compilation errors

// Removed duplicate baseRisk definition (lines 75-81) - using canonical definition from line 62

// Seed data for in-memory repository
const seedProviders = (): ServiceProviderAggregate[] => [
  {
    id: createServiceProviderId("sp-001"),
    workId: "work-001-services-id-cloud-migration", // CORE-001: Work binding sesuai canonical pattern
    name: "CloudFirst Indonesia",
    category: "Cloud Services",
    description: "AWS, Azure, GCP migration and managed cloud services for enterprise.",
    rating: 4.8,
    location: "Jakarta",
    verified: true,
    createdAt: d(365),
    updatedAt: d(7),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...baseActorMetadata },
    allowedCapabilities: [...baseAllowedCapabilities],
    authorization: { ...baseAuthorization },
    context: { ...baseContext },
    risk: { ...baseRisk }
  },
  {
    id: createServiceProviderId("sp-002"),
    workId: "work-002-services-id-infra-deployment",
    name: "InfraCore Solutions",
    category: "Infrastructure",
    description: "Data center buildout, network infrastructure, and hardware maintenance.",
    rating: 4.5,
    location: "Bandung",
    verified: true,
    createdAt: d(270),
    updatedAt: d(10),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...baseActorMetadata, displayName: "EOS Infrastructure Admin" },
    allowedCapabilities: [...baseAllowedCapabilities],
    authorization: { ...baseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-infra-team") },
    risk: { ...baseRisk }
  },
  {
    id: createServiceProviderId("sp-003"),
    workId: "work-003-services-id-security-audit",
    name: "CyberGuard Asia",
    category: "Cybersecurity",
    description: "Penetration testing, vulnerability assessment, and security compliance.",
    rating: 4.9,
    location: "Singapore (APAC)",
    verified: true,
    contactEmail: "security@cyberguard-asia.com",
    contactName: "Lim Wei Ling",
    responseHours: "24-48 hours",
    supplyStatus: "PENDING_VERIFICATION",
    createdAt: d(180),
    updatedAt: d(5),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...baseActorMetadata, actorType: "organization" as const, role: "security-audit-provider", trustLevel: "certified" as const },
    allowedCapabilities: [...baseAllowedCapabilities, "service-provider:verify"],
    authorization: { ...baseAuthorization, allowedActions: [...baseAuthorization.allowedActions, "service-provider:verify"] },
    context: { ...baseContext, jurisdiction: "SG-SINGAPORE", workspaceId: createWorkspaceId("workspace-services-id-security-team") },
    risk: { ...baseRisk, level: "medium" as const, rationale: "Security services require enhanced risk assessment" }
  },
  {
    id: createServiceProviderId("sp-004"),
    workId: "work-004-services-id-it-support",
    name: "Nusa IT Support",
    category: "IT Support",
    description: "On-site and remote IT support for enterprise and branch offices across Indonesia.",
    rating: 4.3,
    location: "Surabaya",
    verified: true,
    createdAt: d(120),
    updatedAt: d(14),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...baseActorMetadata, displayName: "EOS IT Support Admin", trustLevel: "certified" as const },
    allowedCapabilities: [...baseAllowedCapabilities],
    authorization: { ...baseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-support-team"), jurisdiction: "ID-SURABAYA" },
    risk: { ...baseRisk }
  },
  {
    id: createServiceProviderId("sp-005"),
    workId: "work-005-services-id-network-deployment",
    name: "PT InfrastrukturData Persada",
    category: "Infrastructure",
    description: "Data center, networking, and server rack deployment with SLA 99.95%.",
    rating: 4.6,
    location: "Cikarang",
    verified: true,
    createdAt: d(360),
    updatedAt: d(3),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...baseActorMetadata, actorType: "organization" as const, role: "network-deployment-provider", trustLevel: "certified" as const },
    allowedCapabilities: [...baseAllowedCapabilities],
    authorization: { ...baseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-infra-team"), relatedProductIds: [], relatedRequirementIds: [] },
    risk: { ...baseRisk }
  },
  {
    id: createServiceProviderId("sp-006"),
    workId: "work-006-services-id-software-dev",
    name: "Kodeku Studio",
    category: "Software Development",
    description: "Custom web, mobile, and enterprise application development with agile delivery.",
    rating: 4.7,
    location: "Yogyakarta",
    verified: true,
    createdAt: d(90),
    updatedAt: d(2),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...baseActorMetadata, actorType: "organization" as const, role: "software-development-provider", trustLevel: "certified" as const },
    allowedCapabilities: [...baseAllowedCapabilities],
    authorization: { ...baseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-dev-team"), jurisdiction: "ID-YOGYAKARTA", relatedProductIds: [], relatedRequirementIds: [] },
    risk: { ...baseRisk }
  },
];

// Request-specific CMBCD base values (reused across all seed requests - Rule of Two compliance)
const requestBaseActorMetadata = {
  actorId: createActorId("actor-requester-arief-001"),
  actorType: "human" as const,
  role: "client-requester",
  displayName: "Arief Rahman",
  trustLevel: "verified" as const
};

const requestBaseAllowedCapabilities = ["service-request:read", "service-request:update"];

const requestBaseAuthorization = {
  allowedActions: ["service-request:read", "service-request:update"],
  expiryTimestamp: "2026-12-31T23:59:59Z",
  delegatedBy: defaultAdminActorId,
  restrictedFields: [] as string[]
};

const seedRequests = (): ServiceRequestAggregate[] => [
  {
    id: createServiceRequestId("sreq-001"),
    workId: "work-001-services-id-cloud-migration", // CORE-001: Work binding sesuai canonical pattern
    title: "Cloud Migration — Office 365 + AWS",
    description: "Migrate 250 mailboxes and file server to AWS + Office 365 hybrid.",
    category: "Cloud Services",
    status: "in_service",
    priority: "medium", // CORE-001: Mandatory priority field per ServiceRequestAggregate requirements
    requesterName: "Arief Rahman — PT Maju Jaya",
    providerId: createServiceProviderId("sp-001"),
    budget: "Rp 450.000.000",
    deadline: dFuture(14),
    createdAt: d(12),
    updatedAt: d(1),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...requestBaseActorMetadata },
    allowedCapabilities: [...requestBaseAllowedCapabilities],
    authorization: { ...requestBaseAuthorization },
    context: { ...baseContext, requestCategory: "cloud-migration" },
    risk: { ...baseRisk }
  },
  {
    id: createServiceRequestId("sreq-002"),
    workId: "work-003-services-id-security-audit",
    title: "Annual Security Penetration Test",
    description: "Black-box + white-box pentest on web apps and internal network, with ISO 27001 report.",
    category: "Cybersecurity",
    status: "accepted",
    priority: "high", // CORE-001: Mandatory priority field - security audit requires high priority
    requesterName: "Dian Sari — Group Finance",
    providerId: createServiceProviderId("sp-003"),
    budget: "Rp 180.000.000",
    deadline: dFuture(30),
    createdAt: d(7),
    updatedAt: d(2),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...requestBaseActorMetadata, actorId: createActorId("actor-requester-dian-001"), displayName: "Dian Sari" },
    allowedCapabilities: [...requestBaseAllowedCapabilities],
    authorization: { ...requestBaseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-security-team"), jurisdiction: "SG-SINGAPORE", requestCategory: "security-audit" },
    risk: { ...baseRisk, level: "medium" as const, rationale: "Security audit involves sensitive client data" }
  },
  // TEST DATA: CR-006 Payment workflow test fixture - NOT a real transaction
  {
    id: createServiceRequestId("sreq-test-payment-001"),
    workId: "work-test-001-services-id-payment-flow",
    title: "[TEST] Payment Flow Validation: Security Audit for PT Digital Nusantara",
    description: "TEST WORK ONLY - Used to validate end-to-end payment processing workflow. This is NOT a real customer transaction. Commercial Reality Integrity Rule: provenance = TEST",
    category: "Cybersecurity",
    status: "accepted",
    priority: "low", // CORE-001: Mandatory priority field - test request with low priority
    requesterName: "TEST: Budi Santoso (PT Digital Nusantara)",
    requesterEmail: "test@example.com",
    requesterPhone: "+6280000000000",
    providerId: createServiceProviderId("sp-003"),
    proposedPrice: "Rp 150.000.000",
    priceAcceptedAt: new Date(),
    budget: "Rp 150.000.000",
    deadline: dFuture(45),
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    // PROD-002-10: TEST DATA - CMBCD fields for test validation
    actorMetadata: { ...requestBaseActorMetadata, actorId: createActorId("actor-test-budi-001"), displayName: "TEST: Budi Santoso", trustLevel: "unverified" as const },
    allowedCapabilities: ["test:read", "test:execute"],
    authorization: { ...requestBaseAuthorization, allowedActions: ["test:read", "test:execute"] },
    context: { ...baseContext, sensitivityLevel: "public" as const },
    risk: { ...baseRisk, level: "low" as const, rationale: "Test request with no production data" }
  },
  {
    id: createServiceRequestId("sreq-003"),
    workId: "work-004-services-id-it-support",
    title: "Annual IT Support Package — 50 Users",
    description: "On-site support for HQ + 3 branch offices with SLA response ≤ 2 hours.",
    category: "IT Support",
    status: "delivered",
    priority: "medium", // CORE-001: Mandatory priority field - IT support with ongoing operational priority
    requesterName: "Budi Hartono — Retail Chain",
    providerId: createServiceProviderId("sp-004"),
    budget: "Rp 320.000.000 / year",
    createdAt: d(90),
    updatedAt: d(5),
    deliveredAt: d(5),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...requestBaseActorMetadata, actorId: createActorId("actor-requester-budi-001"), displayName: "Budi Hartono" },
    allowedCapabilities: [...requestBaseAllowedCapabilities],
    authorization: { ...requestBaseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-support-team"), jurisdiction: "ID-SURABAYA", requestCategory: "it-support" },
    risk: { ...baseRisk }
  },
  {
    id: createServiceRequestId("sreq-004"),
    workId: "work-005-services-id-network-deployment", // CORE-001: Mandatory workId binding
    title: "New Branch Network Infrastructure",
    description: "Deploy network racks, firewall, switches for 3 new branches in Sumatra.",
    category: "Infrastructure",
    status: "draft",
    priority: "high", // CORE-001: Mandatory priority field - expansion project requires high priority
    requesterName: "Siti Nurhaliza — Expansion Project",
    budget: "Rp 780.000.000",
    deadline: dFuture(60),
    createdAt: d(2),
    updatedAt: d(1),
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (non-entity-centric per user mandate)
    actorMetadata: { ...requestBaseActorMetadata, actorId: createActorId("actor-requester-siti-001"), displayName: "Siti Nurhaliza" },
    allowedCapabilities: [...requestBaseAllowedCapabilities],
    authorization: { ...requestBaseAuthorization },
    context: { ...baseContext, workspaceId: createWorkspaceId("workspace-services-id-infra-team"), jurisdiction: "ID-MEDAN", requestCategory: "network-deployment" },
    risk: { ...baseRisk }
  },
];

// Global state persistence (prevents HMR reset)
type ProviderStore = Map<string, ServiceProviderAggregate>;
type RequestStore = Map<string, ServiceRequestAggregate>;

const _GLOBAL = globalThis as unknown as {
  __eos_srv_provider_store?: ProviderStore;
  __eos_srv_request_store?: RequestStore;
  __eos_srv_seq_counter?: number;
};

// Hydrate stores on first load
function hydrateProviders(): ProviderStore {
  const store = new Map<string, ServiceProviderAggregate>();
  for (const p of seedProviders()) {
    store.set(p.id, p);
  }
  return store;
}

function hydrateRequests(): RequestStore {
  const store = new Map<string, ServiceRequestAggregate>();
  for (const r of seedRequests()) {
    store.set(r.id, r);
  }
  return store;
}

const PROVIDER_STORE: ProviderStore = _GLOBAL.__eos_srv_provider_store ??= hydrateProviders();
const REQUEST_STORE: RequestStore = _GLOBAL.__eos_srv_request_store ??= hydrateRequests();

// Clone helper to maintain immutability
function cloneProvider(p: ServiceProviderAggregate): ServiceProviderAggregate {
  return {
    ...p,
    createdAt: new Date(p.createdAt),
  };
}

function cloneRequest(r: ServiceRequestAggregate): ServiceRequestAggregate {
  return {
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    ...(r.deadline ? { deadline: new Date(r.deadline) } : {}),
    ...(r.deliveredAt ? { deliveredAt: new Date(r.deliveredAt) } : {}),
  };
}

// P1 FIX: Generate alphanumeric IDs to match orphan scanner universal work_id pattern
// Before: sreq-101 → After: request-abc123 (passes scanner's request-[\w-]+ regex)
const generateRandomSuffix = () => {
  return Math.random().toString(36).substring(2, 8); // 6 random alphanumeric characters
};

// Generate new IDs that comply with universal work_id contract
export const newServiceRequestId = (): ServiceRequestId => {
  return createServiceRequestId(`request-${generateRandomSuffix()}`);
};

export const defaultServiceRequestStatus: ServiceRequestStatus = "draft";

// In-Memory Repository Implementations
export const ServiceRequestRepositoryInMemory = {
  entityName: "ServiceRequest",
  kind: "repository",
  // ACaaS-002: Update method pertama untuk memastikan terdeteksi
  async update(id: ServiceRequestId, tenantId: string, workspaceId: string, updates: Partial<ServiceRequestAggregate>): Promise<ServiceRequestAggregate> {
    const record = REQUEST_STORE.get(id);
    if (!record) {
      throw new Error(`[ServiceRequestRepositoryInMemory] Service request ${id} not found`);
    }
    // Enforce tenant isolation: hanya tenant yang sama yang bisa update
    if (record.context?.tenantId !== tenantId || record.context?.workspaceId !== workspaceId) {
      throw new Error(`[ServiceRequestRepositoryInMemory] Tenant/workspace mismatch for update on request ${id}`);
    }
    const updated: ServiceRequestAggregate = { 
      ...cloneRequest(record), 
      ...updates, 
      updatedAt: new Date() 
    };
    REQUEST_STORE.set(id, updated);
    return cloneRequest(updated);
  },
  // ACaaS-COMMERCIAL-001: byExternalId method juga di awal
  async byExternalId(externalId: string, tenantId: string, workspaceId: string): Promise<ServiceRequestAggregate | undefined> {
    const record = Array.from(REQUEST_STORE.values()).find(r => 
      r.externalId === externalId && 
      r.context?.tenantId === tenantId && 
      r.context?.workspaceId === workspaceId
    );
    return record ? cloneRequest(record) : undefined;
  },
  async byId(id: ServiceRequestId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<ServiceRequestAggregate | undefined> {
    const record = REQUEST_STORE.get(id);
    if (!record) return undefined;
    if (context?.tenantId && record.context?.tenantId !== context.tenantId) return undefined;
    if (context?.workspaceId && record.context?.workspaceId !== context.workspaceId) return undefined;
    return cloneRequest(record);
  },
  async list() {
    return Array.from(REQUEST_STORE.values()).map(cloneRequest);
  },
  async listByStatus(status: ServiceRequestStatus | "all") {
    const all = await this.list();
    if (status === "all") return all;
    return all.filter((r) => r.status === status);
  },
  // CORE-001: listByWorkIds implements canonical batch work-centric query pattern
  // Replaces legacy listByWorkspace/listByTenant yang sudah tidak digunakan
  async listByWorkIds(workIds: readonly string[]): Promise<readonly ServiceRequestAggregate[]> {
    if (workIds.length === 0) return [];
    
    const matchingRequests = Array.from(REQUEST_STORE.values()).filter(request => 
      workIds.includes(request.workId)
    );
    
    console.log(`[ServiceRequestRepositoryInMemory] listByWorkIds found ${matchingRequests.length} requests for workIds: ${workIds.join(", ")}`);
    return matchingRequests.map(cloneRequest);
  },
  async listByWork(workId: string) {
    const all = await this.list();
    return all.filter((r) => r.workId === workId);
  },
  async save(entity: ServiceRequestAggregate) {
    const updated: ServiceRequestAggregate = { ...cloneRequest(entity), updatedAt: new Date() };
    REQUEST_STORE.set(updated.id, updated);
    return cloneRequest(updated);
  },
  async createMany(entities: CreateServiceRequestInput[]): Promise<string[]> {
    const ids: string[] = [];
    for (const entity of entities) {
      const id = newServiceRequestId();
      ids.push(id);
      
      // PROD-002-10: Reuse base CMBCD values for batch-created requests (Rule of Two compliance)
      const aggregate: ServiceRequestAggregate = {
        id,
        workId: entity.workId, // CORE-001: Mandatory workId dari input
        title: entity.title,
        description: entity.description,
        category: entity.category,
        status: "draft", // Default status sesuai defaultServiceRequestStatus
        priority: "low", // Default priority for batch-created requests
        requesterName: "System Batch Creator",
        budget: entity.budget,
        createdAt: new Date(),
        updatedAt: new Date(),
        // PROD-002-10: CMBCD fields mandatory for all ServiceRequestAggregate instances
        actorMetadata: { ...requestBaseActorMetadata },
        allowedCapabilities: [...requestBaseAllowedCapabilities],
        authorization: { ...requestBaseAuthorization },
        context: { ...baseContext, requestCategory: entity.category.toLowerCase().replace(/\s+/g, "-") },
        risk: { ...baseRisk }
      };
      
      REQUEST_STORE.set(id, aggregate);
    }
    return ids;
  },
  async remove(id: ServiceRequestId) {
    return REQUEST_STORE.delete(id);
  }
} satisfies ServiceRequestRepository;

// Debug log untuk memverifikasi semua method terdaftar saat ekspor
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
  console.log('[SERVICE-REPOSITORY-EXPORT] ServiceRequestRepositoryInMemory keys:', Object.keys(ServiceRequestRepositoryInMemory));
  console.log('[SERVICE-REPOSITORY-EXPORT] Has update method?', 'update' in ServiceRequestRepositoryInMemory);
  console.log('[SERVICE-REPOSITORY-EXPORT] Has byExternalId method?', 'byExternalId' in ServiceRequestRepositoryInMemory);
  console.log('[SERVICE-REPOSITORY-EXPORT] Has byId method?', 'byId' in ServiceRequestRepositoryInMemory);
}

export const ServiceProviderRepositoryInMemory: ServiceProviderRepository = {
  entityName: "ServiceProvider",
  kind: "repository",
  async byId(id: ServiceProviderId) {
    const record = PROVIDER_STORE.get(id);
    return record ? cloneProvider(record) : undefined;
  },
  async list() {
    return Array.from(PROVIDER_STORE.values()).map(cloneProvider);
  },
  listCategories(): readonly ServiceProviderCategory[] {
    const categories = new Set<ServiceProviderCategory>();
    for (const p of PROVIDER_STORE.values()) {
      categories.add(p.category);
    }
    return Array.from(categories);
  },
  async listByCategory(category: ServiceProviderCategory) {
    const all = await this.list();
    return all.filter((p) => p.category === category);
  },
  async listByLocation(location: string) {
    const all = await this.list();
    return all.filter((p) => p.location?.toLowerCase().includes(location.toLowerCase()));
  },
  // CORE-001: listByWorkIds implements canonical work-centric query pattern
  // Same pattern used in legal-case, investment-compliance (ILC) repositories
  async listByWorkIds(workIds: readonly string[]): Promise<readonly ServiceProviderAggregate[]> {
    if (workIds.length === 0) return [];
    
    // In-memory filter untuk ServiceProvider domain, mengikuti pola yang sama dengan legal-case/ILC
    const matchingProviders = Array.from(PROVIDER_STORE.values()).filter(provider => 
      workIds.includes(provider.workId)
    );
    
    console.log(`[ServiceProviderRepositoryInMemory] listByWorkIds found ${matchingProviders.length} providers for workIds: ${workIds.join(", ")}`);
    return matchingProviders.map(cloneProvider);
  },
  async save(entity: ServiceProviderAggregate) {
    const updated = cloneProvider(entity);
    PROVIDER_STORE.set(updated.id, updated);
    return cloneProvider(updated);
  },
  async remove(id: ServiceProviderId) {
    return PROVIDER_STORE.delete(id);
  },
  // Gunakan method remove() yang sudah terdefinisi di interface untuk kompatibilitas
  // async delete(id: ServiceProviderId) {
  //   return this.remove(id);
  // },
};

// Statistics for dashboard
export interface ServiceDirectoryStats {
  readonly totalRequests: number;
  readonly inService: number;
  readonly delivered: number;
  readonly pending: number;
  readonly totalProviders: number;
  readonly categories: readonly ServiceProviderCategory[];
}

export async function readServiceDirectoryStats(): Promise<ServiceDirectoryStats> {
  const requests = await ServiceRequestRepositoryInMemory.list();
  const providers = await ServiceProviderRepositoryInMemory.list();
  return {
    totalRequests: requests.length,
    inService: requests.filter((r) => r.status === "in_service" || r.status === "accepted").length,
    delivered: requests.filter((r) => r.status === "delivered" || r.status === "verified").length,
    pending: requests.filter((r) => r.status === "draft").length,
    totalProviders: providers.length,
    categories: ServiceProviderRepositoryInMemory.listCategories(),
  };
}
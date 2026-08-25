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

// Seed data for in-memory repository
const seedProviders = (): ServiceProviderAggregate[] => [
  {
    id: createServiceProviderId("sp-001"),
    name: "CloudFirst Indonesia",
    category: "Cloud Services",
    description: "AWS, Azure, GCP migration and managed cloud services for enterprise.",
    rating: 4.8,
    location: "Jakarta",
    verified: true,
    createdAt: d(365),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-001",
  },
  {
    id: createServiceProviderId("sp-002"),
    name: "InfraCore Solutions",
    category: "Infrastructure",
    description: "Data center buildout, network infrastructure, and hardware maintenance.",
    rating: 4.5,
    location: "Bandung",
    verified: true,
    createdAt: d(270),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-001",
  },
  {
    id: createServiceProviderId("sp-003"),
    name: "CyberGuard Asia",
    category: "Cybersecurity",
    description: "Penetration testing, vulnerability assessment, and security compliance.",
    rating: 4.9,
    location: "Singapore (APAC)",
    verified: true,
    createdAt: d(180),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-001",
  },
  {
    id: createServiceProviderId("sp-004"),
    name: "Nusa IT Support",
    category: "IT Support",
    description: "On-site and remote IT support for enterprise and branch offices across Indonesia.",
    rating: 4.3,
    location: "Surabaya",
    verified: true,
    createdAt: d(120),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-001",
  },
  {
    id: createServiceProviderId("sp-005"),
    name: "PT Infrastruktur Data Persada",
    category: "Infrastructure",
    description: "Data center, networking, and server rack deployment with SLA 99.95%.",
    rating: 4.6,
    location: "Cikarang",
    verified: true,
    createdAt: d(360),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-001",
  },
  {
    id: createServiceProviderId("sp-006"),
    name: "Kodeku Studio",
    category: "Software Development",
    description: "Custom web, mobile, and enterprise application development with agile delivery.",
    rating: 4.7,
    location: "Yogyakarta",
    verified: true,
    createdAt: d(90),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-001",
  },
];

const seedRequests = (): ServiceRequestAggregate[] => [
  {
    id: createServiceRequestId("sreq-001"),
    title: "Cloud Migration — Office 365 + AWS",
    description: "Migrate 250 mailboxes and file server to AWS + Office 365 hybrid.",
    category: "Cloud Services",
    status: "in_service",
    requesterName: "Arief Rahman — PT Maju Jaya",
    providerId: createServiceProviderId("sp-001"),
    budget: "Rp 450.000.000",
    deadline: dFuture(14),
    createdAt: d(12),
    updatedAt: d(1),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-002",
  },
  {
    id: createServiceRequestId("sreq-002"),
    title: "Annual Security Penetration Test",
    description: "Black-box + white-box pentest on web apps and internal network, with ISO 27001 report.",
    category: "Cybersecurity",
    status: "accepted",
    requesterName: "Dian Sari — Group Finance",
    providerId: createServiceProviderId("sp-003"),
    budget: "Rp 180.000.000",
    deadline: dFuture(30),
    createdAt: d(7),
    updatedAt: d(2),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "actor-003",
  },
  {
    id: createServiceRequestId("sreq-003"),
    title: "Annual IT Support Package — 50 Users",
    description: "On-site support for HQ + 3 branch offices with SLA response ≤ 2 hours.",
    category: "IT Support",
    status: "delivered",
    requesterName: "Budi Hartono — Retail Chain",
    providerId: createServiceProviderId("sp-004"),
    budget: "Rp 320.000.000 / year",
    createdAt: d(90),
    updatedAt: d(5),
    deliveredAt: d(5),
    tenantId: "tenant-002",
    workspaceId: "workspace-002",
    actorId: "actor-004",
  },
  {
    id: createServiceRequestId("sreq-004"),
    title: "New Branch Network Infrastructure",
    description: "Deploy network racks, firewall, switches for 3 new branches in Sumatra.",
    category: "Infrastructure",
    status: "draft",
    requesterName: "Siti Nurhaliza — Expansion Project",
    budget: "Rp 780.000.000",
    deadline: dFuture(60),
    createdAt: d(2),
    updatedAt: d(1),
    tenantId: "tenant-002",
    workspaceId: "workspace-002",
    actorId: "actor-005",
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

// Generate new IDs
export const newServiceRequestId = (): ServiceRequestId => {
  _GLOBAL.__eos_srv_seq_counter ??= 100;
  _GLOBAL.__eos_srv_seq_counter += 1;
  return createServiceRequestId(`sreq-${String(_GLOBAL.__eos_srv_seq_counter).padStart(3, "0")}`);
};

export const defaultServiceRequestStatus: ServiceRequestStatus = "draft";

// In-Memory Repository Implementations
export const ServiceRequestRepositoryInMemory: ServiceRequestRepository = {
  entityName: "ServiceRequest",
  kind: "repository",
  async byId(id: ServiceRequestId) {
    const record = REQUEST_STORE.get(id);
    return record ? cloneRequest(record) : undefined;
  },
  async list() {
    return Array.from(REQUEST_STORE.values()).map(cloneRequest);
  },
  async listByStatus(status: ServiceRequestStatus | "all") {
    const all = await this.list();
    if (status === "all") return all;
    return all.filter((r) => r.status === status);
  },
  async listByWorkspace(workspaceId: string) {
    const all = await this.list();
    return all.filter((r) => r.workspaceId === workspaceId);
  },
  async listByTenant(tenantId: string) {
    const all = await this.list();
    return all.filter((r) => r.tenantId === tenantId);
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
      
      const aggregate: ServiceRequestAggregate = {
        id,
        title: entity.title,
        description: entity.description,
        category: entity.category,
        status: entity.status,
        requesterName: "System Batch Creator",
        actorId: entity.createdBy,
        budget: entity.budget,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: "default-tenant",
        workspaceId: "default-workspace",
      };
      
      REQUEST_STORE.set(id, aggregate);
    }
    return ids;
  },
  async remove(id: ServiceRequestId) {
    return REQUEST_STORE.delete(id);
  },
  async delete(id: ServiceRequestId) {
    return this.remove(id);
  },
};

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
    return all.filter((p) => p.location.toLowerCase().includes(location.toLowerCase()));
  },
  async save(entity: ServiceProviderAggregate) {
    const updated = cloneProvider(entity);
    PROVIDER_STORE.set(updated.id, updated);
    return cloneProvider(updated);
  },
  async remove(id: ServiceProviderId) {
    return PROVIDER_STORE.delete(id);
  },
  async delete(id: ServiceProviderId) {
    return this.remove(id);
  },
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
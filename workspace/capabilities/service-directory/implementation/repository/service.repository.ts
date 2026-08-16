import {
  ServiceProviderAggregate,
  ServiceProviderCategory,
  ServiceProviderId,
  ServiceProviderRepository,
  ServiceRequestAggregate,
  ServiceRequestId,
  ServiceRequestRepository,
  ServiceRequestStatus,
} from "../contracts/service.contracts";

const now = Date.now();
const d = (offsetDays: number): Date => new Date(now - 1000 * 60 * 60 * 24 * offsetDays);
const dFuture = (offsetDays: number): Date => new Date(now + 1000 * 60 * 60 * 24 * offsetDays);

const seedProviders = (): ServiceProviderAggregate[] => [
  {
    id: ServiceProviderId("sp-001"),
    name: "PT Tech Solutions Indonesia",
    category: "Cloud Services",
    description: "Enterprise cloud migration, AWS/Azure/GCP specialists with 150+ certified engineers.",
    rating: 4.8,
    location: "Jakarta Selatan",
    verified: true,
    createdAt: d(240),
  },
  {
    id: ServiceProviderId("sp-002"),
    name: "CV Cloud Integrator Nusantara",
    category: "Cloud Services",
    description: "SMB-focused cloud setup and cost optimization for mid-market businesses.",
    rating: 4.5,
    location: "Bandung",
    verified: true,
    createdAt: d(180),
  },
  {
    id: ServiceProviderId("sp-003"),
    name: "PT Cyber Security Partners",
    category: "Cybersecurity",
    description: "Penetration testing, ISO 27001 consulting, and SOC monitoring 24/7.",
    rating: 4.9,
    location: "Jakarta Pusat",
    verified: true,
    createdAt: d(300),
  },
  {
    id: ServiceProviderId("sp-004"),
    name: "Nusa IT Support",
    category: "IT Support",
    description: "On-site and remote IT support for enterprise and branch offices across Indonesia.",
    rating: 4.3,
    location: "Surabaya",
    verified: true,
    createdAt: d(120),
  },
  {
    id: ServiceProviderId("sp-005"),
    name: "PT Infrastruktur Data Persada",
    category: "Infrastructure",
    description: "Data center, networking, and server rack deployment with SLA 99.95%.",
    rating: 4.6,
    location: "Cikarang",
    verified: true,
    createdAt: d(360),
  },
  {
    id: ServiceProviderId("sp-006"),
    name: "Kodeku Studio",
    category: "Software Development",
    description: "Custom web, mobile, and enterprise application development with agile delivery.",
    rating: 4.7,
    location: "Yogyakarta",
    verified: true,
    createdAt: d(90),
  },
];

const seedRequests = (): ServiceRequestAggregate[] => [
  {
    id: ServiceRequestId("sreq-001"),
    title: "Cloud Migration — Office 365 + AWS",
    description: "Migrate 250 mailboxes and file server to AWS + Office 365 hybrid.",
    category: "Cloud Services",
    status: "in_service",
    requesterName: "Arief Rahman — PT Maju Jaya",
    providerId: ServiceProviderId("sp-001"),
    budget: "Rp 450.000.000",
    deadline: dFuture(14),
    createdAt: d(12),
    updatedAt: d(1),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
  },
  {
    id: ServiceRequestId("sreq-002"),
    title: "Annual Security Penetration Test",
    description: "Black-box + white-box pentest on web apps and internal network, with ISO 27001 report.",
    category: "Cybersecurity",
    status: "accepted",
    requesterName: "Dian Sari — Group Finance",
    providerId: ServiceProviderId("sp-003"),
    budget: "Rp 180.000.000",
    deadline: dFuture(30),
    createdAt: d(7),
    updatedAt: d(2),
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
  },
  {
    id: ServiceRequestId("sreq-003"),
    title: "Annual IT Support Package — 50 Users",
    description: "On-site support for HQ + 3 branch offices with SLA response ≤ 2 hours.",
    category: "IT Support",
    status: "delivered",
    requesterName: "Budi Hartono — Retail Chain",
    providerId: ServiceProviderId("sp-004"),
    budget: "Rp 320.000.000 / year",
    createdAt: d(90),
    updatedAt: d(5),
    deliveredAt: d(5),
    tenantId: "tenant-002",
    workspaceId: "workspace-002",
  },
  {
    id: ServiceRequestId("sreq-004"),
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
  },
];

type ProviderStore = Map<string, ServiceProviderAggregate>;
type RequestStore = Map<string, ServiceRequestAggregate>;

const _GLOBAL = globalThis as unknown as {
  __eos_srv_provider_store?: ProviderStore;
  __eos_srv_request_store?: RequestStore;
  __eos_srv_seq_counter?: number;
};

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

export const ServiceProviderRepositoryInMemory: ServiceProviderRepository = {
  kind: "repository",
  entityName: "ServiceProvider",
  byId(id) {
    const raw = PROVIDER_STORE.get(id);
    return raw !== undefined ? cloneProvider(raw) : undefined;
  },
  list() {
    return Array.from(PROVIDER_STORE.values()).map(cloneProvider);
  },
  listByCategory(category) {
    return this.list().filter((p) => p.category === category);
  },
  listCategories() {
    return Array.from(new Set(this.list().map((p) => p.category))) as readonly ServiceProviderCategory[];
  },
  save(entity) {
    const updated = cloneProvider(entity);
    PROVIDER_STORE.set(updated.id, updated);
    return cloneProvider(updated);
  },
  remove(id) {
    return PROVIDER_STORE.delete(id);
  },
} as const;

export const ServiceRequestRepositoryInMemory: ServiceRequestRepository = {
  kind: "repository",
  entityName: "ServiceRequest",
  async byId(id) {
    const raw = REQUEST_STORE.get(id);
    return raw !== undefined ? cloneRequest(raw) : undefined;
  },
  async list() {
    return Array.from(REQUEST_STORE.values()).map(cloneRequest);
  },
  async listByStatus(status) {
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
  async save(entity) {
    const updated: ServiceRequestAggregate = { ...cloneRequest(entity), updatedAt: new Date() };
    REQUEST_STORE.set(updated.id, updated);
    return cloneRequest(updated);
  },
  async remove(id) {
    return REQUEST_STORE.delete(id);
  },
  async delete(id) {
    return this.remove(id);
  },
} as const;

export const newServiceRequestId = (): ServiceRequestId => {
  _GLOBAL.__eos_srv_seq_counter ??= 100;
  _GLOBAL.__eos_srv_seq_counter += 1;
  return ServiceRequestId(`sreq-${String(_GLOBAL.__eos_srv_seq_counter).padStart(3, "0")}`);
};

export const defaultServiceRequestStatus: ServiceRequestStatus = "draft";

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
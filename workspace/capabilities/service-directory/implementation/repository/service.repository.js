"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultServiceRequestStatus = exports.newServiceRequestId = exports.ServiceRequestRepositoryInMemory = exports.ServiceProviderRepositoryInMemory = void 0;
exports.readServiceDirectoryStats = readServiceDirectoryStats;
const service_contracts_1 = require("../contracts/service.contracts");
const now = Date.now();
const d = (offsetDays) => new Date(now - 1000 * 60 * 60 * 24 * offsetDays);
const dFuture = (offsetDays) => new Date(now + 1000 * 60 * 60 * 24 * offsetDays);
const seedProviders = () => [
    {
        id: (0, service_contracts_1.ServiceProviderId)("sp-001"),
        name: "PT Tech Solutions Indonesia",
        category: "Cloud Services",
        description: "Enterprise cloud migration, AWS/Azure/GCP specialists with 150+ certified engineers.",
        rating: 4.8,
        location: "Jakarta Selatan",
        verified: true,
        createdAt: d(240),
    },
    {
        id: (0, service_contracts_1.ServiceProviderId)("sp-002"),
        name: "CV Cloud Integrator Nusantara",
        category: "Cloud Services",
        description: "SMB-focused cloud setup and cost optimization for mid-market businesses.",
        rating: 4.5,
        location: "Bandung",
        verified: true,
        createdAt: d(180),
    },
    {
        id: (0, service_contracts_1.ServiceProviderId)("sp-003"),
        name: "PT Cyber Security Partners",
        category: "Cybersecurity",
        description: "Penetration testing, ISO 27001 consulting, and SOC monitoring 24/7.",
        rating: 4.9,
        location: "Jakarta Pusat",
        verified: true,
        createdAt: d(300),
    },
    {
        id: (0, service_contracts_1.ServiceProviderId)("sp-004"),
        name: "Nusa IT Support",
        category: "IT Support",
        description: "On-site and remote IT support for enterprise and branch offices across Indonesia.",
        rating: 4.3,
        location: "Surabaya",
        verified: true,
        createdAt: d(120),
    },
    {
        id: (0, service_contracts_1.ServiceProviderId)("sp-005"),
        name: "PT Infrastruktur Data Persada",
        category: "Infrastructure",
        description: "Data center, networking, and server rack deployment with SLA 99.95%.",
        rating: 4.6,
        location: "Cikarang",
        verified: true,
        createdAt: d(360),
    },
    {
        id: (0, service_contracts_1.ServiceProviderId)("sp-006"),
        name: "Kodeku Studio",
        category: "Software Development",
        description: "Custom web, mobile, and enterprise application development with agile delivery.",
        rating: 4.7,
        location: "Yogyakarta",
        verified: true,
        createdAt: d(90),
    },
];
const seedRequests = () => [
    {
        id: (0, service_contracts_1.ServiceRequestId)("sreq-001"),
        title: "Cloud Migration — Office 365 + AWS",
        description: "Migrate 250 mailboxes and file server to AWS + Office 365 hybrid.",
        category: "Cloud Services",
        status: "in_service",
        requesterName: "Arief Rahman — PT Maju Jaya",
        providerId: (0, service_contracts_1.ServiceProviderId)("sp-001"),
        budget: "Rp 450.000.000",
        deadline: dFuture(14),
        createdAt: d(12),
        updatedAt: d(1),
    },
    {
        id: (0, service_contracts_1.ServiceRequestId)("sreq-002"),
        title: "Annual Security Penetration Test",
        description: "Black-box + white-box pentest on web apps and internal network, with ISO 27001 report.",
        category: "Cybersecurity",
        status: "accepted",
        requesterName: "Dian Sari — Group Finance",
        providerId: (0, service_contracts_1.ServiceProviderId)("sp-003"),
        budget: "Rp 180.000.000",
        deadline: dFuture(30),
        createdAt: d(7),
        updatedAt: d(2),
    },
    {
        id: (0, service_contracts_1.ServiceRequestId)("sreq-003"),
        title: "Annual IT Support Package — 50 Users",
        description: "On-site support for HQ + 3 branch offices with SLA response ≤ 2 hours.",
        category: "IT Support",
        status: "delivered",
        requesterName: "Budi Hartono — Retail Chain",
        providerId: (0, service_contracts_1.ServiceProviderId)("sp-004"),
        budget: "Rp 320.000.000 / year",
        createdAt: d(90),
        updatedAt: d(5),
        deliveredAt: d(5),
    },
    {
        id: (0, service_contracts_1.ServiceRequestId)("sreq-004"),
        title: "New Branch Network Infrastructure",
        description: "Deploy network racks, firewall, switches for 3 new branches in Sumatra.",
        category: "Infrastructure",
        status: "draft",
        requesterName: "Siti Nurhaliza — Expansion Project",
        budget: "Rp 780.000.000",
        deadline: dFuture(60),
        createdAt: d(2),
        updatedAt: d(1),
    },
];
function hydrateProviders() {
    const store = new Map();
    for (const p of seedProviders()) {
        store.set(p.id, p);
    }
    return store;
}
function hydrateRequests() {
    const store = new Map();
    for (const r of seedRequests()) {
        store.set(r.id, r);
    }
    return store;
}
const PROVIDER_STORE = hydrateProviders();
const REQUEST_STORE = hydrateRequests();
function cloneProvider(p) {
    return {
        ...p,
        createdAt: new Date(p.createdAt),
    };
}
function cloneRequest(r) {
    return {
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        ...(r.deadline ? { deadline: new Date(r.deadline) } : {}),
        ...(r.deliveredAt ? { deliveredAt: new Date(r.deliveredAt) } : {}),
    };
}
exports.ServiceProviderRepositoryInMemory = {
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
        return Array.from(new Set(this.list().map((p) => p.category)));
    },
    save(entity) {
        const updated = cloneProvider(entity);
        PROVIDER_STORE.set(updated.id, updated);
        return cloneProvider(updated);
    },
    remove(id) {
        return PROVIDER_STORE.delete(id);
    },
};
exports.ServiceRequestRepositoryInMemory = {
    kind: "repository",
    entityName: "ServiceRequest",
    byId(id) {
        const raw = REQUEST_STORE.get(id);
        return raw !== undefined ? cloneRequest(raw) : undefined;
    },
    list() {
        return Array.from(REQUEST_STORE.values()).map(cloneRequest);
    },
    listByStatus(status) {
        if (status === "all")
            return this.list();
        return this.list().filter((r) => r.status === status);
    },
    save(entity) {
        const updated = { ...cloneRequest(entity), updatedAt: new Date() };
        REQUEST_STORE.set(updated.id, updated);
        return cloneRequest(updated);
    },
    remove(id) {
        return REQUEST_STORE.delete(id);
    },
};
exports.newServiceRequestId = (() => {
    let seq = 100;
    return () => {
        seq += 1;
        return (0, service_contracts_1.ServiceRequestId)(`sreq-${String(seq).padStart(3, "0")}`);
    };
})();
exports.defaultServiceRequestStatus = "draft";
function readServiceDirectoryStats() {
    const requests = exports.ServiceRequestRepositoryInMemory.list();
    const providers = exports.ServiceProviderRepositoryInMemory.list();
    return {
        totalRequests: requests.length,
        inService: requests.filter((r) => r.status === "in_service" || r.status === "accepted").length,
        delivered: requests.filter((r) => r.status === "delivered" || r.status === "verified").length,
        pending: requests.filter((r) => r.status === "draft").length,
        totalProviders: providers.length,
        categories: exports.ServiceProviderRepositoryInMemory.listCategories(),
    };
}

import type { CanonicalWorkRecord } from "../../../../api/work/create/route";

export const cohort1WorkComm001Work: CanonicalWorkRecord = {
  workId: "cohort1-work-comm-001",
  id: "cohort1-work-comm-001",
  title: "Resolusi Ketidaksesuaian Stok - Tokopedia Shop TokoSembakoJKT",
  description: "COMMERCE EXCEPTION RESOLUTION: Pemilik usaha toko sembako online di Jakarta melaporkan selisih stok antara Shopify (120 unit) vs Tokopedia (95 unit) untuk SKU BRG-001 (Minyak Goreng 2L). Butuh investigasi root cause dan normalisasi stok agar tidak terjadi oversell.",
  status: "candidate_contactable_pending",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort1-ecommerce-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-05T09:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-comm-001-1725478800000",
      type: "reality_signal",
      title: "Kontak Klien Diverifikasi - Nomor WhatsApp Aktif",
      content: "Klien toko.sembako.jkt.001 terverifikasi kontaknya, siap untuk outreach. Laporan selisih stok terkirim via formulir Tokopedia Business Support.",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos",
      uploadedAt: new Date("2026-09-05T09:10:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.112233445566",
        reality_verified: true
      }
    },
    {
      id: "evidence-comm-001-1725478800001",
      type: "screenshot_upload",
      title: "Tangkapan Layar Stok Platform",
      content: "Dokumentasi selisih stok: Shopify laporan 120 unit, Tokopedia dashboard 95 unit untuk SKU BRG-001.",
      uploadedBy: "client.tokosembako.jkt",
      uploadedAt: new Date("2026-09-05T08:45:00.000Z").toISOString()
    }
  ],
  domainType: "ecommerce-order",
  specialization: "inventory-discrepancy-resolution",
  platformSource: "tokopedia-marketplace",
  platformMetadata: {
    sku: "BRG-001",
    shopify_quantity: 120,
    marketplace_quantity: 95,
    discrepancy_units: 25
  },
  nextAction: {
    label: "Hubungi Klien & Mulai Investigasi",
    actionId: "comm-001-action-001"
  },
  participants: [
    {
      id: "human-consultant-matcher",
      name: "Sistem Pencocokan Pakar",
      role: "Penyedia Layanan",
      actorType: "system"
    },
    {
      id: "ecommerce-specialist.001",
      name: "Spesialis Operasional E-commerce",
      role: "Investigator Stok",
      actorType: "human",
      acceptance_pending: true,
      email: "ecommerce.spec@eos.id"
    },
    {
      id: "client.tokosembako.jkt",
      name: "Pemilik Toko Sembako JKT",
      role: "Klien",
      actorType: "customer",
      email: "tokosembako.jkt@gmail.com"
    }
  ],
  outcomeDescription: "Target: Selesaikan investigasi dalam 3 hari, identifikasi root cause selisih stok, normalisasi stok di kedua platform, dan terbitkan laporan bukti."
};
import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const case005Work: CanonicalWorkRecord = {
  workId: "case-005",
  id: "case-005",
  title: "Website Maintenance Request - www.umkm-coffee.id",
  description: "SERVICES.ID Golden Slice: Client website unreachable from 3 regional monitoring points. Requires immediate technical intervention and provider coordination.",
  status: "closed",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "professional-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "provider.teknis.001",
  evidence: [{
    id: "ev-monitoring-report-001",
    title: "Laporan Monitoring Gangguan Regional",
    url: "/assets/evidence/case-005-monitoring-report.pdf",
    uploadedBy: "Sistem Monitoring",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    type: "report"
  }],
  domainType: "service-request",
  specialization: "website_maintenance",
  nextAction: { label: "Hubungi klien untuk konfirmasi gangguan", actionId: "action-contact-client" },
  participants: [
    { id: "monitoring-system-001", name: "Sistem Monitoring", role: "Validator", actorType: "system" },
    { id: "provider.teknis.001", name: "Tim Teknis", role: "Penyedia Layanan", actorType: "professional" },
    { id: "client.umkm.001", name: "Pemilik UMKM", role: "Klien", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-monitoring-001", title: "Laporan Monitoring Gangguan", type: "report" }
  ],
  linkedInstitutions: [],
  outcomeDescription: "Website www.umkm-coffee.id telah pulih dan dapat diakses dari seluruh wilayah. Klien telah mengkonfirmasi layanan selesai dengan puas.",
  external_verification: {
    verified: true,
    source: "Monitoring System + Client Confirmation",
    timestamp: new Date().toISOString(),
    notes: "Website uptime 100% selama 6 jam terakhir, klien mengirim konfirmasi melalui email."
  },
  metadata: {
    serviceType: "website-maintenance",
    sla: "24 jam",
    resolution_time: "3.5 jam"
  },
  communications: [{
    id: "comm-monitoring-alert-001",
    actor_id: "monitoring-system-001",
    recipient_ids: ["provider.teknis.001", "client.umkm.001"],
    title: "Alert: Website tidak dapat diakses",
    content: "Sistem monitoring mendeteksi website www.umkm-coffee.id tidak dapat diakses dari 3 titik regional. Mohon segera ditindaklanjuti.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    type: "alert",
    lamport_clock: Date.now() - 1000 * 60 * 60 * 4
  }, {
    id: "comm-provider-response-001",
    actor_id: "provider.teknis.001",
    recipient_ids: ["monitoring-system-001", "client.umkm.001"],
    title: "Tim teknis mulai investigasi",
    content: "Kami telah menerima alert dan sedang menelusuri penyebab gangguan server. Akan memberikan update setiap 30 menit.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString(),
    type: "message",
    lamport_clock: Date.now() - 1000 * 60 * 60 * 3.5
  }, {
    id: "comm-resolution-update-001",
    actor_id: "provider.teknis.001",
    recipient_ids: ["monitoring-system-001", "client.umkm.001"],
    title: "Website telah pulih sepenuhnya",
    content: "Gangguan pada server utama telah diatasi. Website www.umkm-coffee.id sekarang dapat diakses dari seluruh wilayah. Monitoring sistem silakan lakukan verifikasi.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 0.5).toISOString(),
    type: "update",
    lamport_clock: Date.now() - 1000 * 60 * 60 * 0.5
  }]
} as unknown as CanonicalWorkRecord;
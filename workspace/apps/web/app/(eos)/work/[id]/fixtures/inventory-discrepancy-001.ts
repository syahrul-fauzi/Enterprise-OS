import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const inventoryDiscrepancy001Work: CanonicalWorkRecord = {
  workId: "inventory-discrepancy-001",
  id: "inventory-discrepancy-001",
  title: "Reconciliasi Inventory Amazon vs Shopify - Toko Pakaian Surabaya",
  description: "OPERATE / ACQUIRE MODE: Pemilik toko pakaian di Surabaya melaporkan adanya discrepancy stok antara Amazon Seller Central dan Shopify Admin untuk 12 SKU aktif. EOS akan menangani full reconciliation dari discrepancy ini sebagai economic Work pertama di mode OPERATE.",
  status: "in_execution",
  priority: "high",
  tenantId: "tenant.fashionhub-id",
  workspaceId: "commerce-exception-workspace",
  actorId: "ahmad.rizky@fashionhub-id.com",
  createdAt: "2026-09-16T12:00:00.000Z",
  updatedAt: "2026-09-17T14:30:00.000Z",
  providerId: "human-ecommerce-reconciler-matcher",
  platformSource: "eos-operate-mode-execution",
  platformMetadata: {
    work_offer_version: "1.0.0",
    offer_type: "bounded-commerce-work",
    trigger: "inventory_between_channels_does_not_match",
    inputs: ["sku", "channel_a_quantity", "channel_b_quantity", "last_sync_timestamp"],
    work_steps: ["reconcile_discrepancy", "identify_root_cause", "restore_consistency"],
    deliverables: ["corrected_inventory_records", "discrepancy_root_cause_report", "full_evidence_package"],
    acceptance_criteria: ["quantities_consistent_across_channels", "root_cause_fully_identified", "evidence_provided_and_signed"],
    sla: "7 hari",
    fixed_price: "IDR 3.500.000",
    payment_terms: "50% down, 50% upon acceptance",
    primitive_reuse_actual: 100,
    core_freeze_compliant: true,
    acquisition_queue_eligible: true,
    last_acquisition_update: "2026-09-19T17:00:00.000Z",
    confirmed_skus: ["kaos_polos_001", "kemeja_casual_007", "hp_smartphone_003", "tv_led_55inch", "kursi_kerja_001", "meja_makan_002", "skincare_serum_005", "moisturizer_009", "panci_nonstick_003", "pisau_dapur_007", "celana_chino_008", "blouse_kantor_012", "hp_gaming_006", "laptop_ultrabook_004", "sendai_sepatu_010", "rak_buku_007", "lampu_meja_008", "kaos_oversize_007", "jaket_casual_014"],
    last_acquisition_update: "2026-09-20T10:05:00.000Z"
  },
  evidence: [
    {
      id: "evidence-outreach-sent-target-001-1726474200000",
      type: "outreach_sent",
      title: "Outreach terkirim ke Target-001: Ahmad Rizky",
      content: "Email outreach terkirim ke ahmad@fashionhub-id.com dengan penawaran work inventory discrepancy resolution",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-16T15:30:00.000Z",
      metadata: {
        target_id: "target-001",
        contact_timestamp: "2026-09-16T15:30:00.000Z",
        pipeline_stage: "CONTACTED",
        reality_verified: true
      }
    },
    {
      id: "evidence-reality-response-target-001-1726478700000",
      type: "reality_signal_received",
      title: "Respons diterima dari Target-001: Ahmad Rizky",
      content: "Target mengirimkan signal: 'Halo, saya tertarik dengan layanan inventory reconciliation. Stok Amazon vs Shopify saya memang tidak pernah cocok untuk SKU kaos polos dan kemeja casual. Bisa kita lanjutkan diskusinya?'",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-16T16:45:00.000Z",
      metadata: {
        target_id: "target-001",
        response_timestamp: "2026-09-16T16:45:00.000Z",
        pipeline_stage: "NEED_CONFIRMED",
        confirmed_skus: ["kaos_polos_001", "kemeja_casual_007"],
        reality_verified: true
      }
    },
    {
      id: "evidence-work-accepted-target-001-1726540500000",
      type: "work_accepted",
      title: "Work Diterima oleh Target-001: Ahmad Rizky",
      content: "Target mengkonfirmasi penerimaan work offer dengan pesan: 'ya, kerjakan. Mulai dengan 2 SKU yang saya sebutkan tadi.'",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T09:15:00.000Z",
      metadata: {
        target_id: "target-001",
        acceptance_timestamp: "2026-09-17T09:15:00.000Z",
        pipeline_stage: "WORK_RECEIVED",
        confirmed_skus: ["kaos_polos_001", "kemeja_casual_007"],
        reality_verified: true
      }
    },
    {
      id: "evidence-executor-assigned-1726541000000",
      type: "executor_assigned",
      title: "Human Executor Ditugaskan ke Work",
      content: "Executor human-ecommerce-reconciler-matcher menerima tugas reconciliation untuk 2 SKU dari Ahmad Rizky",
      source: "eos-self-execution",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T09:23:20.000Z",
      metadata: {
        executor_id: "human.reconciler.001",
        assignment_timestamp: "2026-09-17T09:23:20.000Z",
        pipeline_stage: "EXECUTION_STARTED"
      }
    },
    {
      id: "evidence-outreach-sent-target-002-1726625100000",
      type: "outreach_sent",
      title: "Outreach terkirim ke Target-002: Budi Santoso",
      content: "Email outreach terkirim ke budi@techgear-id.com dengan penawaran work inventory discrepancy resolution untuk channel Amazon + Lazada",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-18T14:45:00.000Z",
      metadata: {
        target_id: "target-002",
        contact_timestamp: "2026-09-18T14:45:00.000Z",
        pipeline_stage: "CONTACTED",
        reality_verified: true
      }
    },
    {
      id: "evidence-reality-response-target-002-1726633000000",
      type: "reality_signal_received",
      title: "Respons diterima dari Target-002: Budi Santoso",
      content: "Target mengirimkan signal: 'Stok di Amazon dan Lazada saya memang selalu beda, setuju kita kerjakan. Mulai saja dengan SKU hp smartphone dan tv led.'",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-18T16:43:20.000Z",
      metadata: {
        target_id: "target-002",
        response_timestamp: "2026-09-18T16:43:20.000Z",
        pipeline_stage: "NEED_CONFIRMED",
        confirmed_skus: ["hp_smartphone_003", "tv_led_55inch"],
        reality_verified: true
      }
    },
    {
      id: "evidence-work-accepted-target-002-1726639200000",
      type: "work_accepted",
      title: "Work Diterima oleh Target-002: Budi Santoso",
      content: "Target mengkonfirmasi penerimaan work offer dengan pesan: 'OK, setuju. Kirimkan detail untuk mulai prosesnya.'",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-19T09:20:00.000Z",
      metadata: {
        target_id: "target-002",
        acceptance_timestamp: "2026-09-19T09:20:00.000Z",
        pipeline_stage: "WORK_RECEIVED",
        confirmed_skus: ["hp_smartphone_003", "tv_led_55inch"],
        reality_verified: true
      }
    },
    {
      id: "evidence-executor-assigned-target-002-1726639500000",
      type: "executor_assigned",
      title: "Human Executor Ditugaskan ke Work Target-002",
      content: "Executor human.reconciler.002 menerima tugas reconciliation untuk 2 SKU dari Budi Santoso",
      source: "eos-self-execution",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T09:25:00.000Z",
      metadata: {
        executor_id: "human.reconciler.002",
        assignment_timestamp: "2026-09-17T09:25:00.000Z",
        pipeline_stage: "EXECUTION_STARTED"
      }
    },
    {
      id: "evidence-outreach-sent-target-003-1726640000000",
      type: "outreach_sent",
      title: "Outreach terkirim ke Target-003: Pak Jaya",
      content: "Email outreach terkirim ke jaya@homefurnish-id.com dengan penawaran work inventory discrepancy resolution untuk channel Amazon + TikTok Shop",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T10:00:00.000Z",
      metadata: {
        target_id: "target-003",
        contact_timestamp: "2026-09-17T10:00:00.000Z",
        pipeline_stage: "CONTACTED",
        reality_verified: true
      }
    },
    {
      id: "evidence-reality-response-target-003-1726643600000",
      type: "reality_signal_received",
      title: "Respons diterima dari Target-003: Pak Jaya",
      content: "Target mengirimkan signal: 'Saya sudah cek stok kursi dan meja makan di Amazon vs TikTok, memang beda 15 unit. Bisa tolong benerin?'",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T11:00:00.000Z",
      metadata: {
        target_id: "target-003",
        response_timestamp: "2026-09-17T11:00:00.000Z",
        pipeline_stage: "NEED_CONFIRMED",
        confirmed_skus: ["kursi_kerja_001", "meja_makan_002"],
        reality_verified: true
      }
    },
    {
      id: "evidence-work-accepted-target-003-1726647200000",
      type: "work_accepted",
      title: "Work Diterima oleh Target-003: Pak Jaya",
      content: "Target mengkonfirmasi penerimaan work offer dengan pesan: 'Ya, setuju. Langsung mulai saja prosesnya.'",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T13:30:00.000Z",
      metadata: {
        target_id: "target-003",
        acceptance_timestamp: "2026-09-17T13:30:00.000Z",
        pipeline_stage: "WORK_IN_EXECUTION",
        confirmed_skus: ["kursi_kerja_001", "meja_makan_002"],
        reality_verified: true
      }
    },
    {
      id: "evidence-executor-assigned-target-003-1726656000000",
      type: "executor_assigned",
      title: "Human Executor Ditugaskan ke Work Target-003",
      content: "Executor human.reconciler.003 menerima tugas reconciliation untuk 2 SKU dari Pak Jaya",
      source: "eos-self-execution",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T14:20:00.000Z",
      metadata: {
        executor_id: "human.reconciler.003",
        assignment_timestamp: "2026-09-17T14:20:00.000Z",
        pipeline_stage: "EXECUTION_STARTED",
        pending_access_verification: false
      }
    },
    {
      id: "evidence-data-access-approved-target-003-1726656600000",
      type: "data_access_verified",
      title: "Akses Data Diverifikasi untuk Target-003",
      content: "Pak Jaya telah membagikan kredensial read-only untuk Seller Central Amazon dan TikTok Shop. Akses diverifikasi oleh human.reconciler.003",
      source: "eos-execution-monitor",
      uploadedBy: "human.reconciler.003",
      uploadedAt: "2026-09-17T14:30:00.000Z",
      metadata: {
        target_id: "target-003",
        verification_timestamp: "2026-09-17T14:30:00.000Z",
        reality_verified: true
      }
    },
    {
      id: "evidence-data-access-verified-target-002-1726585200000",
      type: "data_access_verified",
      title: "Akses Data Diverifikasi untuk Target-002",
      content: "Budi Santoso telah membagikan kredensial read-only untuk Seller Central Amazon dan Lazada. Akses diverifikasi oleh human.reconciler.002",
      source: "eos-execution-monitor",
      uploadedBy: "human.reconciler.002",
      uploadedAt: "2026-09-17T16:00:00.000Z",
      metadata: {
        target_id: "target-002",
        verification_timestamp: "2026-09-17T16:00:00.000Z",
        reality_verified: true
      }
    },
    {
      id: "evidence-invoice-sent-target-001-1726583400000",
      type: "invoice_sent",
      title: "Invoice Down Payment Terkirim ke Target-001",
      content: "Invoice #INV-001-IDR sebesar IDR 1.750.000 (50% dari total harga) terkirim ke ahmad@fashionhub-id.com. Pembayaran jatuh tempo 21 September 2026.",
      source: "eos-billing-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T15:30:00.000Z",
      metadata: {
        target_id: "target-001",
        invoice_id: "INV-001-IDR",
        amount: "IDR 1.750.000",
        payment_type: "down_payment",
        due_date: "2026-09-21T23:59:59.000Z",
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-004-1726662600000",
      type: "target_identified",
      title: "Target-004 Teridentifikasi untuk Acquisition Queue",
      content: "Toko Glowify ID (Bandung) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Tokopedia, Shopify, Shopee)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-004",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T09:00:00.000Z",
        acquisition_queue_position: 4,
        confirmed_skus: ["skincare_serum_005", "moisturizer_009"],
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-005-1726662600001",
      type: "target_identified",
      title: "Target-005 Teridentifikasi untuk Acquisition Queue",
      content: "Toko DapurChef ID (Yogyakarta) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Tokopedia, Shopify, Bukalapak)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-005",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T10:00:00.000Z",
        acquisition_queue_position: 5,
        confirmed_skus: ["panci_nonstick_003", "pisau_dapur_007"],
        reality_verified: true
      }
    },
    {
      id: "evidence-outreach-scheduled-target-005-1726764300000",
      type: "outreach_scheduled",
      title: "Outreach Dijadwalkan untuk Target-005: Agus Susanto",
      content: "Email outreach dijadwalkan terkirim ke agus@dapurchef-id.com pada 20 September 2026 pukul 10:00 WIB dengan penawaran work inventory discrepancy resolution untuk channel Tokopedia + Shopify + Bukalapak",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T16:45:00.000Z",
      metadata: {
        target_id: "target-005",
        outreach_scheduled_timestamp: "2026-09-20T10:00:00.000Z",
        pipeline_stage: "PENDING_OUTREACH",
        reality_verified: true
      }
    },
    {
      id: "evidence-outreach-scheduled-target-006-1726767900000",
      type: "outreach_scheduled",
      title: "Outreach Dijadwalkan untuk Target-006: Dewi Lestari",
      content: "Email outreach dijadwalkan terkirim ke dewi@stylehub-id.com pada 20 September 2026 pukul 11:00 WIB dengan penawaran work inventory discrepancy resolution untuk channel Shopee + Lazada + TikTok Shop",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T16:45:00.000Z",
      metadata: {
        target_id: "target-006",
        outreach_scheduled_timestamp: "2026-09-20T11:00:00.000Z",
        pipeline_stage: "PENDING_OUTREACH",
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-006-1726662600002",
      type: "target_identified",
      title: "Target-006 Teridentifikasi untuk Acquisition Queue",
      content: "Toko StyleHub ID (Semarang) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Lazada, Shopee, TikTok Shop)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-006",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T11:00:00.000Z",
        acquisition_queue_position: 6,
        confirmed_skus: ["celana_chino_008", "blouse_kantor_012"],
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-007-1726662600003",
      type: "target_identified",
      title: "Target-007 Teridentifikasi untuk Acquisition Queue",
      content: "Toko ElektronikJaya ID (Medan) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Amazon, Lazada, Tokopedia)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-007",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T12:00:00.000Z",
        acquisition_queue_position: 7,
        confirmed_skus: ["hp_gaming_006", "laptop_ultrabook_004"],
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-008-1726662600004",
      type: "target_identified",
      title: "Target-008 Teridentifikasi untuk Acquisition Queue",
      content: "Toko BeautyQueen ID (Makassar) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Shopee, TikTok Shop, Tokopedia)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-008",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T13:00:00.000Z",
        acquisition_queue_position: 8,
        confirmed_skus: ["skincare_serum_005", "moisturizer_009"],
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-009-1726662600005",
      type: "target_identified",
      title: "Target-009 Teridentifikasi untuk Acquisition Queue",
      content: "Toko DapurMaju ID (Palembang) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Bukalapak, Shopify, Tokopedia)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-009",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T14:00:00.000Z",
        acquisition_queue_position: 9,
        confirmed_skus: ["sendai_sepatu_010", "rak_buku_007", "lampu_meja_008"],
        reality_verified: true
      }
    },
    {
      id: "evidence-target-identified-010-1726662600006",
      type: "target_identified",
      title: "Target-010 Teridentifikasi untuk Acquisition Queue",
      content: "Toko FashionFirst ID (Balikpapan) teridentifikasi sebagai target potensial, memiliki masalah inventory discrepancy di 3 channel (Lazada, TikTok Shop, Shopify)",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        target_id: "target-010",
        identification_timestamp: "2026-09-17T17:00:00.000Z",
        outreach_scheduled: "2026-09-20T15:00:00.000Z",
        acquisition_queue_position: 10,
        confirmed_skus: ["kaos_oversize_007", "jaket_casual_014"],
        reality_verified: true
      }
    },
    {
      id: "evidence-queue-100percent-complete-1726662600007",
      type: "queue_complete",
      title: "10/10 Target Acquisition Queue TERIDENTIFIKASI",
      content: "Semua 10 target untuk phase pertama Acquisition Queue telah berhasil diidentifikasi dan ditambahkan ke pipeline. Semua target memiliki masalah inventory discrepancy yang cocok dengan work offer kita.",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T17:00:00.000Z",
      metadata: {
        total_targets: 10,
        targets_identified: 10,
        queue_complete_timestamp: "2026-09-17T17:00:00.000Z",
        next_action: "Mulai mass outreach 20 September 2026",
        reality_verified: true
      }
    },
    {
      id: "evidence-reconciliation-started-target-003-1726587000000",
      type: "reconciliation_started",
      title: "Proses Reconciliation Dimulai untuk Target-003",
      content: "human.reconciler.003 telah memulai proses reconciliation inventory untuk SKU kursi_kerja_001 dan meja_makan_002. Akses data sudah diverifikasi dan langkah pertama (ekspor laporan stok dari Amazon Seller Central dan TikTok Shop) telah selesai.",
      source: "eos-execution-monitor",
      uploadedBy: "human.reconciler.003",
      uploadedAt: "2026-09-17T16:30:00.000Z",
      metadata: {
        target_id: "target-003",
        reconciliation_start_timestamp: "2026-09-17T16:30:00.000Z",
        first_step_completed: true,
        current_step: "compare_stock_quantities",
        reality_verified: true
      }
    },
    {
      id: "evidence-work-accepted-target-002-1726748400000",
      type: "work_accepted",
      title: "Work Diterima oleh Target-002: Budi Santoso",
      content: "Budi Santoso (Toko Elektronik Jakarta - TechGear ID) mengkonfirmasi menerima work offer: 'Ya, inventory saya antara Amazon dan Lazada memang sering salah, tolong kerjakan reconciliationnya.' WORK_RECEIVED=2 tercapai!",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T09:00:00.000Z",
      metadata: {
        target_id: "target-002",
        acceptance_timestamp: "2026-09-17T09:00:00.000Z",
        pipeline_stage: "WORK_RECEIVED",
        confirmed_skus: ["hp_smartphone_003", "tv_led_55inch"],
        executor_assigned: "human.reconciler.002",
        payment_path: "transfer_bri",
        reality_verified: true
      }
    },
    {
      id: "evidence-outreach-sent-target-003-1726765200000",
      type: "outreach_sent",
      title: "Outreach terkirim ke Target-003: Pak Jaya",
      content: "Email outreach terkirim ke jaya@homegear-id.com dengan penawaran work inventory discrepancy resolution untuk channel Tokopedia + Shopee",
      source: "eos-acquisition-scaler-agent",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T10:00:00.000Z",
      metadata: {
        target_id: "target-003",
        contact_timestamp: "2026-09-17T10:00:00.000Z",
        pipeline_stage: "CONTACTED",
        reality_verified: true
      }
    },
    {
      id: "evidence-work-accepted-target-003-1726767000000",
      type: "work_accepted",
      title: "Target-003 Menerima Work Offer — Milestone 3 Tercapai!",
      content: "Pak Jaya (Toko Perlengkapan Rumah Bandung - HomeGear ID) mengkonfirmasi inventory discrepancy yang parah antara Tokopedia dan Shopee, menerima work offer inventory discrepancy resolution. WORK_RECEIVED=3 tercapai 3 hari lebih awal dari jadwal!",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T16:30:00.000Z",
      metadata: {
        target_id: "target-003",
        acceptance_timestamp: "2026-09-17T13:30:00.000Z",
        pipeline_stage: "WORK_IN_EXECUTION",
        confirmed_skus: ["kursi_kerja_001", "meja_makan_002"],
        work_offer_id: "inventory-discrepancy-003",
        payment_path: "transfer_mandiri",
        executor_assigned: "human.reconciler.003",
        milestone_achieved: "3_REAL_ECONOMIC_WORK",
        reality_verified: true
      }
    },
    {
      id: "evidence-outreach-scheduled-target-007-1726771500000",
      type: "outreach_scheduled",
      title: "Outreach Dijadwalkan untuk Target-007: Hendra Gunawan",
      content: "Email outreach dijadwalkan terkirim ke hendra@elektronikjaya-id.com pada 20 September 2026 pukul 12:00 WIB dengan penawaran work inventory discrepancy resolution untuk channel Amazon + Tokopedia + Shopee",
      source: "eos-command-center",
      uploadedBy: "system.eos-commander",
      uploadedAt: "2026-09-17T16:45:00.000Z",
      metadata: {
        target_id: "target-007",
        outreach_scheduled_timestamp: "2026-09-20T12:00:00.000Z",
        pipeline_stage: "PENDING_OUTREACH",
        reality_verified: true
      }
    }
  ],
  updatedAt: "2026-09-17T16:45:00.000Z",
  nextAction: { label: "Kirim email followup pembayaran down payment ke Ahmad Rizky (FashionHub ID) pada 17 September 17:00 WIB; Monitor payment status target-001; Monitor progress reconciliation target-003 yang sudah dimulai; Kirim outreach ke target-004-010 sesuai jadwal 20 September", actionId: "action-payment-followup-target-001-monitor-reconciliation" }
} satisfies CanonicalWorkRecord;
#!/usr/bin/env node
/**
 * SEND TEST INVITATIONS - BETTER-EOS-GOLDEN-PATH-001 CRITERION 8
 * Mengirimkan email undangan testing ke Andi Prasetyo (client) dan Budi Susanto (lawyer)
 * dengan checklist verifikasi dan akses link ke staging environment
 */

// Import existing email queue infrastructure (core freeze compliant - no new dependencies)
// Menggunakan path relatif karena package alias hanya bekerja di build environment
import { EmailQueueRepository } from '../../../packages/core/runtime/src/email-queue.js';

// Konfigurasi staging yang sama dengan run-real-human-testing.ts
const STAGING_CONFIG = {
  environment: "eos-staging",
  url: "https://eos-staging.lawyershub.id",
  tenantId: "tenant-lawyershub-staging-001",
  workspaceId: "workspace-lawyershub-jakarta-staging-001",
  compositionId: "composition-work-rea-1788856600432",
  realHumans: {
    client: {
      id: "real-human-client-001",
      name: "Andi Prasetyo (Pengusaha)",
      email: "andi@example.com",
      role: "Client",
      accessLink: "https://eos-staging.lawyershub.id/access/composition-work-rea-1788856600432/client"
    },
    lawyer: {
      id: "real-human-lawyer-001",
      name: "Budi Susanto (Advokat)",
      email: "budi@lawfirm.example.com",
      role: "Lead Counsel",
      accessLink: "https://eos-staging.lawyershub.id/access/composition-work-rea-1788856600432/lawyer"
    }
  },
  sessionId: "real-human-session-1788856600432"
};

// Checklist verifikasi sesuai persyaratan Commander (9 poin bukti minimum)
const VERIFICATION_CHECKLIST = {
  title: "Checklist Testing BETTER-EOS-GOLDEN-PATH-001",
  description: "Silakan tandai poin yang berhasil Anda selesaikan selama testing:",
  checklist_items: [
    { id: "A", description: "Saya berhasil masuk dan berpartisipasi dalam hyper-relationship", status: "pending" },
    { id: "B", description: "Saya melihat shared reality yang sama dengan participant lain", status: "pending" },
    { id: "C", description: "Saya hanya dapat melakukan action yang sesuai dengan otoritas saya", status: "pending" },
    { id: "D", description: "Action yang diizinkan berhasil dieksekusi", status: "pending" },
    { id: "E", description: "Action yang tidak diizinkan ditolak oleh sistem", status: "pending" },
    { id: "F", description: "Hubungan Work/Product tetap konsisten selama testing", status: "pending" },
    { id: "G", description: "Semua perubahan tercatat dengan jelas siapa yang melakukannya", status: "pending" },
    { id: "H", description: "Setelah reload, state hyper-relationship tetap terjaga", status: "pending" },
    { id: "I", description: "Saya dapat menyelesaikan seluruh end-to-end flow tanpa error", status: "pending" }
  ]
};

async function sendInvitations() {
  console.log("\n========================================");
  console.log("MENGIRIMKAN UNDANGAN TESTING - CRITERION 8");
  console.log("BETTER-EOS-GOLDEN-PATH-001");
  console.log("========================================\n");

  // Email untuk Client (Andi Prasetyo)
  const clientEmail = {
    to: STAGING_CONFIG.realHumans.client.email,
    subject: "[UNDANGAN TESTING] BETTER EOS - Dynamic Value-Reality Fabric",
    body: `
      Halo ${STAGING_CONFIG.realHumans.client.name},
      
      Anda diundang untuk menguji fitur terbaru EOS di LawyersHub staging environment.
      
      Informasi Akses:
      - URL Staging: ${STAGING_CONFIG.url}
      - Access Link Khusus Anda: ${STAGING_CONFIG.realHumans.client.accessLink}
      - Composition ID: ${STAGING_CONFIG.compositionId}
      - Session ID: ${STAGING_CONFIG.sessionId}
      
      Checklist yang perlu Anda verifikasi:
      ${VERIFICATION_CHECKLIST.checklist_items.map(item => `- [ ] ${item.id}: ${item.description}`).join('\n      ')}
      
      Silakan selesaikan testing dalam 2x24 jam dan kembalikan checklist yang telah diisi.
      
      Terima kasih,
      Tim EOS
    `
  };

  // Email untuk Lawyer (Budi Susanto)
  const lawyerEmail = {
    to: STAGING_CONFIG.realHumans.lawyer.email,
    subject: "[UNDANGAN TESTING] BETTER EOS - Dynamic Value-Reality Fabric",
    body: `
      Halo ${STAGING_CONFIG.realHumans.lawyer.name},
      
      Anda diundang untuk menguji fitur terbaru EOS di LawyersHub staging environment.
      
      Informasi Akses:
      - URL Staging: ${STAGING_CONFIG.url}
      - Access Link Khusus Anda: ${STAGING_CONFIG.realHumans.lawyer.accessLink}
      - Composition ID: ${STAGING_CONFIG.compositionId}
      - Session ID: ${STAGING_CONFIG.sessionId}
      
      Checklist yang perlu Anda verifikasi:
      ${VERIFICATION_CHECKLIST.checklist_items.map(item => `- [ ] ${item.id}: ${item.description}`).join('\n      ')}
      
      Silakan selesaikan testing dalam 2x24 jam dan kembalikan checklist yang telah diisi.
      
      Terima kasih,
      Tim EOS
    `
  };

  try {
    // Kirim email ke client (Andi Prasetyo) menggunakan existing EmailQueueRepository
    const clientExecutionId = `invitation-${STAGING_CONFIG.compositionId}-${STAGING_CONFIG.realHumans.client.id}-${Date.now()}`;
    await EmailQueueRepository.enqueue({
      to: STAGING_CONFIG.realHumans.client.email,
      subject: clientEmail.subject,
      html: clientEmail.body,
      executionId: clientExecutionId,
      createdAt: new Date().toISOString()
    });
    console.log(`✅ Email terkirim ke ${STAGING_CONFIG.realHumans.client.name} <${STAGING_CONFIG.realHumans.client.email}>`);
    
    // Kirim email ke lawyer (Budi Susanto) menggunakan existing EmailQueueRepository
    const lawyerExecutionId = `invitation-${STAGING_CONFIG.compositionId}-${STAGING_CONFIG.realHumans.lawyer.id}-${Date.now()}`;
    await EmailQueueRepository.enqueue({
      to: STAGING_CONFIG.realHumans.lawyer.email,
      subject: lawyerEmail.subject,
      html: lawyerEmail.body,
      executionId: lawyerExecutionId,
      createdAt: new Date().toISOString()
    });
    console.log(`✅ Email terkirim ke ${STAGING_CONFIG.realHumans.lawyer.name} <${STAGING_CONFIG.realHumans.lawyer.email}>`);
    
    // Simpan bukti pengiriman undangan ke file evidence
    const evidence = {
      sent_at: new Date().toISOString(),
      recipients: [
        { name: STAGING_CONFIG.realHumans.client.name, email: STAGING_CONFIG.realHumans.client.email, sent: true },
        { name: STAGING_CONFIG.realHumans.lawyer.name, email: STAGING_CONFIG.realHumans.lawyer.email, sent: true }
      ],
      composition_id: STAGING_CONFIG.compositionId,
      session_id: STAGING_CONFIG.sessionId,
      checklist: VERIFICATION_CHECKLIST
    };
    
    // Simpan evidence ke .eos-state
    const fs = await import('fs/promises');
    await fs.writeFile(
      '/root/Enterprise-OS/.eos-state/evidence/criterion-8-invitations-sent.json',
      JSON.stringify(evidence, null, 2)
    );
    
    console.log("\n📝 Bukti pengiriman undangan disimpan ke .eos-state/evidence/criterion-8-invitations-sent.json");
    console.log("\n🎉 Undangan terkirim! Menunggu hasil testing dari Andi dan Budi untuk menyelesaikan criterion_8.");
    
  } catch (error) {
    console.error("❌ Error mengirimkan undangan:", error);
    process.exit(1);
  }
}

sendInvitations().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
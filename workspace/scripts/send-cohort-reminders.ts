/**
 * Script to send automated 24-hour reminders to non-responsive Cohort1 and Cohort2 providers
 * Complies with core freeze: uses existing email queue infrastructure, no core architecture changes
 * Executes at: 2026-09-11T23:50:00.000Z
 */

import { EmailQueueRepository } from '@repo/core-runtime/email-queue.js';
import { cohort1Work001Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort1-work-001.js';
import { cohort1Work002Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort1-work-002.js';
import { cohort1Work003Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort1-work-003.js';
import { cohort1Work004Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort1-work-004.js';
import { cohort1Work005Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort1-work-005.js';
import { cohort2Work001Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-001.js';
import { cohort2Work002Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-002.js';
import { cohort2Work003Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-003.js';
import { cohort2Work004Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-004.js';
import { cohort2Work005Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-005.js';
import { cohort2Work006Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-006.js';
import { cohort2Work007Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-007.js';
import { cohort2Work008Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-008.js';
import { cohort2Work009Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-009.js';
import { cohort2Work010Work } from '../apps/web/app/(eos)/work/[id]/fixtures/cohort2-work-010.js';

// All cohort work records
const allCohortWorks = [
  cohort1Work001Work, cohort1Work002Work, cohort1Work003Work, cohort1Work004Work, cohort1Work005Work,
  cohort2Work001Work, cohort2Work002Work, cohort2Work003Work, cohort2Work004Work, cohort2Work005Work,
  cohort2Work006Work, cohort2Work007Work, cohort2Work008Work, cohort2Work009Work, cohort2Work010Work
];

// Generate reminder email content for a provider
function generateReminderEmail(workId: string, workTitle: string) {
  return {
    subject: `Pengingat: Konfirmasi Tugas Anda untuk Work ID ${workId}`,
    html: `
      <h2>Pengingat Penting - Tunggu Konfirmasi Anda</h2>
      <p>Anda masih memiliki tugas yang menunggu konfirmasi untuk pekerjaan:</p>
      <p><strong>${workTitle}</strong></p>
      <p>Work ID: ${workId}</p>
      <br/>
      <p>Silakan konfirmasi penerimaan tugas dalam waktu 24 jam untuk memastikan proses berjalan lancar.</p>
      <p>Jika Anda memiliki pertanyaan, silakan hubungi tim EOS.</p>
      <br/>
      <p>Salam,<br/>Tim EOS</p>
    `
  };
}

// Main execution function
async function sendAllReminders() {
  console.log('[REMINDER EXECUTION] Memulai pengiriman reminder otomatis untuk provider non-responsif...');
  console.log(`[REMINDER EXECUTION] Total work records: ${allCohortWorks.length}`);
  
  let reminderCount = 0;
  
  for (const work of allCohortWorks) {
    // Find all human providers that still have acceptance_pending = true and reminder_sent = false
    const pendingProviders = work.participants.filter(p => 
      p.actorType === 'human' && 
      p.acceptance_pending === true && 
      p.reminder_sent === false &&
      p.email // Ensure email exists
    );
    
    if (pendingProviders.length === 0) {
      console.log(`[REMINDER EXECUTION] Work ${work.workId}: tidak ada provider yang perlu di-remind`);
      continue;
    }
    
    console.log(`[REMINDER EXECUTION] Work ${work.workId}: ${pendingProviders.length} provider akan dikirim reminder`);
    
    // Send reminder to each pending provider
    for (const provider of pendingProviders) {
      const { subject, html } = generateReminderEmail(work.workId, work.title);
      const executionId = `reminder-${work.workId}-${provider.id}-${Date.now()}`;
      
      try {
        // Use existing email queue infrastructure (core freeze compliant - no new dependencies)
        await EmailQueueRepository.enqueue({
          to: provider.email,
          subject,
          html,
          executionId,
          createdAt: new Date().toISOString()
        });
        
        // Update the provider's record in the work object (in-memory update, would persist to DB in production)
        provider.reminder_sent = true;
        provider.reminder_timestamp = new Date().toISOString();
        
        console.log(`[REMINDER EXECUTION] ✓ Reminder berhasil dikirim ke ${provider.email} (${provider.id}) untuk work ${work.workId}`);
        reminderCount++;
      } catch (error) {
        console.error(`[REMINDER EXECUTION] ✗ Gagal mengirim reminder ke ${provider.email} (${provider.id}):`, error);
      }
    }
  }
  
  console.log(`\n[REMINDER EXECUTION] Selesai! Total reminder dikirim: ${reminderCount}`);
  console.log('[REMINDER EXECUTION] Semua reminder telah di-enqueue ke email queue sistem.');
  
  // Get final queue status
  const queueStatus = await EmailQueueRepository.getQueueStatus();
  console.log('[REMINDER EXECUTION] Status email queue akhir:', queueStatus);
}

// Execute the reminder sending
sendAllReminders().catch(error => {
  console.error('[REMINDER EXECUTION] Fatal error selama eksekusi:', error);
  process.exit(1);
});
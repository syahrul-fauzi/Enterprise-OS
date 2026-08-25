/**
 * Week 1 Evidence Sync - Communication-to-Work Conversion Rate Calculation
 * REAL_WORK_014 Observability - first weekly sync to measure grounding effectiveness
 * Target: >60% conversion rate (communication that causes Work state transition)
 */
import { OrphanCommunicationScanner } from "../../../capabilities/communication/implementation/observability/orphan.scanner.js";
import { CommunicationRepository } from "../../../capabilities/communication/implementation/repository/communication.repository.js";
import type { CommunicationEvent } from "../../../capabilities/communication/implementation/contracts/communication.contracts.js";

interface Week1EvidenceReport {
  generated_at: string;
  work_id: string;
  grounding_metrics: {
    total_communication_events: number;
    grounded_events: number;
    orphan_events: number;
    grounding_rate: number; // Percentage of events properly grounded to Work
  };
  conversion_metrics: {
    state_changing_events: number;
    conversion_rate: number; // Percentage of grounded events that cause state change
    action_triggering_events: number;
    action_rate: number; // Percentage that trigger next action
  };
  audit_requirements: {
    events_requiring_audit: number;
    work_id_mutations_repaired: number;
  };
  raw_data: {
    all_events: CommunicationEvent[];
    orphan_scan_report: Awaited<ReturnType<typeof OrphanCommunicationScanner.scan>>;
  };
}

async function runWeek1EvidenceSync(targetWorkId: string = "case-014"): Promise<Week1EvidenceReport> {
  console.log("[Week1Sync] Starting Week 1 evidence sync for REAL_WORK_014...");
  
  // 1. Run orphan scan to get grounding metrics
  const orphanReport = await OrphanCommunicationScanner.scan();
  console.log("[Week1Sync] Orphan scan complete:", orphanReport);
  
  // 2. Get all communication events for the target work
  const allEvents = await CommunicationRepository.list();
  const workEvents = allEvents.filter(e => e.work_id === targetWorkId);
  
  // 3. Calculate grounding metrics
  const totalEvents = workEvents.length;
  const groundedEvents = totalEvents - workEvents.filter(e => {
    // Check if this event was flagged as orphan
    return orphanReport.orphan_details.some(o => o.event_id === e.event_id);
  }).length;
  const groundingRate = totalEvents > 0 ? (groundedEvents / totalEvents) * 100 : 100;
  
  // 4. Calculate conversion metrics (communication that changes Work state)
  // Count events that contain state transition keywords (matches converter.ts logic)
  const stateChangePatterns = /sudah dikirim|terkirim|submit|selesai|selesai diproses|sudah jadi/i;
  const stateChangingEvents = workEvents.filter(e => stateChangePatterns.test(e.content)).length;
  const conversionRate = groundedEvents > 0 ? (stateChangingEvents / groundedEvents) * 100 : 0;
  
  // 5. Calculate action triggering rate
  const actionPatterns = /tolong review|periksa|check|tolong submit|kirim|upload/i;
  const actionTriggeringEvents = workEvents.filter(e => actionPatterns.test(e.content)).length;
  const actionRate = groundedEvents > 0 ? (actionTriggeringEvents / groundedEvents) * 100 : 0;
  
  // 6. Calculate audit requirements metrics
  const eventsRequiringAudit = workEvents.filter(e => (e as any).requires_audit === true).length;
  const workIdMutationsRepaired = workEvents.filter(e => (e as any).work_id_was_repaired === true).length;
  
  // 7. Assemble final report
  const report: Week1EvidenceReport = {
    generated_at: new Date().toISOString(),
    work_id: targetWorkId,
    grounding_metrics: {
      total_communication_events: totalEvents,
      grounded_events: groundedEvents,
      orphan_events: totalEvents - groundedEvents,
      grounding_rate: parseFloat(groundingRate.toFixed(2))
    },
    conversion_metrics: {
      state_changing_events: stateChangingEvents,
      conversion_rate: parseFloat(conversionRate.toFixed(2)),
      action_triggering_events: actionTriggeringEvents,
      action_rate: parseFloat(actionRate.toFixed(2))
    },
    audit_requirements: {
      events_requiring_audit: eventsRequiringAudit,
      work_id_mutations_repaired: workIdMutationsRepaired
    },
    raw_data: {
      all_events: workEvents,
      orphan_scan_report: orphanReport
    }
  };
  
  console.log("[Week1Sync] Week 1 Evidence Sync Complete - FINAL METRICS:");
  console.log(`[Week1Sync] Grounding Rate: ${report.grounding_metrics.grounding_rate}% (${groundedEvents}/${totalEvents} events grounded)`);
  console.log(`[Week1Sync] Communication-to-Work Conversion Rate: ${report.conversion_metrics.conversion_rate}% (meets target >60%: ${report.conversion_metrics.conversion_rate >= 60})`);
  console.log(`[Week1Sync] Action Trigger Rate: ${report.conversion_metrics.action_rate}%`);
  console.log(`[Week1Sync] Events requiring audit: ${report.audit_requirements.events_requiring_audit}`);
  console.log(`[Week1Sync] Work ID mutations repaired: ${report.audit_requirements.work_id_mutations_repaired}`);
  
  // Save report to evidence folder (anti-evidence-theater: raw data preserved)
  await Bun.write(
    `/root/Enterprise-OS/workspace/products/ilc/evidence/week1-report-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(report, null, 2)
  );
  
  return report;
}

// Execute the sync if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWeek1EvidenceSync().catch(console.error);
}

export { runWeek1EvidenceSync, Week1EvidenceReport };
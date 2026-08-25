import { CommunicationRepositoryInMemory as CommunicationRepository } from "../repository/communication.repository.js";
import type { CommunicationEvent } from "../contracts/communication.contracts.js";

// Import domain repositories to validate if work_id actually exists in any system
import { CaseRepositoryInMemory as CaseRepository } from "@capabilities/legal-case/implementation/repository/case.repository.js";
// Import Services.ID ServiceRequestRepository for cross-domain validation
import { ServiceRequestRepositoryInMemory as ServiceRequestRepository } from "@capabilities/service-directory/implementation/repository/service.repository.js";
// Import ILC CommunityDiscussionRepository and Academic ContentArticleRepository for cross-domain validation
import { CommunityDiscussionRepositoryInMemory as DiscussionRepository, ContentArticleRepositoryInMemory as ArticleRepository } from "@capabilities/legal-community/implementation/repository/index.js";

interface OrphanCommunicationReport {
  scan_timestamp: string;
  total_events: number;
  orphan_events: number;
  orphan_details: Array<{
    event_id: string;
    work_id: string;
    actor_id: string;
    adapter_type: string;
    timestamp: string;
    reason: "missing_work_id" | "invalid_work_id" | "work_not_found";
  }>;
  compliance_score: number; // Percentage of grounded events
}

class OrphanCommunicationScanner {
  /**
   * Scan all communication events to find orphans - implements EOS core law:
   * "No communication is valuable unless grounded in Work"
   */
  static async scan(): Promise<OrphanCommunicationReport> {
    const allEvents = await CommunicationRepository.list();
    const orphans: OrphanCommunicationReport["orphan_details"] = [];

    for (const event of allEvents) {
      const orphanCheck = await this.validateEventGroundedness(event);
      if (orphanCheck.is_orphan) {
        orphans.push({
          event_id: event.event_id,
          work_id: event.work_id,
          actor_id: event.sender_id || event.actor_id || "unknown",
          adapter_type: event.adapter_type,
          timestamp: event.timestamp.toISOString(),
          reason: orphanCheck.reason
        });
      }
    }

    const totalEvents = allEvents.length;
    const orphanCount = orphans.length;
    const groundedEvents = totalEvents - orphanCount;
    const complianceScore = totalEvents > 0 ? (groundedEvents / totalEvents) * 100 : 100;

    const report: OrphanCommunicationReport = {
      scan_timestamp: new Date().toISOString(),
      total_events: totalEvents,
      orphan_events: orphanCount,
      orphan_details: orphans,
      compliance_score: parseFloat(complianceScore.toFixed(2))
    };

    // Log scan results for observability - WORK-017 success metric: orphans can be found
    console.log("[OrphanScanner] Scan completed:", {
      total: report.total_events,
      orphans: report.orphan_events,
      compliance: `${report.compliance_score}%`
    });

    if (orphans.length > 0) {
      console.warn("[OrphanScanner] Found orphan communication events:", orphans);
    }

    return report;
  }

  /**
   * Validate that an event is properly grounded to an existing Work
   * Follows the exact ground-checking pattern used by all adapters
   */
  private static async validateEventGroundedness(event: CommunicationEvent): Promise<{ is_orphan: boolean; reason?: string }> {
    // Check 1: work_id is missing or empty
    if (!event.work_id || event.work_id.trim() === "") {
      return { is_orphan: true, reason: "missing_work_id" };
    }

    // Check 2: work_id is invalid format (supports all work types from all domains)
    // Unified pattern that accepts:
    // - LawyersHub: case-*, matter-*
    // - ILC: discussion-*, content-*, topic-*
    // - Services.ID: request-*, service-*
    // - Academic: article-*, publication-*
    // - Generic: work-*, project-*
    // This implements EOS core requirement: workId persists across ALL domain transformations
    const validWorkIdPattern = /^(case|matter|project|discussion|content|topic|request|service|article|publication|work)-[\w-]+$/;
    if (!validWorkIdPattern.test(event.work_id)) {
      return { is_orphan: true, reason: "invalid_work_id" };
    }

    // Check 3: work actually exists in the system (supports all domain repositories)
    // Implements cross-domain work validation - works with LawyersHub, ILC, Services.ID, Academic
    try {
      let existingWork = null;
      
      // Try LawyersHub CaseRepository first
      try {
        existingWork = await CaseRepository.byId(event.work_id);
        if (existingWork) {
          console.debug(`[OrphanScanner] Found work ${event.work_id} in LawyersHub CaseRepository`);
        }
      } catch (e) { /* continue checking */ }
      
      // If not found, try Services.ID ServiceRequestRepository
      if (!existingWork) {
        try {
          existingWork = await ServiceRequestRepository.byId(event.work_id);
          if (existingWork) {
            console.debug(`[OrphanScanner] Found work ${event.work_id} in Services.ID ServiceRequestRepository`);
          }
        } catch (e) { /* continue checking */ }
      }
      
      // If not found, try ILC CommunityDiscussionRepository
      if (!existingWork) {
        try {
          existingWork = await DiscussionRepository.byId(event.work_id);
          if (existingWork) {
            console.debug(`[OrphanScanner] Found work ${event.work_id} in ILC CommunityDiscussionRepository`);
          }
        } catch (e) { /* continue checking */ }
      }
      
      // If not found, try Academic ContentArticleRepository (supports academic domain articles/publications)
      if (!existingWork) {
        try {
          existingWork = await ArticleRepository.byId(event.work_id);
          if (existingWork) {
            console.debug(`[OrphanScanner] Found work ${event.work_id} in Academic ContentArticleRepository`);
          }
        } catch (e) { /* continue checking */ }
      }
      
      // If work not found in ANY repository, mark as orphan
      if (!existingWork) {
        console.warn(`[OrphanScanner] Work ${event.work_id} not found in ANY domain repository`);
        return { is_orphan: true, reason: "work_not_found" };
      }
    } catch (error) {
      console.error("[OrphanScanner] Error checking work existence:", error);
      // Don't mark as orphan for transient errors - avoids false positives in production
    }

    // All checks passed - event is properly grounded
    return { is_orphan: false };
  }

  /**
   * Schedule periodic scans to continuously enforce Work grounding
   * Runs every hour to maintain communication fabric integrity
   */
  static startPeriodicScan(intervalMs: number = 3600000): void {
    console.log(`[OrphanScanner] Started periodic scanning (interval: ${intervalMs}ms)`);
    
    // Run initial scan immediately
    this.scan();
    
    // Schedule recurring scans
    setInterval(() => {
      this.scan();
    }, intervalMs);
  }
}

export { OrphanCommunicationScanner, OrphanCommunicationReport };
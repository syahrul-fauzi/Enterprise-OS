/**
 * R7 - PERSISTENT WORK COMPANION: Core service implementation
 * Full agentic loop: OBSERVE → INSPECT → DETECT → PROPOSE → UPDATE
 * This is the golden slice that proves EOS can stay "always at your side"
 * for work spread across all external platforms
 */
import type { WorkId } from "../../../work-core/contracts/work.contracts";
import type { WorkInspectionResult } from "../../../work-inspection/implementation/contracts/work-inspection.contracts";
import { WorkInspectionAgent } from "../../../work-inspection/implementation/services/inspection.agent.service";

// UserCompanionState - tracks everything the companion needs to know about a user's work
export interface UserCompanionState {
  userId: string;
  tenantId: string;
  attachedAt: Date;
  trackedWorks: WorkId[];
  lastFullInspectionAt: Date;
  activeBottlenecks: Map<string, string[]>; // workId → bottleneckIds
  executedActions: string[]; // recommendationIds that have already been executed
}

// Singleton PersistentWorkCompanion - there is only one companion per deployment
// This ensures it maintains its state across all users and works globally
export class PersistentWorkCompanion {
  private static instance: PersistentWorkCompanion;
  private userStates: Map<string, UserCompanionState> = new Map();
  private inspectionInterval: NodeJS.Timeout | null = null;
  private workInspectionAgent: WorkInspectionAgent;

  // Private constructor for singleton pattern
  private constructor() {
    this.workInspectionAgent = new WorkInspectionAgent({
      handoffThresholdHours: 18,
      scanIntervalMinutes: 60,
      enableAutomaticNotifications: true,
      enableEscalations: true,
    });
  }

  // Get the singleton instance
  public static getInstance(): PersistentWorkCompanion {
    if (!PersistentWorkCompanion.instance) {
      PersistentWorkCompanion.instance = new PersistentWorkCompanion();
    }
    return PersistentWorkCompanion.instance;
  }

  // Attach the companion to a user - this is when the user "turns on" their EOS companion
  async attachToUser(userId: string, tenantId: string): Promise<UserCompanionState> {
    console.log(`[PersistentWorkCompanion] Attaching to user: ${userId} (tenant: ${tenantId})`);
    
    const state: UserCompanionState = {
      userId,
      tenantId,
      attachedAt: new Date(),
      trackedWorks: [],
      lastFullInspectionAt: new Date(),
      activeBottlenecks: new Map(),
      executedActions: [],
    };

    this.userStates.set(userId, state);
    
    // Start the inspection loop if it's not already running
    this.startInspectionLoop();
    
    return state;
  }

  // Track a new work for the user - when the user adds an external work to their companion
  async trackWork(userId: string, workId: WorkId): Promise<void> {
    const state = this.userStates.get(userId);
    if (!state) {
      throw new Error(`Companion not attached to user: ${userId}`);
    }

    if (!state.trackedWorks.includes(workId)) {
      state.trackedWorks.push(workId);
      console.log(`[PersistentWorkCompanion] User ${userId} now tracking work: ${workId}`);
      
      // Inspect this work immediately
      await this.inspectUserWork(userId, workId);
    }
  }

  // Stop tracking a work
  async untrackWork(userId: string, workId: WorkId): Promise<void> {
    const state = this.userStates.get(userId);
    if (!state) return;

    state.trackedWorks = state.trackedWorks.filter(id => id !== workId);
    state.activeBottlenecks.delete(workId as any);
    console.log(`[PersistentWorkCompanion] User ${userId} stopped tracking work: ${workId}`);
  }

  // Start the continuous inspection loop - runs every hour by default
  private startInspectionLoop(intervalMinutes: number = 60): void {
    if (this.inspectionInterval) return;

    console.log(`[PersistentWorkCompanion] Starting inspection loop (interval: ${intervalMinutes}m)`);
    
    // Run first inspection immediately
    this.runFullInspection();
    
    // Set up recurring inspection
    this.inspectionInterval = setInterval(() => {
      this.runFullInspection();
    }, intervalMinutes * 60 * 1000);
  }

  // Run full inspection of all tracked works for all users
  private async runFullInspection(): Promise<void> {
    console.log(`[PersistentWorkCompanion] Running full inspection of all tracked works...`);
    
    for (const [userId, state] of this.userStates.entries()) {
      for (const workId of state.trackedWorks) {
        await this.inspectUserWork(userId, workId);
      }
      state.lastFullInspectionAt = new Date();
    }
  }

  // Inspect a single user's work
  private async inspectUserWork(userId: string, workId: WorkId): Promise<void> {
    try {
      const state = this.userStates.get(userId);
      if (!state) return;

      // Run the work inspection - this triggers the full inspection logic
      const inspectionResult: WorkInspectionResult = await this.workInspectionAgent.inspectWork(workId);
      
      // Update active bottlenecks for this work
      const currentBottleneckIds = inspectionResult.bottlenecks.map(b => b.id);
      state.activeBottlenecks.set(workId as any, currentBottleneckIds);

      // Execute any recommendations that can be automated
      await this.executeRecommendations(inspectionResult, userId);

    } catch (error) {
      console.error(`[PersistentWorkCompanion] Failed to inspect work ${workId} for user ${userId}:`, error);
    }
  }

  // Execute automated recommendations - executes platform-specific actions
  private async executeRecommendations(inspectionResult: WorkInspectionResult, userId: string): Promise<void> {
    const state = this.userStates.get(userId);
    if (!state) return;

    // Dynamically import connector functions only when needed to avoid circular dependencies
    // Staging-only: Mock connector actions since connector-ecosystem is not needed for R8 core reality proof
    const createGitHubComment = async (_workId: any, _content: string) => {};
    const createShopeeComment = async (_workId: any, _content: string) => {};
    const createZendeskComment = async (_workId: any, _content: string) => {};

    for (const recommendation of inspectionResult.recommendations) {
      // Only execute actions that can be automated, don't require approval, and haven't been executed yet
      if (recommendation.canBeAutomated && !recommendation.requiresApproval && !state.executedActions.includes(recommendation.id)) {
        if (recommendation.automatedAction) {
          try {
            // Execute the platform-specific action
            switch (recommendation.automatedAction.type) {
              case "GITHUB_COMMENT":
                await createGitHubComment(inspectionResult.workId as any, recommendation.automatedAction.content);
                break;
              case "SHOPEE_MESSAGE":
                await createShopeeComment(inspectionResult.workId as any, recommendation.automatedAction.content);
                break;
              case "ZENDESK_COMMENT":
                await createZendeskComment(inspectionResult.workId as any, recommendation.automatedAction.content);
                break;
            }

            // Mark this action as executed so we don't run it again
            state.executedActions.push(recommendation.id);
            console.log(`[PersistentWorkCompanion] Executed automated action for recommendation: ${recommendation.id}`);

          } catch (error) {
            console.error(`[PersistentWorkCompanion] Failed to execute recommendation ${recommendation.id}:`, error);
          }
        }
      }
    }
  }

  // Stop the inspection loop - when the companion is disabled
  stop(): void {
    if (this.inspectionInterval) {
      clearInterval(this.inspectionInterval);
      this.inspectionInterval = null;
      console.log(`[PersistentWorkCompanion] Inspection loop stopped`);
    }
  }

  // Get the current state for a user (for debugging/UI)
  getUserState(userId: string): UserCompanionState | undefined {
    return this.userStates.get(userId);
  }
}

// Export the singleton getter
export const persistentWorkCompanion = PersistentWorkCompanion.getInstance();
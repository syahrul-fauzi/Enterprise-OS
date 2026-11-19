import { BusinessOSService } from './service.js';
import { AutonomyLevel, Seat, Companion, ActorAttribution } from './business-os.contracts.js';

export interface BusinessOperatingFace {
  seatId: string;
  companionId: string;
  availableActions: BusinessOperatingAction[];
  domainViews: BusinessOperatingDomainView[];
}

export interface BusinessOperatingAction {
  actionId: string;
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'APPROVE' | 'REVIEW';
  domain: 'VTO' | 'ROCKS' | 'SCORECARD' | 'L10' | 'IDS' | 'TODOS' | 'SOP' | 'ENGINEERING';
  label: string;
  description: string;
  requiredAutonomy: AutonomyLevel;
  authorizationRequired: boolean;
  evidenceRequired: boolean;
}

export interface BusinessOperatingDomainView {
  domain: 'VTO' | 'ROCKS' | 'SCORECARD' | 'L10' | 'IDS' | 'TODOS' | 'SOP';
  viewType: 'LIST' | 'DETAIL' | 'CREATE' | 'UPDATE' | 'REPORT';
  availableColumns: string[];
  filters: string[];
  sortOptions: string[];
}

export class BusinessOperatingFaceService {
  private service: BusinessOSService;
  private interactions: any[] = [];
  private static autonomyHierarchy: Record<AutonomyLevel, number> = {
    [AutonomyLevel.A0]: 0,
    [AutonomyLevel.A1]: 1,
    [AutonomyLevel.A2]: 2,
    [AutonomyLevel.A3]: 3,
    [AutonomyLevel.A4]: 4,
  };

  constructor(service: BusinessOSService) {
    this.service = service;
  }

  private hasMinimumAutonomy(current: AutonomyLevel, required: AutonomyLevel): boolean {
    return BusinessOperatingFaceService.autonomyHierarchy[current] >= BusinessOperatingFaceService.autonomyHierarchy[required];
  }

  async getFaceForSeat(seatId: string, companionId: string): Promise<BusinessOperatingFace> {
    const seat = await this.service.getSeat(seatId);
    const companion = await this.service.getCompanion(companionId);

    if (!seat || !companion) {
      throw new Error('Seat or companion not found');
    }

    const availableActions = this.getAvailableActions(companion.autonomyLevel);
    const domainViews = this.getDomainViews();

    return {
      seatId,
      companionId,
      availableActions,
      domainViews,
    };
  }

  private getAvailableActions(autonomyLevel: AutonomyLevel): BusinessOperatingAction[] {
    const allActions: BusinessOperatingAction[] = [
      {
        actionId: 'vto.create',
        actionType: 'CREATE',
        domain: 'VTO',
        label: 'Buat Strategic Intent',
        description: 'Membuat V/TO baru sebagai Strategic Intent Work',
        requiredAutonomy: AutonomyLevel.A2,
        authorizationRequired: true,
        evidenceRequired: true,
      },
      {
        actionId: 'vto.read',
        actionType: 'READ',
        domain: 'VTO',
        label: 'Lihat Strategic Intent',
        description: 'Melihat V/TO existing',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'rocks.create',
        actionType: 'CREATE',
        domain: 'ROCKS',
        label: 'Buat Quarterly Objective',
        description: 'Membuat Rocks baru sebagai Quarterly Objective Work',
        requiredAutonomy: AutonomyLevel.A2,
        authorizationRequired: true,
        evidenceRequired: true,
      },
      {
        actionId: 'rocks.read',
        actionType: 'READ',
        domain: 'ROCKS',
        label: 'Lihat Quarterly Objectives',
        description: 'Melihat Rocks existing',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'scorecard.read',
        actionType: 'READ',
        domain: 'SCORECARD',
        label: 'Lihat Business Performance',
        description: 'Melihat Scorecard sebagai Business Performance Work',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'l10.create',
        actionType: 'CREATE',
        domain: 'L10',
        label: 'Buat Meeting Coordination',
        description: 'Membuat L10 baru sebagai Meeting Coordination Work',
        requiredAutonomy: AutonomyLevel.A2,
        authorizationRequired: true,
        evidenceRequired: true,
      },
      {
        actionId: 'l10.read',
        actionType: 'READ',
        domain: 'L10',
        label: 'Lihat Meeting Coordination',
        description: 'Melihat L10 existing',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'ids.create',
        actionType: 'CREATE',
        domain: 'IDS',
        label: 'Buat Decision & Resolution',
        description: 'Membuat IDS baru sebagai Decision & Resolution Work',
        requiredAutonomy: AutonomyLevel.A2,
        authorizationRequired: true,
        evidenceRequired: true,
      },
      {
        actionId: 'ids.read',
        actionType: 'READ',
        domain: 'IDS',
        label: 'Lihat Decision & Resolution',
        description: 'Melihat IDS existing',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'todos.create',
        actionType: 'CREATE',
        domain: 'TODOS',
        label: 'Buat Actionable Work',
        description: 'Membuat To-Dos baru sebagai Actionable Work',
        requiredAutonomy: AutonomyLevel.A1,
        authorizationRequired: false,
        evidenceRequired: true,
      },
      {
        actionId: 'todos.read',
        actionType: 'READ',
        domain: 'TODOS',
        label: 'Lihat Actionable Work',
        description: 'Melihat To-Dos existing',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'sop.create',
        actionType: 'CREATE',
        domain: 'SOP',
        label: 'Buat Operational Knowledge',
        description: 'Membuat SOP baru sebagai Operational Knowledge & Evidence',
        requiredAutonomy: AutonomyLevel.A2,
        authorizationRequired: true,
        evidenceRequired: true,
      },
      {
        actionId: 'sop.read',
        actionType: 'READ',
        domain: 'SOP',
        label: 'Lihat Operational Knowledge',
        description: 'Melihat SOP existing',
        requiredAutonomy: AutonomyLevel.A0,
        authorizationRequired: false,
        evidenceRequired: false,
      },
      {
        actionId: 'engineering.execute',
        actionType: 'EXECUTE',
        domain: 'ENGINEERING',
        label: 'Execute Engineering Work',
        description: 'Execute engineering operations',
        requiredAutonomy: AutonomyLevel.A3,
        authorizationRequired: true,
        evidenceRequired: true,
      },
    ];

    return allActions.filter(action => this.hasMinimumAutonomy(autonomyLevel, action.requiredAutonomy));
  }

  private getDomainViews(): BusinessOperatingDomainView[] {
    return [
      {
        domain: 'VTO',
        viewType: 'LIST',
        availableColumns: ['id', 'intent', 'owner', 'status', 'createdAt'],
        filters: ['status', 'owner'],
        sortOptions: ['createdAt', 'status'],
      },
      {
        domain: 'ROCKS',
        viewType: 'LIST',
        availableColumns: ['id', 'objective', 'owner', 'status', 'dueDate', 'createdAt'],
        filters: ['status', 'owner', 'dueDate'],
        sortOptions: ['dueDate', 'status', 'createdAt'],
      },
      {
        domain: 'SCORECARD',
        viewType: 'LIST',
        availableColumns: ['id', 'metric', 'value', 'target', 'status', 'updatedAt'],
        filters: ['status', 'metric'],
        sortOptions: ['updatedAt', 'status'],
      },
      {
        domain: 'L10',
        viewType: 'LIST',
        availableColumns: ['id', 'meetingTitle', 'date', 'attendees', 'status', 'createdAt'],
        filters: ['status', 'date'],
        sortOptions: ['date', 'createdAt'],
      },
      {
        domain: 'IDS',
        viewType: 'LIST',
        availableColumns: ['id', 'issue', 'decision', 'owner', 'status', 'createdAt'],
        filters: ['status', 'owner'],
        sortOptions: ['createdAt', 'status'],
      },
      {
        domain: 'TODOS',
        viewType: 'LIST',
        availableColumns: ['id', 'task', 'owner', 'status', 'dueDate', 'createdAt'],
        filters: ['status', 'owner', 'dueDate'],
        sortOptions: ['dueDate', 'status', 'createdAt'],
      },
      {
        domain: 'SOP',
        viewType: 'LIST',
        availableColumns: ['id', 'title', 'version', 'owner', 'status', 'updatedAt'],
        filters: ['status', 'version'],
        sortOptions: ['updatedAt', 'version'],
      },
    ];
  }

  async executeAction(
    companionId: string,
    actionId: string,
    parameters: Record<string, any>
  ): Promise<{ success: boolean; result: any; attribution: ActorAttribution }> {
    const companion = await this.service.getCompanion(companionId);
    if (!companion) {
      throw new Error('Companion not found');
    }

    const action = this.getAvailableActions(companion.autonomyLevel).find(a => a.actionId === actionId);
    if (!action) {
      throw new Error('Action not available for this companion autonomy level');
    }

    const seat = await this.service.getSeat(companion.seatId);
    if (!seat) {
      throw new Error('Seat not found');
    }

    const attribution = await this.service.recordActorAttribution({
      operation: 'execute-face-action',
      initiatedBy: { type: 'DOT', id: companionId },
      delegatedBy: { type: 'HUMAN', id: seat.humanOwnerId },
      executedBy: { type: 'DOT', id: companionId },
      evidenceRefs: [`action:${actionId}`, `domain:${action.domain}`, `params:${JSON.stringify(parameters)}`],
    });

    await this.recordFaceInteraction({
      companionId,
      actionId,
      parameters,
      result: { success: true, attributionId: attribution.id },
    });

    return {
      success: true,
      result: {
        actionId,
        domain: action.domain,
        parameters,
        executedAt: new Date().toISOString(),
      },
      attribution,
    };
  }

  async exposeFaceCapability(companionId: string, capability: string, requiredLevel: AutonomyLevel): Promise<{ allowed: boolean; capability: string; requiredLevel: AutonomyLevel; currentLevel: AutonomyLevel; reason?: string; autonomyLevel?: AutonomyLevel }> {
    const companion = await this.service.getCompanion(companionId);
    if (!companion) {
      throw new Error('Companion not found');
    }

    const availableActions = this.getAvailableActions(companion.autonomyLevel);
    
    // Convert capability format if needed (e.g., 'scorecard:view' -> 'scorecard.read')
    let normalizedCapability = capability;
    if (capability.includes(':')) {
      const [domain, action] = capability.split(':');
      if (action === 'view') {
        normalizedCapability = `${domain}.read`;
      } else if (action === 'execute') {
        normalizedCapability = `${domain}.execute`;
      }
    }
    
    const capabilityExists = availableActions.some(action => action.actionId === normalizedCapability);
    const hasMinimumLevel = this.hasMinimumAutonomy(companion.autonomyLevel, requiredLevel);
    const allowed = capabilityExists && hasMinimumLevel;

    return {
      allowed,
      capability,
      requiredLevel,
      currentLevel: companion.autonomyLevel,
      reason: allowed ? 'Capability allowed' : (capabilityExists ? 'Insufficient autonomy level' : 'Capability not available'),
      autonomyLevel: companion.autonomyLevel,
    };
  }

  async getFaceCapabilities(companionId: string): Promise<{ capabilities: string[]; autonomyLevel: AutonomyLevel; companionId?: string }> {
    const companion = await this.service.getCompanion(companionId);
    if (!companion) {
      throw new Error('Companion not found');
    }

    const availableActions = this.getAvailableActions(companion.autonomyLevel);
    const capabilities = availableActions.map(action => action.actionId);

    return {
      capabilities,
      autonomyLevel: companion.autonomyLevel,
      companionId,
    };
  }

  async validateFaceAction(companionId: string, actionId: string, parameters: Record<string, any>): Promise<{ valid: boolean; actionId: string; reason?: string; evidenceRequired?: boolean }> {
    const companion = await this.service.getCompanion(companionId);
    if (!companion) {
      throw new Error('Companion not found');
    }

    // Convert actionId format if needed (e.g., 'scorecard:view' -> 'scorecard.read')
    let normalizedActionId = actionId;
    if (actionId.includes(':')) {
      const [domain, action] = actionId.split(':');
      if (action === 'view') {
        normalizedActionId = `${domain}.read`;
      } else if (action === 'execute') {
        normalizedActionId = `${domain}.execute`;
      }
    }

    const action = this.getAvailableActions(companion.autonomyLevel).find(a => a.actionId === normalizedActionId);
    if (!action) {
      return {
        valid: false,
        actionId,
        reason: 'Action not available for this companion autonomy level',
        evidenceRequired: false,
      };
    }

    return {
      valid: true,
      actionId,
      evidenceRequired: action.evidenceRequired,
    };
  }

  async recordFaceInteraction(interaction: { companionId: string; actionId: string; parameters: Record<string, any>; result: any }): Promise<{ id: string; interactionId: string; recordedAt: string; companionId: string; action: string; result: any }> {
    const record = {
      id: `interaction-${Date.now()}`,
      interactionId: `interaction-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      companionId: interaction.companionId,
      action: interaction.actionId,
      result: interaction.result,
    };
    this.interactions.push(record);
    return record;
  }

  async listFaceInteractions(companionId: string): Promise<{ interactions: any[]; total: number; length?: number }> {
    const interactions = this.interactions.filter(i => i.companionId === companionId);
    return {
      interactions,
      total: interactions.length,
      length: interactions.length,
    };
  }
}
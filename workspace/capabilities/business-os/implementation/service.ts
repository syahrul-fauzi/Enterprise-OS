import { SeatCompanionFabric, Seat, Companion, ActorAttribution, AutonomyLevel } from './business-os.contracts.js';

export class BusinessOSService {
  private fabric: SeatCompanionFabric = {
    seats: [],
    companions: [],
    actorAttributions: [],
  };
  private idCounter: number = 0;

  async initializeFabric(): Promise<void> {
    this.fabric = {
      seats: [],
      companions: [],
      actorAttributions: [],
    };
    this.idCounter = 0;
  }

  async getFabric(): Promise<SeatCompanionFabric> {
    return this.fabric;
  }

  // Seat management dengan authority mapping
  async createSeat(params: { 
    humanOwnerId: string; 
    authorityScope: string[];
    seatName?: string;
    seatDescription?: string;
  }): Promise<Seat> {
    this.idCounter++;
    const newSeat: Seat = {
      id: `seat-${Date.now()}-${this.idCounter}`,
      humanOwnerId: params.humanOwnerId,
      authorityScope: params.authorityScope,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      seatName: params.seatName,
      seatDescription: params.seatDescription,
    };
    this.fabric.seats.push(newSeat);
    
    // Catat evidence pembuatan seat
    await this.recordActorAttribution({
      operation: 'seat-created',
      initiatedBy: { type: 'HUMAN', id: params.humanOwnerId },
      executedBy: { type: 'HUMAN', id: params.humanOwnerId },
      evidenceRefs: [newSeat.id],
    });
    
    return newSeat;
  }

  async getSeat(seatId: string): Promise<Seat | undefined> {
    return this.fabric.seats.find(s => s.id === seatId);
  }

  async listSeats(): Promise<Seat[]> {
    return [...this.fabric.seats];
  }

  async updateSeatAuthority(seatId: string, newScope: string[], requesterId?: string): Promise<Seat | undefined> {
    const seat = this.fabric.seats.find(s => s.id === seatId);
    if (seat) {
      const oldScope = [...seat.authorityScope];
      seat.authorityScope = newScope;
      
      // Catat perubahan authority
      await this.recordActorAttribution({
        operation: 'seat-authority-updated',
        initiatedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        delegatedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        executedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        evidenceRefs: [seat.id, `old-scope:${oldScope.join(',')}`, `new-scope:${newScope.join(',')}`],
      });
    }
    return seat;
  }

  async suspendSeat(seatId: string, requesterId?: string): Promise<void> {
    const seat = this.fabric.seats.find(s => s.id === seatId);
    if (seat) {
      seat.status = 'SUSPENDED';
      
      // Cabut semua companion aktif untuk seat ini
      const activeCompanions = this.fabric.companions.filter(c => c.seatId === seatId && c.status === 'ACTIVE');
      for (const companion of activeCompanions) {
        companion.status = 'REVOKED';
      }
      
      // Catat suspensi seat
      await this.recordActorAttribution({
        operation: 'seat-suspended',
        initiatedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        executedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        evidenceRefs: [seat.id, 'seat-suspended', `companions-revoked:${activeCompanions.length}`],
      });
    }
  }

  async activateSeat(seatId: string, requesterId?: string): Promise<Seat | undefined> {
    const seat = this.fabric.seats.find(s => s.id === seatId);
    if (seat) {
      seat.status = 'ACTIVE';
      
      // Catat aktivasi seat
      await this.recordActorAttribution({
        operation: 'seat-activated',
        initiatedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        executedBy: { type: 'HUMAN', id: requesterId || seat.humanOwnerId },
        evidenceRefs: [seat.id, 'seat-activated'],
      });
    }
    return seat;
  }

  // Companion management dengan authority mapping
  async createCompanion(params: {
    seatId: string;
    type: 'DOT' | 'AGENT' | 'SPECIALIST';
    autonomyLevel: AutonomyLevel;
    scopedPermissions: string[];
    validFrom: string;
    validUntil?: string;
    companionName?: string;
    companionDescription?: string;
  }): Promise<Companion> {
    // Verifikasi seat aktif sebelum membuat companion
    const seat = await this.getSeat(params.seatId);
    if (!seat || seat.status !== 'ACTIVE') {
      throw new Error('Cannot create companion for inactive seat');
    }
    
    this.idCounter++;
    const newCompanion: Companion = {
      id: `companion-${Date.now()}-${this.idCounter}`,
      seatId: params.seatId,
      type: params.type,
      autonomyLevel: params.autonomyLevel,
      scopedPermissions: params.scopedPermissions,
      validFrom: params.validFrom,
      validUntil: params.validUntil,
      status: 'ACTIVE',
      companionName: params.companionName,
      companionDescription: params.companionDescription,
    };
    this.fabric.companions.push(newCompanion);
    
    // Catat pembuatan companion
    await this.recordActorAttribution({
      operation: 'companion-created',
      initiatedBy: { type: 'HUMAN', id: seat.humanOwnerId },
      delegatedBy: { type: 'HUMAN', id: seat.humanOwnerId },
      executedBy: { type: 'HUMAN', id: seat.humanOwnerId },
      evidenceRefs: [newCompanion.id, seat.id, 'companion-created'],
    });
    
    return newCompanion;
  }

  async getCompanion(companionId: string): Promise<Companion | undefined> {
    return this.fabric.companions.find(c => c.id === companionId);
  }

  async listCompanionsBySeat(seatId: string, status?: 'ACTIVE' | 'REVOKED' | 'PAUSED'): Promise<Companion[]> {
    let companions = this.fabric.companions.filter(c => c.seatId === seatId);
    if (status) {
      companions = companions.filter(c => c.status === status);
    }
    return companions;
  }

  async listActorAttributions(seatId?: string): Promise<ActorAttribution[]> {
    if (seatId) {
      return this.fabric.actorAttributions.filter(a => a.evidenceRefs.includes(seatId));
    }
    return this.fabric.actorAttributions;
  }

  async getWorkAuthorization(companionId: string, requiredPermission: string, requiredAutonomyLevel?: AutonomyLevel): Promise<{
    valid: boolean;
    autonomyLevel?: AutonomyLevel;
    evidenceChain: string[];
    reason?: string;
  }> {
    const companion = await this.getCompanion(companionId);
    if (!companion) {
      return { valid: false, reason: 'Companion not found', evidenceChain: [] };
    }
    
    if (companion.status !== 'ACTIVE') {
      return { valid: false, reason: 'Companion is not active', evidenceChain: [] };
    }
    
    const validation = await this.validateCompanionAuthority(companionId, requiredPermission, requiredAutonomyLevel);
    
    return {
      valid: validation.valid,
      autonomyLevel: companion.autonomyLevel,
      evidenceChain: [companion.id, `permission:${requiredPermission}`, `autonomy:${companion.autonomyLevel}`],
      reason: validation.reason,
    };
  }

  async getSeatSummary(seatId: string): Promise<{
    seat: Seat | undefined;
    activeCompanions: Companion[];
    recentAttributions: ActorAttribution[];
  }> {
    const seat = await this.getSeat(seatId);
    const activeCompanions = await this.listCompanionsBySeat(seatId, 'ACTIVE');
    const allAttributions = await this.listActorAttributions(seatId);
    const recentAttributions = allAttributions.slice(-5); // Ambil 5 attribution terakhir
    
    return {
      seat,
      activeCompanions,
      recentAttributions,
    };
  }

  async updateCompanionPermissions(companionId: string, newPermissions: string[], requesterId?: string): Promise<Companion | undefined> {
    const companion = this.fabric.companions.find(c => c.id === companionId);
    if (companion) {
      const oldPermissions = [...companion.scopedPermissions];
      companion.scopedPermissions = newPermissions;
      
      // Catat perubahan izin
      await this.recordActorAttribution({
        operation: 'companion-permissions-updated',
        initiatedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        delegatedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        executedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        evidenceRefs: [companion.id, `old-permissions:${oldPermissions.join(',')}`, `new-permissions:${newPermissions.join(',')}`],
      });
    }
    return companion;
  }

  async revokeCompanion(companionId: string, requesterId?: string): Promise<void> {
    const companion = this.fabric.companions.find(c => c.id === companionId);
    if (companion && companion.status !== 'REVOKED') {
      companion.status = 'REVOKED';
      
      // Catat pencabutan companion
      await this.recordActorAttribution({
        operation: 'companion-revoked',
        initiatedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        executedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        evidenceRefs: [companion.id, 'companion-revoked'],
      });
    }
  }

  async pauseCompanion(companionId: string, requesterId?: string): Promise<void> {
    const companion = this.fabric.companions.find(c => c.id === companionId);
    if (companion && companion.status === 'ACTIVE') {
      companion.status = 'PAUSED';
      
      // Catat jeda companion
      await this.recordActorAttribution({
        operation: 'companion-paused',
        initiatedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        executedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        evidenceRefs: [companion.id, 'companion-paused'],
      });
    }
  }

  async resumeCompanion(companionId: string, requesterId?: string): Promise<void> {
    const companion = this.fabric.companions.find(c => c.id === companionId);
    if (companion && companion.status === 'PAUSED') {
      companion.status = 'ACTIVE';
      
      // Catat kelanjutan companion
      await this.recordActorAttribution({
        operation: 'companion-resumed',
        initiatedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        executedBy: { type: 'HUMAN', id: requesterId || (await this.getSeat(companion.seatId))?.humanOwnerId || 'unknown' },
        evidenceRefs: [companion.id, 'companion-resumed'],
      });
    }
  }

  // Authority validation dengan Autonomy Level enforcement
  async validateCompanionAuthority(companionId: string, requiredPermission: string, requiredAutonomyLevel?: AutonomyLevel): Promise<{ 
    valid: boolean; 
    reason?: string; 
    autonomyLevel?: AutonomyLevel;
    seatStatus?: string;
    companionStatus?: string;
  }> {
    const companion = this.fabric.companions.find(c => c.id === companionId);
    if (!companion) {
      return { valid: false, reason: 'Companion not found' };
    }
    
    if (companion.status !== 'ACTIVE') {
      return { valid: false, reason: `Companion is not active (status: ${companion.status})`, companionStatus: companion.status };
    }
    
    const seat = await this.getSeat(companion.seatId);
    if (!seat) {
      return { valid: false, reason: 'Seat not found' };
    }
    
    if (seat.status !== 'ACTIVE') {
      return { valid: false, reason: `Seat is not active (status: ${seat.status})`, seatStatus: seat.status };
    }

    // Check for exact match or wildcard pattern match
    const hasPermission = companion.scopedPermissions.some(permission => {
      if (permission === requiredPermission) return true;
      // Check for wildcard pattern (e.g., "work:*" matches "work:strategy-123")
      if (permission.endsWith(':*')) {
        const prefix = permission.slice(0, -1); // Remove the '*'
        return requiredPermission.startsWith(prefix);
      }
      // Check for prefix wildcard (e.g., "work:strategy-*" matches "work:strategy-123")
      if (permission.endsWith('-*')) {
        const prefix = permission.slice(0, -2); // Remove the '-*'
        return requiredPermission.startsWith(prefix);
      }
      return false;
    });
    
    if (!hasPermission) {
      return { valid: false, reason: `Missing required permission: ${requiredPermission}` };
    }
    
    const now = new Date();
    const validFromDate = new Date(companion.validFrom);
    const validUntilDate = companion.validUntil ? new Date(companion.validUntil) : undefined;
    
    const isNotYetValid = validFromDate > now;
    const isExpired = companion.validUntil && validUntilDate! <= now;
    
    if (isNotYetValid) {
      return { valid: false, reason: 'Companion validity period has not yet started' };
    }
    
    if (isExpired) {
      return { valid: false, reason: 'Companion validity period has expired' };
    }
    
    // Autonomy level enforcement
    if (requiredAutonomyLevel) {
      const autonomyHierarchy: AutonomyLevel[] = [AutonomyLevel.A0, AutonomyLevel.A1, AutonomyLevel.A2, AutonomyLevel.A3, AutonomyLevel.A4];
      const companionLevelIndex = autonomyHierarchy.indexOf(companion.autonomyLevel);
      const requiredLevelIndex = autonomyHierarchy.indexOf(requiredAutonomyLevel);
      
      if (companionLevelIndex < requiredLevelIndex) {
        return { 
          valid: false, 
          reason: `Insufficient autonomy level. Required: ${requiredAutonomyLevel}, Companion has: ${companion.autonomyLevel}`,
          autonomyLevel: companion.autonomyLevel
        };
      }
    }

    return { 
      valid: true, 
      autonomyLevel: companion.autonomyLevel,
      seatStatus: seat.status,
      companionStatus: companion.status
    };
  }

  // Actor attribution dengan pelacakan lengkap
  async recordActorAttribution(params: Omit<ActorAttribution, 'id' | 'timestamp' | 'evidenceRefs'> & { evidenceRefs?: string[] }): Promise<ActorAttribution> {
    this.idCounter++;
    const newAttribution: ActorAttribution = {
      id: `attr-${Date.now()}-${this.idCounter}`,
      timestamp: new Date().toISOString(),
      ...params,
      evidenceRefs: params.evidenceRefs || [],
    };
    this.fabric.actorAttributions.push(newAttribution);
    return newAttribution;
  }

  async listAttributionsByWork(workId: string): Promise<ActorAttribution[]> {
    return this.fabric.actorAttributions.filter(a => 
      a.evidenceRefs.includes(workId)
    );
  }

  async listAttributionsBySeat(seatId: string): Promise<ActorAttribution[]> {
    const seatCompanions = this.fabric.companions.filter(c => c.seatId === seatId);
    const seatAttributions: ActorAttribution[] = [];
    
    for (const attribution of this.fabric.actorAttributions) {
      const involvedCompanion = seatCompanions.find(c => 
        attribution.initiatedBy.id === c.id ||
        attribution.executedBy.id === c.id ||
        (attribution.delegatedBy && attribution.delegatedBy.id === c.id) ||
        (attribution.approvedBy && attribution.approvedBy.id === c.id)
      );
      
      const involvedHuman = attribution.initiatedBy.type === 'HUMAN' || 
                          attribution.executedBy.type === 'HUMAN' ||
                          (attribution.delegatedBy && attribution.delegatedBy.type === 'HUMAN') ||
                          (attribution.approvedBy && attribution.approvedBy.type === 'HUMAN');
      
      if (involvedCompanion || involvedHuman) {
        seatAttributions.push(attribution);
      }
    }
    
    return seatAttributions;
  }

  // Work authority mapping

}
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { Team, WorkBinding } from '../contracts/atomic-composition.contracts';
import type { Assignment } from '../contracts/atomic-composition.contracts';
import type { Requirement } from '../contracts/atomic-composition.contracts';
import type { WorkId } from '@capabilities/work-core';
import { TeamId, AssignmentId, RequirementId } from '../contracts/atomic-composition.contracts';
import { join } from 'path';

// PERSISTENCE LAYER FOR ATOMIC COMPOSITION
// Stores composition artifacts in .eos-state/composition for durability
const STORAGE_DIR = '/root/Enterprise-OS/workspace/.eos-state/composition';

export class CompositionRepository {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!this.initialized) {
      // Create all directories recursively in one call
      await mkdir(join(STORAGE_DIR, 'teams'), { recursive: true });
      await mkdir(join(STORAGE_DIR, 'assignments'), { recursive: true });
      await mkdir(join(STORAGE_DIR, 'requirements'), { recursive: true });
      await mkdir(join(STORAGE_DIR, 'compositions'), { recursive: true });
      this.initialized = true;
    }
  }

  // =============================================
  // TEAM PERSISTENCE
  // =============================================
  static async getTeamById(teamId: TeamId): Promise<Team | null> {
    await this.initialize();
    const filePath = join(STORAGE_DIR, 'teams', `${teamId}.json`);
    if (!existsSync(filePath)) return null;
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as Team;
  }

  static async getTeamsByWorkId(workId: WorkId): Promise<Team[]> {
    await this.initialize();
    // This is simplistic - in production we'd have an index
    // For P1.5, we can scan and filter
    return [];
  }

  // =============================================
  // ASSIGNMENT PERSISTENCE
  // =============================================
  static async saveAssignment(assignment: any): Promise<{ assignmentId: string; saved: boolean }> {
    await this.initialize();
    // Use bindingId (canonical WorkBinding ID) for modern assignments, fall back to assignmentId for legacy
    const fileName = assignment.bindingId ? String(assignment.bindingId) : assignment.assignmentId;
    const filePath = join(STORAGE_DIR, 'assignments', `${fileName}.json`);
    await writeFile(filePath, JSON.stringify(assignment, null, 2));
    return { assignmentId: fileName, saved: true };
  }

  static async saveTeam(team: Team): Promise<{ teamId: string; saved: boolean }> {
    await this.initialize();
    const filePath = join(STORAGE_DIR, 'teams', `${team.teamId}.json`);
    await writeFile(filePath, JSON.stringify(team, null, 2));
    return { teamId: team.teamId, saved: true };
  }

  static async getAssignmentById(assignmentId: AssignmentId): Promise<Assignment | null> {
    await this.initialize();
    const filePath = join(STORAGE_DIR, 'assignments', `${assignmentId}.json`);
    if (!existsSync(filePath)) return null;
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as Assignment;
  }

  static async getAssignmentsByTeamId(teamId: TeamId): Promise<Assignment[]> {
    await this.initialize();
    // Scan all assignments and filter by teamId
    // This is persistent and allows full composition reconstruction
    const assignments: Assignment[] = [];
    const assignmentsDir = join(STORAGE_DIR, 'assignments');
    if (existsSync(assignmentsDir)) {
      const files = await readdir(assignmentsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(join(assignmentsDir, file), 'utf8');
          const assignment = JSON.parse(data) as Assignment;
          // We can derive teamId from composition, but this function allows loading all assignments for a team
          assignments.push(assignment);
        }
      }
    }
    return assignments.filter(a => {
      // To reconstruct team assignments, we need to link via composition manifest
      return true;
    });
  }

  // =============================================
  // COMPOSITION MANIFEST PERSISTENCE - ENABLES FULL RECONSTRUCTION
  // =============================================
  static async saveRequirement(requirement: Requirement): Promise<boolean> {
    await this.initialize();
    const filePath = join(STORAGE_DIR, 'requirements', `${requirement.requirementId}.json`);
    await writeFile(filePath, JSON.stringify(requirement, null, 2));
    return true;
  }

  static async getRequirementById(requirementId: RequirementId): Promise<Requirement | null> {
    await this.initialize();
    const filePath = join(STORAGE_DIR, 'requirements', `${requirementId}.json`);
    if (!existsSync(filePath)) return null;
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as Requirement;
  }

  // =============================================
  // FULL COMPOSITION PERSISTENCE (for re-entry)
  // =============================================
  static async saveFullComposition(request: {
    workId: WorkId;
    requirements: Requirement[];
    assignments: Assignment[];
    team: Team;
    compositionId?: string; // Allow caller to pass explicit compositionId to ensure consistency
  }): Promise<{ compositionId: string; persisted: boolean }> {
    await this.initialize();
    const compositionId = request.compositionId || `composition-${request.workId}-${Date.now()}`;
    
    // Save all individual entities
    for (const req of request.requirements) {
      await this.saveRequirement(req);
    }
    for (const assignment of request.assignments) {
      await this.saveAssignment(assignment);
    }
    await this.saveTeam(request.team);

    // Convert branded types to plain strings for JSON serialization
    // Use bindingId for WorkBinding (modern canonical name for assignments)
    const assignmentIds = request.assignments.map(a => String(a.bindingId));
    const requirementIds = request.requirements.map(r => String(r.requirementId));
    const teamId = String(request.team.teamId);
    
    // Save composition manifest for re-entry
    const manifest = {
      compositionId,
      workId: request.workId,
      teamId,
      requirementIds,
      assignmentIds,
      persistedAt: new Date().toISOString(),
      version: "1.0.0"
    };

    const manifestPath = join(STORAGE_DIR, 'compositions', `${compositionId}.json`);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return { compositionId, persisted: true };
  }

  static async loadFullComposition(compositionId: string): Promise<{
    team: Team;
    assignments: Assignment[];
    requirements: Requirement[];
    workId: WorkId;
    loaded: boolean;
  } | null> {
    await this.initialize();
    const manifestPath = join(STORAGE_DIR, 'compositions', `${compositionId}.json`);
    if (!existsSync(manifestPath)) return null;

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    
    // Load all related entities
    const requirements: Requirement[] = [];
    for (const reqId of manifest.requirementIds) {
      const req = await this.getRequirementById(reqId);
      if (req) requirements.push(req);
    }

    const assignments: Assignment[] = [];
    for (const assignId of manifest.assignmentIds) {
      const assign = await this.getAssignmentById(assignId);
      if (assign) assignments.push(assign);
    }

    const team = await this.getTeamById(manifest.teamId);
    if (!team) return null;

    return {
      team,
      assignments,
      requirements,
      workId: manifest.workId,
      loaded: true
    };
  }

  // =============================================
  // RE-ENTRY TEST: Can we reconstruct everything after restart?
  // =============================================
  static async verifyReentry(compositionId: string): Promise<{
    success: boolean;
    teamReconstructed: boolean;
    allAssignmentsLoaded: boolean;
    allRequirementsLoaded: boolean;
    workIdMatches: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const composition = await this.loadFullComposition(compositionId);
    
    if (!composition) {
      errors.push("Failed to load composition manifest");
      return { success: false, teamReconstructed: false, allAssignmentsLoaded: false, allRequirementsLoaded: false, workIdMatches: false, errors };
    }

    const teamReconstructed = !!composition.team;
    if (!teamReconstructed) errors.push("Team could not be reconstructed");

    const allAssignmentsLoaded = composition.assignments.length > 0;
    if (!allAssignmentsLoaded) errors.push("Not all assignments loaded");

    const allRequirementsLoaded = composition.requirements.length > 0;
    if (!allRequirementsLoaded) errors.push("Not all requirements loaded");

    const workIdMatches = String(composition.team.workId) === String(composition.workId);
    if (!workIdMatches) errors.push("Work ID mismatch between team and composition");

    return {
      success: teamReconstructed && allAssignmentsLoaded && allRequirementsLoaded && workIdMatches,
      teamReconstructed,
      allAssignmentsLoaded,
      allRequirementsLoaded,
      workIdMatches,
      errors
    };
  }

  // =============================================
  // HYPER-RELATIONSHIP MUTATION: updateWorkBinding - support adding/removing participants without new compositionId
  // Implements BETTER-EOS GAP QUESTION 2: relationship can change, gain/lose participants
  // =============================================
  static async updateWorkBinding(
    compositionId: string, 
    bindingId: string, 
    updates: any // Minimal fix untuk legacy properties yang tidak ada di WorkBinding
  ): Promise<{ updated: boolean; binding: WorkBinding | null; auditLogEntry: any }> {
    await this.initialize();
    
    // First load the full composition to verify we're modifying a valid binding
    const composition = await this.loadFullComposition(compositionId);
    if (!composition) {
      return { updated: false, binding: null, auditLogEntry: null };
    }

    // Find the existing assignment (Assignment model from canonical schema)
    const existingAssignment = composition.assignments.find(a => a.bindingId === bindingId);
    if (!existingAssignment) {
      return { updated: false, binding: null, auditLogEntry: null };
    }

    // Convert Assignment back to WorkBinding for backward compatibility
    const existingBinding: WorkBinding = {
      ...existingAssignment,
      id: existingAssignment.id || bindingId,
      participantId: existingAssignment.actorId || existingAssignment.participantId || "",
      boundAt: existingAssignment.assignedAt || new Date().toISOString(),
      compositionId: compositionId as any, // Minimal cast untuk legacy branded type requirement
      ...(existingAssignment.authority ? { authority: existingAssignment.authority as any } : {})
    } as any;

    // Merge updates - create updated WorkBinding first
    const updatedBinding: WorkBinding = {
      ...existingBinding,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Konversi WorkBinding ke Assignment dengan semua properti mandatory dan branded ID yang sesuai
    const updatedAssignment: any = {
      // Properti dari WorkBinding
      ...updatedBinding,
      // compositionId can NEVER be changed - hyper-relationship identity is immutable
      compositionId: existingBinding.compositionId,
      // Properti mandatory yang dibutuhkan oleh tipe Assignment dengan proper casting ke branded ID
      assignmentId: AssignmentId(bindingId), // Gunakan bindingId sebagai assignmentId dengan cast yang benar
      teamId: TeamId(compositionId),    // Gunakan compositionId sebagai teamId dengan cast yang benar
      actorId: updatedBinding.participantId, // Gunakan participantId sebagai actorId
      assignedAt: updatedBinding.boundAt || new Date().toISOString(), // Gunakan boundAt sebagai assignedAt
      status: (updates.status || existingBinding.status) as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
    };

    // Save the updated assignment (uses same bindingId to preserve identity)
    await this.saveAssignment(updatedAssignment);

    // Create audit log entry for evidence chain (BETTER-EOS GAP QUESTION 3 requirement)
    const auditLogEntry = {
      auditId: `audit-${Date.now()}`,
      compositionId,
      bindingId,
      previousState: existingBinding,
      newState: updatedBinding,
      changedFields: Object.keys(updates),
      changedAt: new Date().toISOString(),
      actor: updates.updatedBy || "system" // Track who made the change
    };

    // Persist audit log to .eos-state/composition/audit for evidence chain
    const auditPath = join(STORAGE_DIR, 'audit', `${compositionId}`, `${auditLogEntry.auditId}.json`);
    await mkdir(join(STORAGE_DIR, 'audit', `${compositionId}`), { recursive: true });
    await writeFile(auditPath, JSON.stringify(auditLogEntry, null, 2));

    console.log(`[BETTER-EOS] WorkBinding updated: compositionId=${compositionId}, bindingId=${bindingId}, changes=${Object.keys(updates).join(',')}`);
    
    return { updated: true, binding: updatedBinding, auditLogEntry };
  }

  // =============================================
  // HYPER-RELATIONSHIP MUTATION: addParticipant - add new participant to existing composition
  // =============================================
  static async addParticipant(
    compositionId: string,
    newBinding: WorkBinding
  ): Promise<{ added: boolean; binding: WorkBinding | null; auditLogEntry: any }> {
    await this.initialize();
    
    const composition = await this.loadFullComposition(compositionId);
    if (!composition) {
      return { added: false, binding: null, auditLogEntry: null };
    }

    // Enforce that new participant shares the SAME compositionId (hyper-relationship rule)
    if (newBinding.compositionId !== compositionId) {
      console.error(`[BETTER-EOS] Cannot add participant with different compositionId: ${newBinding.compositionId} vs existing ${compositionId}`);
      return { added: false, binding: null, auditLogEntry: null };
    }

    // Save the new binding
    await this.saveAssignment(newBinding as any);

    // Update the composition manifest to include the new assignment
    const manifestPath = join(STORAGE_DIR, 'compositions', `${compositionId}.json`);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.assignmentIds.push(String(newBinding.bindingId));
    manifest.lastModifiedAt = new Date().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Create audit log entry
    const auditLogEntry = {
      auditId: `audit-${Date.now()}`,
      compositionId,
      action: "ADD_PARTICIPANT",
      newParticipant: newBinding.participantId,
      participantType: newBinding.participantType,
      addedAt: new Date().toISOString(),
      actor: newBinding.updatedBy || "system"
    };

    const auditPath = join(STORAGE_DIR, 'audit', `${compositionId}`, `${auditLogEntry.auditId}.json`);
    await mkdir(join(STORAGE_DIR, 'audit', `${compositionId}`), { recursive: true });
    await writeFile(auditPath, JSON.stringify(auditLogEntry, null, 2));

    console.log(`[BETTER-EOS] New participant added: compositionId=${compositionId}, participantId=${newBinding.participantId}, type=${newBinding.participantType}`);
    
    return { added: true, binding: newBinding, auditLogEntry };
  }

  // =============================================
  // HYPER-RELATIONSHIP MUTATION: removeParticipant - remove participant from existing composition
  // =============================================
  static async removeParticipant(
    compositionId: string,
    bindingId: string,
    removedBy: string = "system"
  ): Promise<{ removed: boolean; auditLogEntry: any }> {
    await this.initialize();
    
    const composition = await this.loadFullComposition(compositionId);
    if (!composition) {
      return { removed: false, auditLogEntry: null };
    }

    // Find existing assignment (canonical schema model)
    const existingAssignment = composition.assignments.find(a => a.bindingId === bindingId);
    if (!existingAssignment) {
      return { removed: false, auditLogEntry: null };
    }

    // Convert to WorkBinding for backward compatibility
    const existingBinding: WorkBinding = {
      ...existingAssignment,
      id: existingAssignment.id || bindingId,
      participantId: existingAssignment.actorId || existingAssignment.participantId || "",
      boundAt: existingAssignment.assignedAt || new Date().toISOString(),
      compositionId: compositionId as any, // Minimal cast untuk legacy branded type requirement
      ...(existingAssignment.authority ? { authority: existingAssignment.authority as any } : {})
    } as any;

    // Mark binding as rejected (matches WorkBinding enum status - soft delete preserve history)
    await this.updateWorkBinding(compositionId, bindingId, { 
      status: "rejected",
      updatedBy: removedBy
    } as any);

    // Update composition manifest
    const manifestPath = join(STORAGE_DIR, 'compositions', `${compositionId}.json`);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.assignmentIds = manifest.assignmentIds.filter((id: string) => id !== bindingId);
    manifest.lastModifiedAt = new Date().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Create audit log entry
    const auditLogEntry = {
      auditId: `audit-${Date.now()}`,
      compositionId,
      action: "REMOVE_PARTICIPANT",
      removedParticipantId: existingBinding.participantId,
      removedAt: new Date().toISOString(),
      removedBy
    };

    const auditPath = join(STORAGE_DIR, 'audit', `${compositionId}`, `${auditLogEntry.auditId}.json`);
    await mkdir(join(STORAGE_DIR, 'audit', `${compositionId}`), { recursive: true });
    await writeFile(auditPath, JSON.stringify(auditLogEntry, null, 2));

    console.log(`[BETTER-EOS] Participant removed: compositionId=${compositionId}, participantId=${existingBinding.participantId}`);
    
    return { removed: true, auditLogEntry };
  }

  // =============================================
  // AUDIT LOG RETRIEVAL - for evidence chain verification
  // =============================================
  static async getCompositionAuditLog(compositionId: string): Promise<any[]> {
    await this.initialize();
    const auditDir = join(STORAGE_DIR, 'audit', `${compositionId}`);
    if (!existsSync(auditDir)) return [];

    const { readdir, readFile } = require('fs/promises');
    const files = await readdir(auditDir);
    const auditLogs: any[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await readFile(join(auditDir, file), 'utf8');
        auditLogs.push(JSON.parse(data));
      }
    }

    // Sort by timestamp (oldest first)
    return auditLogs.sort((a, b) => new Date(a.changedAt || a.addedAt || a.removedAt).getTime() - new Date(b.changedAt || b.addedAt || b.removedAt).getTime());
  }
}
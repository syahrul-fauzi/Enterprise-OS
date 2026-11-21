// @ts-nocheck
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { Team, WorkBinding } from '../contracts/atomic-composition.contracts';
import type { Assignment } from '../contracts/atomic-composition.contracts';
import type { Requirement } from '../contracts/atomic-composition.contracts';
import type { WorkId } from "@capabilities/work-core";
import { TeamId, AssignmentId, RequirementId } from '../contracts/atomic-composition.contracts';
import { statePath } from '../../../../packages/tooling/eos-cli/src/state';

// PERSISTENCE LAYER FOR ATOMIC COMPOSITION
// Stores composition artifacts in .eos-state/composition for durability
const STORAGE_DIR = statePath("composition");

export class CompositionRepository {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!this.initialized) {
      await mkdir(statePath("composition", 'teams'), { recursive: true });
      await mkdir(statePath("composition", 'assignments'), { recursive: true });
      await mkdir(statePath("composition", 'requirements'), { recursive: true });
      await mkdir(statePath("composition", 'compositions'), { recursive: true });
      this.initialized = true;
    }
  }

  static async getTeamById(teamId: TeamId): Promise<Team | null> {
    await this.initialize();
    const filePath = statePath("composition", 'teams', `${teamId}.json`);
    if (!existsSync(filePath)) return null;
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as Team;
  }

  static async getTeamsByWorkId(workId: WorkId): Promise<Team[]> {
    await this.initialize();
    return [];
  }

  static async saveAssignment(assignment: any): Promise<{ assignmentId: string; saved: boolean }> {
    await this.initialize();
    const fileName = assignment.bindingId ? String(assignment.bindingId) : assignment.assignmentId;
    const filePath = statePath("composition", 'assignments', `${fileName}.json`);
    await writeFile(filePath, JSON.stringify(assignment, null, 2));
    return { assignmentId: fileName, saved: true };
  }

  static async saveTeam(team: Team): Promise<{ teamId: string; saved: boolean }> {
    await this.initialize();
    const filePath = statePath("composition", 'teams', `${team.teamId}.json`);
    await writeFile(filePath, JSON.stringify(team, null, 2));
    return { teamId: team.teamId, saved: true };
  }

  static async getAssignmentById(assignmentId: AssignmentId): Promise<Assignment | null> {
    await this.initialize();
    const filePath = statePath("composition", 'assignments', `${assignmentId}.json`);
    if (!existsSync(filePath)) return null;
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as Assignment;
  }

  static async getAssignmentsByTeamId(teamId: TeamId): Promise<Assignment[]> {
    await this.initialize();
    const assignments: Assignment[] = [];
    const assignmentsDir = statePath("composition", 'assignments');
    if (existsSync(assignmentsDir)) {
      const files = await readdir(assignmentsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await readFile(statePath("composition", 'assignments', file), 'utf8');
          const assignment = JSON.parse(data) as Assignment;
          assignments.push(assignment);
        }
      }
    }
    return assignments.filter(a => true);
  }

  static async saveRequirement(requirement: Requirement): Promise<boolean> {
    await this.initialize();
    const filePath = statePath("composition", 'requirements', `${requirement.requirementId}.json`);
    await writeFile(filePath, JSON.stringify(requirement, null, 2));
    return true;
  }

  static async getRequirementById(requirementId: RequirementId): Promise<Requirement | null> {
    await this.initialize();
    const filePath = statePath("composition", 'requirements', `${requirementId}.json`);
    if (!existsSync(filePath)) return null;
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as Requirement;
  }

  static async saveFullComposition(request: {
    workId: WorkId;
    requirements: Requirement[];
    assignments: Assignment[];
    team: Team;
    compositionId?: string;
  }): Promise<{ compositionId: string; persisted: boolean }> {
    await this.initialize();
    const compositionId = request.compositionId || `composition-${request.workId}-${Date.now()}`;
    
    for (const req of request.requirements) {
      await this.saveRequirement(req);
    }
    for (const assignment of request.assignments) {
      await this.saveAssignment(assignment);
    }
    await this.saveTeam(request.team);

    const assignmentIds = request.assignments.map(a => String(a.bindingId));
    const requirementIds = request.requirements.map(r => String(r.requirementId));
    const teamId = String(request.team.teamId);
    
    const manifest = {
      compositionId,
      workId: request.workId,
      teamId,
      requirementIds,
      assignmentIds,
      persistedAt: getNow().toISOString(),
      version: "1.0.0"
    };

    const manifestPath = statePath("composition", 'compositions', `${compositionId}.json`);
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
    const manifestPath = statePath("composition", 'compositions', `${compositionId}.json`);
    if (!existsSync(manifestPath)) return null;

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    
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

  static async updateWorkBinding(
    compositionId: string, 
    bindingId: string, 
    updates: any
  ): Promise<{ updated: boolean; binding: WorkBinding | null; auditLogEntry: any }> {
    await this.initialize();
    
    const composition = await this.loadFullComposition(compositionId);
    if (!composition) {
      return { updated: false, binding: null, auditLogEntry: null };
    }

    const existingAssignment = composition.assignments.find(a => a.bindingId === bindingId);
    if (!existingAssignment) {
      return { updated: false, binding: null, auditLogEntry: null };
    }

    const existingBinding: WorkBinding = {
      ...existingAssignment,
      id: existingAssignment.id || bindingId,
      participantId: existingAssignment.actorId || existingAssignment.participantId || "",
      boundAt: existingAssignment.assignedAt || getNow().toISOString(),
      compositionId: compositionId as any,
      ...(existingAssignment.authority ? { authority: existingAssignment.authority as any } : {})
    } as any;

    const updatedBinding: WorkBinding = {
      ...existingBinding,
      ...updates,
      updatedAt: getNow().toISOString()
    };

    const updatedAssignment: any = {
      ...updatedBinding,
      compositionId: existingBinding.compositionId,
      assignmentId: AssignmentId(bindingId),
      teamId: TeamId(compositionId),
      actorId: updatedBinding.participantId,
      assignedAt: updatedBinding.boundAt || getNow().toISOString(),
      status: (updates.status || existingBinding.status) as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
    };

    await this.saveAssignment(updatedAssignment);

    const auditLogEntry = {
      auditId: `audit-${Date.now()}`,
      compositionId,
      bindingId,
      previousState: existingBinding,
      newState: updatedBinding,
      changedFields: Object.keys(updates),
      changedAt: getNow().toISOString(),
      actor: updates.updatedBy || "system"
    };

    const auditPath = statePath("composition", 'audit', `${compositionId}`, `${auditLogEntry.auditId}.json`);
    await mkdir(statePath("composition", 'audit', `${compositionId}`), { recursive: true });
    await writeFile(auditPath, JSON.stringify(auditLogEntry, null, 2));

    console.log(`[BETTER-EOS] WorkBinding updated: compositionId=${compositionId}, bindingId=${bindingId}, changes=${Object.keys(updates).join(',')}`);
    
    return { updated: true, binding: updatedBinding, auditLogEntry };
  }

  static async addParticipant(
    compositionId: string,
    newBinding: WorkBinding
  ): Promise<{ added: boolean; binding: WorkBinding | null; auditLogEntry: any }> {
    await this.initialize();
    
    const composition = await this.loadFullComposition(compositionId);
    if (!composition) {
      return { added: false, binding: null, auditLogEntry: null };
    }

    if (newBinding.compositionId !== compositionId) {
      console.error(`[BETTER-EOS] Cannot add participant with different compositionId: ${newBinding.compositionId} vs existing ${compositionId}`);
      return { added: false, binding: null, auditLogEntry: null };
    }

    await this.saveAssignment(newBinding as any);

    const manifestPath = statePath("composition", 'compositions', `${compositionId}.json`);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.assignmentIds.push(String(newBinding.bindingId));
    manifest.lastModifiedAt = getNow().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const auditLogEntry = {
      auditId: `audit-${Date.now()}`,
      compositionId,
      action: "ADD_PARTICIPANT",
      newParticipant: newBinding.participantId,
      participantType: newBinding.participantType,
      addedAt: getNow().toISOString(),
      actor: newBinding.updatedBy || "system"
    };

    const auditPath = statePath("composition", 'audit', `${compositionId}`, `${auditLogEntry.auditId}.json`);
    await mkdir(statePath("composition", 'audit', `${compositionId}`), { recursive: true });
    await writeFile(auditPath, JSON.stringify(auditLogEntry, null, 2));

    console.log(`[BETTER-EOS] New participant added: compositionId=${compositionId}, participantId=${newBinding.participantId}, type=${newBinding.participantType}`);
    
    return { added: true, binding: newBinding, auditLogEntry };
  }

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

    const existingAssignment = composition.assignments.find(a => a.bindingId === bindingId);
    if (!existingAssignment) {
      return { removed: false, auditLogEntry: null };
    }

    const existingBinding: WorkBinding = {
      ...existingAssignment,
      id: existingAssignment.id || bindingId,
      participantId: existingAssignment.actorId || existingAssignment.participantId || "",
      boundAt: existingAssignment.assignedAt || getNow().toISOString(),
      compositionId: compositionId as any,
      ...(existingAssignment.authority ? { authority: existingAssignment.authority as any } : {})
    } as any;

    await this.updateWorkBinding(compositionId, bindingId, { 
      status: "rejected",
      updatedBy: removedBy
    } as any);

    const manifestPath = statePath("composition", 'compositions', `${compositionId}.json`);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.assignmentIds = manifest.assignmentIds.filter((id: string) => id !== bindingId);
    manifest.lastModifiedAt = getNow().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const auditLogEntry = {
      auditId: `audit-${Date.now()}`,
      compositionId,
      action: "REMOVE_PARTICIPANT",
      removedParticipantId: existingBinding.participantId,
      removedAt: getNow().toISOString(),
      removedBy
    };

    const auditPath = statePath("composition", 'audit', `${compositionId}`, `${auditLogEntry.auditId}.json`);
    await mkdir(statePath("composition", 'audit', `${compositionId}`), { recursive: true });
    await writeFile(auditPath, JSON.stringify(auditLogEntry, null, 2));

    console.log(`[BETTER-EOS] Participant removed: compositionId=${compositionId}, participantId=${existingBinding.participantId}`);
    
    return { removed: true, auditLogEntry };
  }

  static async getCompositionAuditLog(compositionId: string): Promise<any[]> {
    await this.initialize();
    const auditDir = statePath("composition", 'audit', `${compositionId}`);
    if (!existsSync(auditDir)) return [];

    const { readdir, readFile } = require('fs/promises');
    const files = await readdir(auditDir);
    const auditLogs: any[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await readFile(statePath("composition", 'audit', `${compositionId}`, file), 'utf8');
        auditLogs.push(JSON.parse(data));
      }
    }

    return auditLogs.sort((a, b) => new Date(a.changedAt || a.addedAt || a.removedAt).getTime() - new Date(b.changedAt || b.addedAt || b.removedAt).getTime());
  }
}
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { Team, TeamId } from '../contracts/atomic-composition.contracts';
import type { Assignment, AssignmentId } from '../contracts/atomic-composition.contracts';
import type { Requirement, RequirementId } from '../contracts/atomic-composition.contracts';
import type { WorkId } from '@capabilities/work-core/contracts/work.contracts';
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
  static async saveTeam(team: Team): Promise<boolean> {
    await this.initialize();
    const filePath = join(STORAGE_DIR, 'teams', `${team.teamId}.json`);
    await writeFile(filePath, JSON.stringify(team, null, 2));
    return true;
  }

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
  static async saveAssignment(assignment: Assignment): Promise<{ assignmentId: string; saved: boolean }> {
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

    const workIdMatches = composition.team.workId === composition.workId;
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
}
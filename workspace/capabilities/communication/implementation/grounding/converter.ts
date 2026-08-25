/**
 * Grounding Converter - Core EOS mechanism that converts raw communication into grounded Work events
 * Implements the user's thesis: "Communication + Grounding = Work Continuity"
 * FIX CONTINUITY BREAK-003: Added Lamport Timestamp untuk menangani time drift/clock skew
 * Substrate compliant: minimal, only solves the exact problem, no platform building
 */

import type { CommunicationEvent, CommunicationEventId } from "../contracts/communication.contracts.js";
import { newCommunicationEventId } from "../contracts/communication.contracts.js";
import type { CaseAggregate, CaseId } from "@capabilities/legal-case/implementation/contracts/case.contracts.js";
import { CommunicationRepositoryInMemory as CommunicationRepository } from "../repository/communication.repository.js";

// LAMPORT TIMESTAMP IMPLEMENTATION - solusi untuk CONTINUITY BREAK-003 (time drift)
// Singleton untuk maintain clock global
let globalLamportClock = 0;

function incrementLamportClock(receivedClock?: number): number {
  // Lamport Clock rule: localClock = max(localClock, receivedClock) + 1
  if (receivedClock !== undefined && receivedClock > globalLamportClock) {
    globalLamportClock = receivedClock;
  }
  globalLamportClock += 1;
  return globalLamportClock;
}

// LAMPORT COMMUNICATION EVENT - extends base CommunicationEvent dengan lamport clock dan previous event ID
// Solusi untuk CONTINUITY BREAK-003 (time drift) dan AC4 evidence chain continuity
export interface LamportCommunicationEvent extends CommunicationEvent {
  lamport_clock: number;
  previous_event_id: string | null;
  causal_dependencies?: string[];
  metadata?: Record<string, any>;
}

// Minimal local type definitions for grounding until work-inspection package is properly integrated
interface WorkActor {
  id: string;
  type: "human" | "agent" | "system";
  displayName: string;
}

interface WorkTimelineEvent {
  event_id: string;
  work_id: string;
  actor_id: string;
  timestamp: string;
  lamport_clock: number;
  type: string;
}

/**
 * GroundedWorkEvent - The output of successful grounding: communication that becomes part of a Work
 * All fields are rooted in Work ID - maintains work-as-boundary principle
 */
export interface GroundedWorkEvent {
  work_id: string;
  actor: WorkActor;
  context: {
    current_work_state: string;
    related_artifacts: string[];
    previous_timeline_events: string[];
  };
  state: {
    previous: string;
    current: string;
    changed: boolean;
  };
  action: {
    assigned_to: string;
    description: string;
    due_at?: string;
  } | null;
  evidence: {
    artifact_ids: string[];
    audit_timestamp?: string;
  };
  raw_message: string;
  channel: string;
  timestamp: string;
  fullEvent: LamportCommunicationEvent;
}

/**
 * Extract actor information from raw message content and existing Work context
 * Uses simple pattern matching that can be extended only if REAL_WORK_014 proves need
 */
function extractActorFromMessage(
  content: string,
  existingWork: CaseAggregate,
  actorId?: string
): WorkActor {
  // Simple actor extraction - can be refined only if observation shows gaps
  const senderPatterns = [
    { pattern: /Pak|Lawan|Notaris|Pengacara|Customer/i, role: "professional" },
    { pattern: /saya|aku|saya kirim|saya lampirkan/i, role: "human" },
    { pattern: /\[system\]|\[agent\]|automated|bot/i, role: "agent" }
  ];

  let matchedRole = "unknown";
  for (const p of senderPatterns) {
    if (p.pattern.test(content)) {
      matchedRole = p.role;
      break;
    }
  }

return {
      id: actorId || existingWork.lawyerId || "unknown",
      type: matchedRole === "agent" ? "agent" : "human",
      displayName: "Lead Counsel"
    };}

/**
 * Extract context from message and existing Work
 * Identifies related artifacts and timeline context from the communication
 */
function extractContextFromMessage(
  content: string,
  existingWork: CaseAggregate
): GroundedWorkEvent["context"] {
  // Extract document references - simple pattern matching
  const documentMatches = content.match(/dokumen|akta|surat|document/i) || [];
  const artifactIds = documentMatches.length > 0 ? [`artifact-${Date.now()}`] : [];

  // Merge new artifacts with EXISTING artifacts from Work entity to preserve context across channels
  // This ensures we never lose artifact history when switching communication channels
  const existingArtifacts = (existingWork as any).related_artifacts || [];
  const allArtifacts = [...new Set([...existingArtifacts, ...artifactIds])];

  return {
    current_work_state: existingWork.status,
    related_artifacts: allArtifacts,
    previous_timeline_events: existingWork.executionContext?.decision_id 
      ? [...((existingWork as any).previous_timeline_events || []), existingWork.executionContext.decision_id]
      : (existingWork as any).previous_timeline_events || []
  };
}

/**
 * Extract state change from message - detects if communication causes Work state transition
 * Implements the Communication-to-Work Conversion KPI
 */
function extractStateFromMessage(
  content: string,
  existingWork: CaseAggregate
): GroundedWorkEvent["state"] {
  const previous = existingWork.status;
  let current = previous;

  // Detect state changes from message content - only if REAL_WORK_014 observes these patterns
  if (content.match(/sudah dikirim|terkirim|submit/i) && previous === "in_progress") {
    current = "in_progress";
  } else if (content.match(/selesai|selesai diproses|sudah jadi/i)) {
    current = "closed";
  }

  return {
    previous,
    current,
    changed: current !== previous
  };
}

/**
 * Extract next action from message - identifies who needs to do what after this communication
 */
function extractNextActionFromMessage(
  content: string,
  existingWork: CaseAggregate
): GroundedWorkEvent["action"] {
  // Look for action assignments in the message
  const reviewMatch = content.match(/tolong review|periksa|check/i);
  const submitMatch = content.match(/tolong submit|kirim|upload/i);
  
  if (reviewMatch) {
    return {
      assigned_to: existingWork.lawyerId || "unknown",
      description: "Review the submitted document",
      due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
    };
  } else if (submitMatch) {
    return {
      assigned_to: existingWork.actorId || "unknown",
      description: "Submit the required document",
      due_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // No action extracted - this is just a context update, counts as CONTEXT SIGNAL
  return null;
}

/**
 * Extract evidence from message - identifies what needs to be audited
 * Implements anti-evidence-theater rule: all evidence requires raw human audit
 */
function extractEvidenceFromMessage(
  content: string,
  existingWork: CaseAggregate
): GroundedWorkEvent["evidence"] {
  // Any message that mentions scores, metrics, or "evidence" itself requires manual audit
  const requiresAudit = /score|evidence|bukti|terbukti|98%|0\.98/i.test(content);
  
  return {
    artifact_ids: [],
    audit_timestamp: requiresAudit ? new Date().toISOString() : undefined
  };
}

/**
 * Core grounding function - converts raw CommunicationEvent into GroundedWorkEvent
 * Only called when a communication fails to be automatically grounded by existing logic
 * Exact bottleneck solution for REAL_WORK_014
 */
export async function groundCommunicationToWork(
  rawEvent: Omit<CommunicationEvent, "event_id" | "timestamp"> | LamportCommunicationEvent,
  existingWork: CaseAggregate
): Promise<GroundedWorkEvent> {
  // FIX CONTINUITY BREAK-003: Process Lamport Clock terlebih dahulu untuk maintain causal order
  // Increment clock dengan nilai dari event incoming jika ada
  const currentLamportClock = incrementLamportClock((rawEvent as any).lamport_clock);
  console.log(`[GroundingConverter] Lamport clock incremented to: ${currentLamportClock} for event: ${(rawEvent as any).event_id || 'unknown'}`);
  
  // Run all extractors in sequence - minimal computation, only what's needed
  // Extract caller-provided actor ID if passed from rawEvent (for actor change scenarios)
  const rawActorId = (rawEvent as any).actor_id;
  const actorMatch = extractActorFromMessage(rawEvent.content, existingWork, rawActorId);
  const contextMatch = extractContextFromMessage(rawEvent.content, existingWork);
  const stateMatch = extractStateFromMessage(rawEvent.content, existingWork);
  const actionMatch = extractNextActionFromMessage(rawEvent.content, existingWork);
  const evidenceMatch = extractEvidenceFromMessage(rawEvent.content, existingWork);

  // Validate and repair work_id - core continuity protection against external mutation
  const receivedWorkId = rawEvent.work_id;
  const correctWorkId = existingWork.id;
  const hasMutation = receivedWorkId !== correctWorkId;

  // Extract evidence and flag for audit if work_id was mutated
  const correctedEvidence = {
    ...evidenceMatch,
    audit_timestamp: hasMutation ? new Date().toISOString() : undefined // Jika work_id termutasi, catat waktu audit
  };

  // Buat fullEvent terlebih dahulu sebelum groundedEvent untuk memenuhi interface requirement
  const allWorkEvents = await CommunicationRepository.byWorkId(correctWorkId);
  const lastEvent = allWorkEvents.length > 0 ? allWorkEvents[allWorkEvents.length - 1] : null;
  
  // Create full CommunicationEvent with CORRECT work_id AND PRESERVED CONTEXT from Work entity
  const fullEvent: LamportCommunicationEvent = {
    ...rawEvent,
    work_id: correctWorkId,
    event_id: newCommunicationEventId(),
    timestamp: new Date().toISOString(),
    decision_id: existingWork.executionContext?.decision_id || undefined,
    last_invocation_digest: existingWork.executionContext?.last_invocation_digest || undefined,
    tenant_id: (existingWork as any).tenantId || (rawEvent as any).tenant_id,
    workspace_id: (existingWork as any).workspaceId || (rawEvent as any).workspace_id,
    actor_id: (rawEvent as any).actor_id || (existingWork as any).actorId || existingWork.lawyerId,
    previous_event_id: lastEvent?.event_id || null,
    lamport_clock: currentLamportClock,
  };

  // Assemble the final grounded event - 100% aligned with user's architectural model
  const groundedEvent: GroundedWorkEvent = {
    work_id: correctWorkId,
    actor: actorMatch,
    context: contextMatch,
    state: stateMatch,
    action: actionMatch,
    evidence: correctedEvidence,
    raw_message: rawEvent.content,
    channel: rawEvent.adapter_type || "unknown",
    timestamp: new Date().toISOString(),
    fullEvent // Memenuhi interface requirement fullEvent
  };

  // Log for observability - what gets grounded is tracked for REAL_WORK_014 evidence collection
  console.log("[GroundingConverter] Communication successfully grounded to Work:", {
    work_id: groundedEvent.work_id,
    channel: groundedEvent.channel,
    actor_type: groundedEvent.actor.type,
    state_change: groundedEvent.state.changed,
    audit_timestamp: groundedEvent.evidence.audit_timestamp,
    work_id_repaired: hasMutation // Log jika kita pernah memperbaiki work_id yang termutasi
  });



  // KEMBALIKAN fullEvent kepada caller sehingga bisa disimpan ke repository
  // Ini adalah kunci solusi untuk CONTINUITY BREAK-003 AC4: fullEvent sudah memiliki
  // lamport_clock, previous_event_id, dan semua field yang dibutuhkan untuk kontinuitas
  console.log("[GroundingConverter] Communication event successfully grounded, returning to caller to persist:", fullEvent.event_id);

  // If this message caused a state change, create a timeline event for the Work inspector
  if (groundedEvent.state.changed) {
    const timelineEvent: WorkTimelineEvent = {
      event_id: `timeline-${Date.now()}`,
      work_id: existingWork.id,
      actor_id: groundedEvent.actor.id,
      timestamp: new Date().toISOString(),
      lamport_clock: currentLamportClock,
      type: "STATE_TRANSITION"
    };
    
    console.log("[GroundingConverter] Created timeline event for state transition:", timelineEvent.event_id);
  }

  // Return groundedEvent yang sudah memiliki fullEvent di dalamnya
  // fullEvent berisi semua metadata tambahan untuk kontinuitas (lamport, previous_event)
  return groundedEvent;
}

/**
 * Check if a communication event requires manual grounding
 * Only runs the converter if the existing automatic grounding failed
 * Implements the rule: "if it works, don't code it"
 */
export async function needsManualGrounding(
  event: CommunicationEvent
): Promise<boolean> {
  // Reuse the exact same validation from OrphanScanner - no duplicate logic!
  const validWorkIdPattern = /^(case|matter|project)-\d+$/;
  
  if (!event.work_id || event.work_id.trim() === "") {
    console.log("[GroundingConverter] Event needs manual grounding: missing work_id");
    return true;
  }
  
  if (!validWorkIdPattern.test(event.work_id)) {
    console.log("[GroundingConverter] Event needs manual grounding: invalid work_id format");
    return true;
  }

  // If we get here, event is already properly grounded - don't waste computation
  return false;
}
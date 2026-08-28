/**
 * Evidence Feature — Upload Artifact logic for Work Reality Surface
 * implements EOS FACE WF-003: Evidence feature for /work/[id] route
 */

import type { EvidenceArtifact, WorkIdentity } from '@repo/presentation-entities';

export interface UploadEvidenceRequest {
  readonly workId: string;
  readonly label: string;
  readonly file: File;
  readonly actorId: string;
}

export interface UploadEvidenceResult {
  readonly success: boolean;
  readonly evidence: EvidenceArtifact;
}

/**
 * uploadEvidence — core evidence upload logic
 * maps to EOS FACE: features/evidence capability
 */
export async function uploadEvidence(
  work: WorkIdentity,
  request: UploadEvidenceRequest
): Promise<UploadEvidenceResult> {
  const formData = new FormData();
  formData.append('file', request.file);
  formData.append('workId', work.workId);
  formData.append('label', request.label);
  formData.append('actorId', request.actorId);

  // Upload via API endpoint
  const response = await fetch('/api/cases/evidence', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  return {
    success: response.ok,
    evidence: {
      label: request.label,
      url: result.url || '',
      source: `actor-${request.actorId}`
    }
  };
}
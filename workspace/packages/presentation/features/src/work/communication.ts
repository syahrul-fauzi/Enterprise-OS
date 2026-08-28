/**
 * Communication Feature — Send Message logic for Work Reality Surface
 * implements EOS FACE WF-004: Send Message feature for /work/[id] route
 */

import type { CommunicationEvent, WorkIdentity } from '@repo/presentation-entities';

export interface SendCommunicationRequest {
  readonly workId: string;
  readonly channel: 'internal' | 'email' | 'sms';
  readonly actorId: string;
  readonly sender: CommunicationEvent['sender'];
  readonly recipients: CommunicationEvent['recipients'];
  readonly content: string;
}

export interface SendCommunicationResult {
  readonly success: boolean;
  readonly communication: CommunicationEvent;
}

/**
 * sendCommunication — core communication logic
 * maps to EOS FACE: features/communication capability
 */
export async function sendCommunication(
  work: WorkIdentity,
  request: SendCommunicationRequest
): Promise<SendCommunicationResult> {
  const newCommunication: CommunicationEvent = {
    id: `comm-${Date.now()}`,
    channel: request.channel,
    actorId: request.actorId,
    sender: request.sender,
    recipients: request.recipients,
    content: request.content,
    timestamp: Date.now()
  };

  // Persist communication via API
  await fetch('/api/communications/add', {
    method: 'POST',
    body: JSON.stringify({
      workId: work.workId,
      ...newCommunication
    })
  });

  return {
    success: true,
    communication: newCommunication
  };
}
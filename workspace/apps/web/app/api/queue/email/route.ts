import { NextResponse } from 'next/server';
import { getNow } from "#core/kernel/timing/time-provider.js";
import { EmailQueueRepository, startQueueProcessors } from '@repo/core-runtime/email-queue.js';

// Initialize email queue processors once when route is first loaded
let queueInitialized = false;
if (!queueInitialized) {
  startQueueProcessors();
  queueInitialized = true;
  console.log('[API /queue/email] Email queue processors initialized');
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();
    const { to, subject, html, executionId } = body;

    if (!to || !subject || !html || !executionId) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html, executionId' },
        { status: 400 }
      );
    }

    // Add to queue - this is async, returns immediately
    await EmailQueueRepository.enqueue({
      to,
      subject,
      html,
      executionId,
      createdAt: getNow().toISOString()
    });

    return NextResponse.json({
      success: true,
      queued: true,
      executionId
    });
  } catch (error) {
    console.error('[API /queue/email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
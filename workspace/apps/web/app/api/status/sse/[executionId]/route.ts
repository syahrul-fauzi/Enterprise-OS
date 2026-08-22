import { NextResponse } from 'next/server';
import { ExecutionStatusRepository } from '@repo/core-runtime';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { executionId: string } }
) {
  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial status
        const initialStatus = await ExecutionStatusRepository.getStatus(params.executionId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: initialStatus?.current || 'unknown' })}\n\n`));

        // Keep connection alive and poll for changes
        const interval = setInterval(async () => {
          try {
            const currentStatus = await ExecutionStatusRepository.getStatus(params.executionId);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: currentStatus?.current || 'unknown' })}\n\n`));
            
            // If status is terminal, close the connection
            if (currentStatus?.current === 'completed' || currentStatus?.current === 'failed') {
              clearInterval(interval);
              controller.close();
            }
          } catch (err) {
            controller.error(err);
          }
        }, 1000);

        // Cleanup on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API /status/sse/[executionId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
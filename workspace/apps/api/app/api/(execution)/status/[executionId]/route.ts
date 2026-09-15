import { NextResponse } from 'next/server';
import { ExecutionStatusRepository } from '@repo/core-runtime/execution-status.js';

export async function GET(
  request: Request,
  { params }: { params: { executionId: string } }
) {
  try {
    const status = await ExecutionStatusRepository.getStatus(params.executionId);
    
    if (!status) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: status.current,
      updatedAt: status.updatedAt,
      transitions: status.transitions.slice(-5) // Last 5 transitions
    });
  } catch (error) {
    console.error('[API /status/[executionId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
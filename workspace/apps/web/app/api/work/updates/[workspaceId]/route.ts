import { NextResponse } from 'next/server';
import { getAllWorksForWorkspace } from "../../create/route";
import { 
  registerWorkspaceListener, 
  unregisterWorkspaceListener,
  notifyWorkspaceListeners 
} from "../../../../../../../packages/core/realtime/src/workspace-notifier";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const encoder = new TextEncoder();
    const listenerId = `listener_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const listeners = getGlobalWorkListeners();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Import canonical model builder to send initial canonical model
        const { buildMyRealityModel } = await import("../../../../(eos)/my-reality/getMyRealityModel");
        // Send initial state with canonical MyRealityModel
        const initialWorks = getAllWorksForWorkspace(params.workspaceId);
        
        // Build canonical model for initial connection
        const session = {
          workspaceId: params.workspaceId,
          actorId: "default-actor",
          tenantId: "default-tenant",
          actorLabel: "Pengguna"
        };
        const canonicalModel = await buildMyRealityModel(session as any);
        
        // Send NEW model.updated event first - canonical single source of truth
        const initialModelEvent = {
          type: "model.updated",
          timestamp: Date.now(),
          workspaceId: params.workspaceId,
          payload: { 
            model: canonicalModel,
            source: "initial-connection",
            works: initialWorks, 
            count: initialWorks.length 
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialModelEvent)}\n\n`));
        
        console.log(`[SSE Route] ✅ Initial canonical model sent to new client for workspace:`, params.workspaceId);

        // Register this listener in global registry
        registerWorkspaceListener(listenerId, {
          workspaceId: params.workspaceId,
          controller,
          lastSentWorks: JSON.stringify(initialWorks)
        });

        console.log(`[SSE /api/work/updates/${params.workspaceId}] Client connected: ${listenerId}, total listeners: ${listeners.size}`);

        // Keep connection alive with periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`));
          } catch (err) {
            // Client disconnected, cleanup
            clearInterval(heartbeatInterval);
            listeners.delete(listenerId);
            console.log(`[SSE /api/work/updates/${params.workspaceId}] Client disconnected: ${listenerId}, remaining listeners: ${listeners.size}`);
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Cleanup on client disconnect - with safety check for signal support
        if (request.signal?.addEventListener) {
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeatInterval);
            unregisterWorkspaceListener(listenerId);
            console.log(`[SSE /api/work/updates/${params.workspaceId}] Client disconnected: ${listenerId}, remaining listeners: ${listeners.size}`);
          });
        }
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
    console.error(`[API /work/updates/${params.workspaceId}] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
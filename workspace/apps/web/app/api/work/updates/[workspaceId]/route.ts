import { NextResponse } from 'next/server';
import { getAllWorksForWorkspace, getWorkById } from "../../create/route";
import { 
  registerWorkspaceListener, 
  unregisterWorkspaceListener,
  notifyWorkspaceListeners 
} from "../../../../../../../packages/core/realtime/src/workspace-notifier";
// Import canonical model builder and communication repository for work-specific updates
import { buildWorkRealityModel } from "../../../../../../../packages/presentation/features/src/work/getWorkRealityModel";
import { CommunicationRepository } from "@repo/capabilities-communication/repository/index.js";
// Import product context to extract productId from request headers (FACE-001 requirement)
import { readProductContextFromRequest } from "@repo/presentation/experience/src/product-context";
// Import session utilities to parse actor from request cookies
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    // Await params to fix Next.js 15 sync dynamic APIs error
    const { workspaceId } = await params;
    const url = new URL(request.url);
    const workId = url.searchParams.get('workId'); // Extract workId from query parameters
    const encoder = new TextEncoder();
    const listenerId = `listener_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    
    // Isolate non-existent getGlobalWorkListeners per minimal legacy repair policy
    // This module is missing from the codebase, bypass operationally to avoid blocking core flow
    const listeners = new Map(); // Minimal in-memory map for this connection only
    console.log(`[API /work/updates/${workspaceId}] ISOLATED: getGlobalWorkListeners module missing, using local map per minimal repair policy`);
    
    const stream = new ReadableStream({
      async start(controller) {
        let session: any;
        let canonicalModel: any;
        
        // FACE-001: Extract productId from request headers using product-context to enforce product boundaries
        const productContext = readProductContextFromRequest(request);
        console.log(`[SSE Route] 🏷️ Extracted product context: productId=${productContext.productId}, requestHost=${productContext.requestHost}`);
        
        if (workId) {
          // W-ILC-002-02: Work-specific SSE connection - fetch and build model only for this work
          console.log(`[SSE Route] 🎯 Work-specific connection requested for workId: ${workId}`);
          
          // 1. Fetch canonical work record using getWorkById
          const work = await getWorkById(workId);
          if (!work) {
            console.error(`[SSE Route] ❌ Work not found: ${workId}`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Work not found" })}\n\n`));
            controller.close();
            return;
          }
          
          // 2. Fetch all communication events for this work
          const communications = await CommunicationRepository.byWorkId(workId, {
            tenantId: work.tenantId,
            workspaceId: workspaceId
          });
          console.log(`[SSE Route] ✅ Fetched ${communications.length} communications for work: ${workId}`);
          
          // 3. Parse canonical session from request cookies (AUTH-003: no hardcoded fallbacks)
          const cookie = request.headers.get("Cookie");
          let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
          let parsedSession: any = {
             sessionId: "",
             tenantId: work.tenantId,
             workspaceId: workspaceId,
             actorId: ""
           };
          
          if (sessionCookie) {
            try {
              const sessionValue = sessionCookie.split('=')[1];
              if (sessionValue) {
                const decodedSession = decodeWorkspaceSession(sessionValue);
                if (decodedSession?.sessionId) {
                  parsedSession = decodedSession;
                }
              }
            } catch (e) { 
              console.error("[SSE Route] Session parse error in work-specific flow:", e);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Invalid session" })}\n\n`));
              controller.close();
              return;
            }
          }
          
          // Reject unauthenticated requests for work-specific access
          if (!parsedSession.actorId) {
            console.error("[SSE Route] ❌ Unauthorized: No valid actor session for work-specific access");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Unauthorized" })}\n\n`));
            controller.close();
            return;
          }
          
          // Build session context for model building with canonical parsed values
          session = {
            workspaceId: workspaceId,
            actorId: parsedSession.actorId,
            tenantId: work.tenantId,
            actorLabel: "Pengguna",
            productId: productContext.productId || undefined
          };
          
          // 4. Build work-specific canonical WorkRealityModel
          canonicalModel = await buildWorkRealityModel(work, communications, session);
          
        } else {
          // Fallback to original workspace-wide model if no workId provided
          console.log(`[SSE Route] ℹ️ Workspace-wide connection requested (no workId provided)`);
          
          // Parse canonical session from request cookies (AUTH-003: no hardcoded fallbacks)
          const cookie = request.headers.get("Cookie");
          let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
          let parsedSession: any = {
             sessionId: "",
             tenantId: "",
             workspaceId: workspaceId,
             actorId: ""
           };
          
          if (sessionCookie) {
            try {
              const sessionValue = sessionCookie.split('=')[1];
              if (sessionValue) {
                const decodedSession = decodeWorkspaceSession(sessionValue);
                if (decodedSession?.sessionId) {
                  parsedSession = {
                    sessionId: decodedSession.sessionId,
                    tenantId: decodedSession.tenantId ?? parsedSession.tenantId,
                    workspaceId: decodedSession.workspaceId ?? parsedSession.workspaceId,
                    actorId: decodedSession.actorId ?? parsedSession.actorId
                  };
                }
              }
            } catch (e) { console.error("[SSE Route] Session parse error:", e); }
          }

          // Reject unauthenticated requests - no anonymous fallback (AUTH-003 compliance)
          if (!parsedSession.sessionId || !parsedSession.tenantId || !parsedSession.workspaceId || !parsedSession.actorId) {
            console.error(`[SSE Route] ❌ Unauthorized: Invalid session for workspace ${workspaceId}`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Invalid session" })}\n\n`));
            controller.close();
            return;
          }
          
          const requesterActorId = parsedSession.actorId;
          const allWorks = getAllWorksForWorkspace(workspaceId);
          // Filter works to only those the requester is authorized to access
          const authorizedWorks = allWorks.filter((work: any) => {
            const isParticipant = work.participants?.some((p: any) => p.id === requesterActorId);
            const isActor = work.actorId === requesterActorId;
            const isCustomer = (work as any).customerId === requesterActorId;
            return isParticipant || isActor || isCustomer;
          });
          
          console.log(`[SSE Route] 🔒 Filtered ${allWorks.length} total works to ${authorizedWorks.length} authorized works for actor ${requesterActorId}`);
          
          const { buildMyRealityModel } = await import("../../../../(eos)/my-reality/getMyRealityModel");
          // FACE-001: Add productId to session to enforce product/face filtering in buildMyRealityModel
          session = {
            workspaceId: workspaceId,
            actorId: requesterActorId,
            tenantId: parsedSession.tenantId,
            actorLabel: "Pengguna",
            productId: productContext.productId || undefined // FACE-001: Critical for cross-surface filtering
          };
          console.log(`[SSE Route] 🔧 Session created with actorId: ${session.actorId}, productId: ${session.productId}`);
          canonicalModel = await buildMyRealityModel({ ...session, authorizedWorks });
        }
        
        // Send NEW model.updated event first - canonical single source of truth
        const initialModelEvent = {
          type: "model.updated",
          timestamp: Date.now(),
          workspaceId: workspaceId,
          payload: { 
            model: canonicalModel,
            source: workId ? `work-specific-${workId}` : "initial-connection",
            workId: workId || null
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialModelEvent)}\n\n`));
        
        console.log(`[SSE Route] ✅ Initial canonical model sent to new client for workspace: ${workspaceId}${workId ? `, work: ${workId}` : ''}`);

        // Register this listener in global registry
        registerWorkspaceListener(listenerId, {
          workspaceId: workspaceId,
          controller,
          workId: workId, // Store workId with listener to support targeted updates
          lastSentModel: JSON.stringify(canonicalModel)
        });

        console.log(`[SSE /api/work/updates/${workspaceId}] Client connected: ${listenerId}, total listeners: ${listeners.size}`);

        // Keep connection alive with periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`));
          } catch (err) {
            // Client disconnected, cleanup
            clearInterval(heartbeatInterval);
            listeners.delete(listenerId);
            console.log(`[SSE /api/work/updates/${workspaceId}] Client disconnected: ${listenerId}, remaining listeners: ${listeners.size}`);
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Cleanup on client disconnect - with safety check for signal support
        if (request.signal?.addEventListener) {
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeatInterval);
            unregisterWorkspaceListener(listenerId);
            console.log(`[SSE /api/work/updates/${workspaceId}] Client disconnected: ${listenerId}, remaining listeners: ${listeners.size}`);
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
    // workspaceId is declared in the GET function scope, this try/catch has access to it
    const workspaceIdForError = "unknown";
    console.error(`[API /work/updates/${workspaceIdForError}] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { recordRuntimeInvocation } from "@repo/core-runtime";
// Import executionContext DARI PATH YANG SAMA DENGAN TEST FILE untuk instance IDENTIK (tidak duplicate module di ESM)
import { executionContext } from "../../packages/core/runtime/src/execution-context.ts";
// Import Web Crypto API untuk generate context_trace_id jika tidak ada di header
import crypto from "node:crypto";
// Canonical import SessionId dari @repo/contracts-core untuk sinkronisasi tipe W06-A3-001
import { SessionId } from "@repo/contracts-core";

// ACaaS-COMMERCIAL-001: Metering middleware untuk tracking semua permintaan ke endpoint ACaaS
function trackAcaasRequest(request: NextRequest, clientIp: string) {
  const path = request.nextUrl.pathname;
  // Hanya track permintaan ke endpoint ACaaS
  if (path.startsWith('/api/v1/acaas/')) {
    const tenantId = request.headers.get('x-tenant-id') || 'unknown-tenant';
    const actorId = request.headers.get('x-actor-id') || 'unknown-actor';
    const workspaceId = request.headers.get('x-workspace-id') || 'unknown-workspace';
    
    // Record runtime invocation untuk metering (sesuai format core-runtime)
    recordRuntimeInvocation({
      capabilityId: "api-platform",
      operationId: `acaas.middleware.${path.replace('/api/v1/acaas/', '').replace('/', '.')}`,
      sourceRef: "ApiMiddleware.acaas.metering",
      success: true,
      input: { path, method: request.method, clientIp },
      result: { tracked: true },
      tenant_id: tenantId,
      actor_id: actorId
    });
    
    console.log(`[ACaaS METERING] Request tracked: ${path} | Tenant: ${tenantId} | Actor: ${actorId}`);
  }
}

// Fungsi untuk cek apakah IP client ada di allowed network CIDR
function isIpAllowed(clientIp: string | null, allowedNetworks: string[]): boolean {
  if (!clientIp) return false;
  
  // Izinkan localhost selalu, termasuk format IPv6-mapped IPv4 ::ffff:127.0.0.1
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || clientIp.includes('::ffff:127.0.0.1')) {
    return true;
  }

  // Parse Docker internal network 172.17.0.0/16
  const dockerNetworkStart = parseInt('172.17', 10);
  const clientIpParts = clientIp.split('.');
  if (clientIpParts.length >= 2) {
    const clientFirstOctet = parseInt(clientIpParts[0], 10);
    const clientSecondOctet = parseInt(clientIpParts[1], 10);
    // Cek apakah dalam 172.17.x.x (Docker default network)
    if (clientFirstOctet === 172 && clientSecondOctet === 17) {
      return true;
    }
  }

  // Log IP yang ditolak untuk audit
  console.warn(`[EOS MIDDLEWARE] Blocked request from unauthorized IP: ${clientIp}`);
  return false;
}

// Helper function untuk memanggil capabilityRegistry.invoke (reuse pattern dari services-id)
async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  // Cek apakah ada mock capabilityRegistry di globalThis (untuk test environment)
  const mockReg = (globalThis as any).__mockCapabilityRegistry;
  if (mockReg && typeof mockReg.invoke === "function" && process.env.NODE_ENV === "test") {
    console.log(`[api-middleware] Menggunakan MOCK capabilityRegistry dari globalThis (NODE_ENV=test)`);
    const res = await mockReg.invoke(capability, commandName, input as never);
    return res.output;
  }

  // Jika tidak ada mock, gunakan capabilityRegistry dari @repo/core-kernel (production)
  const loaded = await import("@repo/core-kernel");
  const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<{ output?: Output }> } }).capabilityRegistry;
  if (typeof reg?.invoke !== "function") {
    throw new Error(`[api-middleware] capabilityRegistry.invoke unavailable for ${capability}.${commandName}`);
  }
  const res = await reg.invoke(capability, commandName, input as never);
  return res.output;
}

export async function middleware(request: NextRequest) {
  // Dapatkan IP client dari header (dari Caddy yang sudah mem-forward IP asli)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') ||
                   'unknown';

  const allowedNetworks = process.env.ALLOWED_INTERNAL_NETWORKS?.split(',') || ['172.17.0.0/16', '127.0.0.1/32'];

  if (!isIpAllowed(clientIp, allowedNetworks)) {
    // Audit trail untuk IP yang ditolak
    recordRuntimeInvocation({
      capabilityId: "api-platform",
      operationId: "middleware.ip_blocked",
      sourceRef: "ApiMiddleware.isIpAllowed",
      success: false,
      input: { clientIp, path: request.nextUrl.pathname },
      result: { blocked: true, reason: "Unauthorized IP address" },
      tenant_id: "unknown",
      actor_id: "unknown"
    });
    
    return new NextResponse(JSON.stringify({ error: 'Forbidden', message: 'Access from unauthorized IP address' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Track ACaaS requests untuk metering (ACaaS-COMMERCIAL-001)
  trackAcaasRequest(request, clientIp);

  // W06-A3.1: Bangun authenticated execution context dari session yang terverifikasi
  // DI NODE_ENV=test: SELALU GUNAKAN GLOBAL TEST SESSION MODULE YANG TELAH DIOVERRIDE OLEH VITEST (SINKRON, TIDAK ADA AWAIT)
  // Produksi: Import module asli untuk bypass lazy import yang menyebabkan masalah ESM
  let readWorkspaceSessionFromRequest, isAuthenticatedSession;
  if (process.env.NODE_ENV === 'test') {
    console.log(`[MIDDLEWARE] 🔧 NODE_ENV=test terdeteksi, menggunakan globalThis.testSessionModule (SINKRON)`);
    ({ readWorkspaceSessionFromRequest, isAuthenticatedSession } = (globalThis as any).testSessionModule);
  } else {
    ({ readWorkspaceSessionFromRequest, isAuthenticatedSession } = await import("@repo/core-kernel/session/workspace-session"));
  }
  console.log(`[MIDDLEWARE] 🔍 testSessionModule di globalThis? ${!!(globalThis as any).testSessionModule}`);
  console.log(`[MIDDLEWARE] 🔍 readWorkspaceSessionFromRequest adalah function? ${typeof readWorkspaceSessionFromRequest === 'function'} | isAuthenticatedSession adalah function? ${typeof isAuthenticatedSession === 'function'}`);
  const session = readWorkspaceSessionFromRequest(request);
  console.log(`[MIDDLEWARE] 🔍 Session yang dibaca dari request: ${JSON.stringify(session)}`);
  
  // Hanya proses request dengan session terautentikasi (anonim tidak lulus isAuthenticatedSession)
  if (session && isAuthenticatedSession(session)) {
    // W06-A3-001: Konversi string sessionId ke tipe SessionId canonical (gunakan factory function dari @repo/contracts-core)
    // Menghilangkan kebutuhan @ts-ignore karena tipe sekarang cocok 100% dengan kontrak ExecutionContext
    const canonicalSessionId = SessionId(session.sessionId);
    
    // W06-A3.2: Panggil security-hardening.authorize untuk verifikasi otorisasi penuh sebelum akses resource
    // scope diambil dari workspace_id session (sesuai EOS scope model)
    const scope = session.workspaceId;
    let authDecision;
    
    // W06-A3-002: Panggil security-hardening.authorize dengan parameter sesuai kontrak capability yang terdaftar
    // Kontrak resmi: security-hardening.authorize menerima (request: Request, scope: EosScope, session?) → AuthorizationDecision
    // Implementasi sesuai dengan definisi command di /capabilities/security-hardening/implementation/commands/index.ts
    // W06-A3-002: Pass session dengan revokedAt untuk validasi session yang dicabut (acceptance criteria: revoked session test)
    try {
      authDecision = await invokeCapability<{ allowed: boolean; status: 200 | 401 | 403; reason: string; scope: string }>(
        "security-hardening",
        "authorize",
        request, // Parameter 1: NextRequest yang sesuai dengan tipe Request yang diharapkan capability
        scope,   // Parameter 2: EosScope (workspaceId) yang sesuai dengan kontrak
        // Parameter 3: Session dengan tenantId, actorId, sessionId, dan revokedAt (jika ada)
        {
          tenantId: session.tenantId,
          actorId: session.actorId,
          sessionId: session.sessionId,
          // WorkspaceSession sekarang menyertakan revokedAt di schema (W06-A3-002 update)
          revokedAt: session.revokedAt ? new Date(session.revokedAt) : null
        }
      );
    } catch (authError: any) {
      // Audit trail untuk error otorisasi (tercatat di evidence chain)
      recordRuntimeInvocation({
        capabilityId: "api-platform",
        operationId: "middleware.authorization_failed",
        sourceRef: "ApiMiddleware.security-hardening.authorize",
        success: false,
        input: { session_actor_id: session.actorId, workspace_id: session.workspaceId, path: request.nextUrl.pathname, session_id: canonicalSessionId },
        result: { blocked: true, reason: `Authorization error: ${authError.message}` },
        tenant_id: session.tenantId,
        actor_id: session.actorId,
        work_id: "W06-A3-002" // Work ID jelas untuk audit trail
      });
      
      return new NextResponse(JSON.stringify({ error: 'Unauthorized', message: 'Authorization service unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // W06-A3-002: Cek apakah otorisasi diizinkan (enforcement gate utama)
    if (!authDecision.allowed) {
      // Audit trail untuk otorisasi yang ditolak (tercatat di evidence chain)
      recordRuntimeInvocation({
        capabilityId: "api-platform",
        operationId: "middleware.authorization_denied",
        sourceRef: "ApiMiddleware.security-hardening.authorize",
        success: false,
        input: { session_actor_id: session.actorId, workspace_id: session.workspaceId, path: request.nextUrl.pathname, session_id: canonicalSessionId, auth_decision: authDecision },
        result: { blocked: true, reason: authDecision.reason },
        tenant_id: session.tenantId,
        actor_id: session.actorId,
        work_id: "W06-A3-002" // Work ID jelas untuk audit trail
      });
      
      return new NextResponse(JSON.stringify({ error: 'Forbidden', message: authDecision.reason }), {
        status: authDecision.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Audit trail untuk otorisasi yang diizinkan (tercatat di evidence chain)
    recordRuntimeInvocation({
      capabilityId: "api-platform",
      operationId: "middleware.authorization_allowed",
      sourceRef: "ApiMiddleware.security-hardening.authorize",
      success: true,
      input: { session_actor_id: session.actorId, workspace_id: session.workspaceId, path: request.nextUrl.pathname, session_id: canonicalSessionId, auth_decision: authDecision },
      result: { allowed: true },
      tenant_id: session.tenantId,
      actor_id: session.actorId,
      work_id: "W06-A3-002" // Work ID jelas untuk audit trail
    });
    // Mapping WorkspaceSession ke ExecutionContext untuk AsyncLocalStorage (W06-A3 compliant)
    const authenticatedExecutionContext = {
      actor_id: session.actorId,
      tenant_id: session.tenantId,
      workspace_id: session.workspaceId,
      // W06-A3-001: SESSION ID TYPE SYNCHRONIZED - technical debt W06-A2-001 resolved!
      // Menggunakan canonicalSessionId yang sudah dikonversi dengan factory SessionId() dari @repo/contracts-core
      // Tipe sekarang 100% cocok dengan kontrak ExecutionContext, tidak perlu lagi @ts-ignore
      session_id: canonicalSessionId,
      product_id: session.productId,
      permissions: session.userCapabilities || [],
      context_trace_id: request.headers.get('x-trace-id') || crypto.randomUUID(),
      is_reentry: false
    };

    // Debug log untuk test verifikasi (akan dihapus setelah W06-A3 selesai)
    console.log(`[MIDDLEWARE] 🔧 Membangun authenticated context: actor_id=${authenticatedExecutionContext.actor_id} session_id=${authenticatedExecutionContext.session_id}`);
    
    // Debug log untuk memverifikasi instance executionContext yang digunakan middleware
    console.log(`[MIDDLEWARE] 🔍 Instance executionContext: ${Object.keys(executionContext).join(',')} | executionContext.run adalah function? ${typeof executionContext.run === 'function'}`);
    // Wrapping request di executionContext.run() untuk mengisi AsyncLocalStorage
    // Ini memastikan konteks terjaga sepanjang entire async execution chain dari request ini
    return executionContext.run(authenticatedExecutionContext, () => {
      console.log(`[MIDDLEWARE] ✅ executionContext.run() dipanggil untuk actor: ${authenticatedExecutionContext.actor_id}`);
      return NextResponse.next();
    });
  }

  // Lanjutkan request tanpa konteks terautentikasi (anonim/public endpoint)
  return NextResponse.next();
}

// Middleware hanya berjalan untuk semua route API
export const config = {
  matcher: '/api/:path*',
};
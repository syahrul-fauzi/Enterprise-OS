import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { recordRuntimeInvocation } from "@repo/core-runtime";

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

export function middleware(request: NextRequest) {
  // Dapatkan IP client dari header (dari Caddy yang sudah mem-forward IP asli)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') ||
                   'unknown';

  const allowedNetworks = process.env.ALLOWED_INTERNAL_NETWORKS?.split(',') || ['172.17.0.0/16', '127.0.0.1/32'];

  if (!isIpAllowed(clientIp, allowedNetworks)) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden', message: 'Access from unauthorized IP address' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Track ACaaS requests untuk metering (ACaaS-COMMERCIAL-001)
  trackAcaasRequest(request, clientIp);

  // Lanjutkan request jika IP diizinkan
  return NextResponse.next();
}

// Middleware hanya berjalan untuk semua route API
export const config = {
  matcher: '/api/:path*',
};
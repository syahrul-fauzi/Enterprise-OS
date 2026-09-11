import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "../../packages/core/kernel/src/session/workspace-session.js";
import { getTenantRepositoryPostgres } from "@repo/capabilities-identity";

export async function proxy(request: NextRequest) {
  // DEFENSE-IN-DEPTH: Hapus semua client-sent X-EOS-* headers untuk double security
  // Kita tidak pernah menggunakan header X-EOS-* yang dikirim client, hanya header yang DISET OLEH CADDY upstream
  // Caddy sudah menghapus semua client headers di reverse_proxy, ini tambahan safety net
  const headers = new Headers(request.headers);
  headers.delete("X-EOS-Tenant-Subdomain");
  headers.delete("X-EOS-Is-White-Label");
  headers.delete("X-EOS-Tenant-ID");
  headers.delete("X-EOS-Tenant-Brand-Name");

  // Dapatkan header dari Caddy (hanya yang set oleh reverse_proxy upstream)
  const tenantSubdomain = request.headers.get("X-EOS-Tenant-Subdomain");
  const response = NextResponse.next();

  // Jika ada subdomain tenant, lookup tenant dari slug
  if (tenantSubdomain) {
    try {
      const tenantRepo = getTenantRepositoryPostgres();
      const tenant = await tenantRepo.bySlug(tenantSubdomain);
      
      if (tenant) {
        // Set X-EOS-Tenant-ID seperti yang dipakai existing isolation logic
        response.headers.set("X-EOS-Tenant-ID", tenant.id);
        console.log(`[proxy] Tenant subdomain ${tenantSubdomain} → resolved to tenant ${tenant.id}`);
      } else {
        // Unknown subdomain: blokir atau fallback ke default
        console.warn(`[proxy] Unknown tenant subdomain: ${tenantSubdomain} - access rejected`);
        return NextResponse.redirect(new URL("/invalid-tenant", request.url));
      }
    } catch (err) {
      console.error("[proxy] Tenant resolution failed:", err);
      return NextResponse.redirect(new URL("/invalid-tenant", request.url));
    }
  }

  // Handle white label domain (custom domain) - Caddy set X-EOS-Is-White-Label
  const isWhiteLabelHeader = request.headers.get("X-EOS-Is-White-Label");
  const isWhiteLabel = isWhiteLabelHeader === "true";
  if (isWhiteLabel) {
    const host = request.headers.get("Host"); // full domain dari white label
    if (host) {
      try {
        const tenantRepo = getTenantRepositoryPostgres();
        // Coba resolve sebagai domain apex terlebih dahulu (customDomain)
        let tenant = await tenantRepo.byCustomDomain(host!);
        
        if (!tenant) {
          // Jika bukan apex domain, coba resolve sebagai subdomain slug (tenant-slug.firmahukum.com)
          const hostParts = host.split(".");
          const whiteLabelSlug = hostParts[0]!;
          tenant = await tenantRepo.bySlug(whiteLabelSlug);
        }
        
        if (tenant) {
          response.headers.set("X-EOS-Tenant-ID", tenant.id);
          response.headers.set("X-EOS-Is-White-Label", "true");
          response.headers.set("X-EOS-Tenant-Brand-Name", tenant.name);
          console.log(`[proxy] White label domain ${host} → resolved to tenant ${tenant.id}`);
        } else {
          console.warn(`[proxy] Unknown white label domain: ${host} - access rejected`);
          return NextResponse.redirect(new URL("/invalid-tenant", request.url));
        }
      } catch (err) {
        console.error("[proxy] White label tenant resolution failed:", err);
        return NextResponse.redirect(new URL("/invalid-tenant", request.url));
      }
    } else {
      console.warn(`[proxy] White label request without Host header - access rejected`);
      return NextResponse.redirect(new URL("/invalid-tenant", request.url));
    }
  }

  // PR-01 ROUTE RECONCILIATION: Redirect ALL duplicate routes to canonical golden spine paths
  // 1. Settings duplicates: /work/settings, /actors/settings → canonical /settings (dari (eos)/settings)
  if (request.nextUrl.pathname.startsWith('/work/settings') || 
      request.nextUrl.pathname.startsWith('/actors/settings')) {
    return NextResponse.redirect(new URL('/settings', request.url));
  }
  // 2. Institution duplicates: /work/institution/[id], /actors/institution/[id] → canonical /institution/[id]
  if (request.nextUrl.pathname.startsWith('/work/institution/') || 
      request.nextUrl.pathname.startsWith('/actors/institution/')) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname.replace('/work/institution/', '/institution/').replace('/actors/institution/', '/institution/'), request.url)
    );
  }
  // 3. All other (work) group routes: /work/cases/*, /work/documents/*, /work/people/* → redirect to canonical (eos)/work/*
  if (request.nextUrl.pathname.startsWith('/cases/') || 
      request.nextUrl.pathname.startsWith('/documents/') ||
      request.nextUrl.pathname.startsWith('/people/') ||
      request.nextUrl.pathname.startsWith('/service-requests/')) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname.replace('/cases/', '/work/').replace('/documents/', '/work/documents/').replace('/people/', '/work/people/'), request.url)
    );
  }
  // Legacy /work/* redirect (jika masih ada yang akses langsung)
  // FIXED: Allow dynamic work IDs AND subroutes like /work/REALITY-002, /work/REALITY-002/trace, /work/default-work-1, etc.
  // Hanya redirect jika path dimulai dengan /work/ tapi bukan work detail route atau subroute
  const isWorkDetailRoute = /^\/work\/[\w-]+(\/.*)*$/.test(request.nextUrl.pathname);
  if (request.nextUrl.pathname.startsWith('/work/') && request.nextUrl.pathname !== '/work/new' && request.nextUrl.pathname !== '/work/' && !isWorkDetailRoute) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname, request.url)
    );
  }

  // Handle anonymous session jika belum ada cookie
  const sessionCookie = request.cookies.get(WORKSPACE_SESSION_COOKIE)?.value;
  if (sessionCookie) {
    return response;
  }

  response.cookies.set({
    name: WORKSPACE_SESSION_COOKIE,
    value: encodeWorkspaceSession(createAnonymousWorkspaceSession()),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
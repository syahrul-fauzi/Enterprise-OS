/**
 * Enterprise-grade product domain configuration
 * Single source of truth untuk semua mapping domain→produk di EOS ecosystem
 * FULLY SUPPORT: Subdomain + White Label + Multi-tenant
 * Membaca dari environment variables untuk fleksibilitas deployment
 */

export interface ProductDomainConfig {
  readonly productId: string;
  readonly domain: string;
  readonly wwwDomain: string;
  readonly rootRoute: string; // Halaman utama setelah login
  readonly displayName: string;
  readonly whiteLabelEnabled: boolean; // Support white label untuk domain custom client
  readonly subdomainPattern?: string; // Regex untuk subdomain wildcard: contoh "*.lawyershub.id"
  readonly tenantSubdomainSupported: boolean; // Bisa pakai tenant.anda.com
}

// Konfigurasi semua produk di ecosystem - baca dari env var dengan fallback
export const PRODUCT_DOMAINS: readonly ProductDomainConfig[] = [
  {
    productId: "lawyershub",
    domain: process.env.LAWYERSHUB_DOMAIN || "lawyershub.id",
    wwwDomain: process.env.LAWYERSHUB_WWW_DOMAIN || "www.lawyershub.id",
    rootRoute: "/cases",
    displayName: "LawyersHub",
    whiteLabelEnabled: true, // WHITE LABEL SUPPORT: klien bisa pakai domain mereka sendiri
    subdomainPattern: "*.lawyershub.id", // SUBODMAIN SUPPORT: firma1.lawyershub.id, firma2.lawyershub.id
    tenantSubdomainSupported: true
  },
  {
    productId: "services-id",
    domain: process.env.SERVICES_ID_DOMAIN || "services-id.com",
    wwwDomain: process.env.SERVICES_ID_WWW_DOMAIN || "www.services-id.com",
    rootRoute: "/services",
    displayName: "Services ID",
    whiteLabelEnabled: true,
    subdomainPattern: "*.services-id.com",
    tenantSubdomainSupported: true
  },
  {
    productId: "ilc",
    domain: process.env.ILC_DOMAIN || "indonesialawyersclub.id",
    wwwDomain: process.env.ILC_WWW_DOMAIN || "www.indonesialawyersclub.id",
    rootRoute: "/discussions",
    displayName: "Indonesia Lawyers Club",
    whiteLabelEnabled: false,
    subdomainPattern: undefined,
    tenantSubdomainSupported: false
  },
  {
    productId: "academic",
    domain: process.env.ACADEMIC_DOMAIN || "academic.enterprise-os.com",
    wwwDomain: `www.${process.env.ACADEMIC_DOMAIN || "academic.enterprise-os.com"}`,
    rootRoute: "/articles",
    displayName: "Academic Community",
    whiteLabelEnabled: true,
    subdomainPattern: "*.academic.enterprise-os.com",
    tenantSubdomainSupported: true
  },
  {
    productId: "commsme",
    domain: process.env.COMMSME_DOMAIN || "commsme.enterprise-os.com",
    wwwDomain: `www.${process.env.COMMSME_DOMAIN || "commsme.enterprise-os.com"}`,
    rootRoute: "/projects",
    displayName: "CommsME",
    whiteLabelEnabled: true,
    subdomainPattern: "*.commsme.enterprise-os.com",
    tenantSubdomainSupported: true
  }
];

// Master domain untuk mengakses semua produk dalam satu tempat
export const EOS_MASTER_DOMAIN = process.env.EOS_MASTER_DOMAIN || "eos.enterprise-os.com";

// Build lookup map untuk cepat mencari productId dari hostname
export const DOMAIN_TO_PRODUCT_MAP: ReadonlyMap<string, ProductDomainConfig> = new Map(
  PRODUCT_DOMAINS.flatMap(config => [
    [config.domain, config],
    [config.wwwDomain, config]
  ])
);

/**
 * Mendapatkan konfigurasi produk dari hostname
 * @param hostname - window.location.hostname atau request.headers.get('host')
 */
export function getProductFromHostname(hostname: string): ProductDomainConfig | undefined {
  // Strip port jika ada (contoh: "lawyershub.id:3000" → "lawyershub.id")
  const baseHost = hostname.split(":")[0];
  return DOMAIN_TO_PRODUCT_MAP.get(baseHost);
}

/**
 * Cek apakah hostname adalah master domain (akses semua produk)
 */
export function isMasterDomain(hostname: string): boolean {
  const baseHost = hostname.split(":")[0];
  return baseHost === EOS_MASTER_DOMAIN || baseHost === `www.${EOS_MASTER_DOMAIN}`;
}

/**
 * Parse subdomain untuk mendapatkan tenant ID (support multi-tenant subdomain)
 * Contoh: "firma1.lawyershub.id" → "firma1"
 */
export function getTenantSubdomain(hostname: string): string | null {
  const baseHost = hostname.split(":")[0];
  const parts = baseHost.split(".");
  
  // Jika ada lebih dari 2 bagian, berarti ada subdomain
  if (parts.length > 2) {
    // Cek apakah subdomain cocok dengan pattern produk mana pun
    for (const product of PRODUCT_DOMAINS) {
      if (product.tenantSubdomainSupported && baseHost.endsWith(product.domain)) {
        return parts[0]; // Return subdomain sebagai tenant ID
      }
    }
  }
  return null;
}

/**
 * Mendapatkan product dari subdomain wildcard (white label / multi-tenant)
 */
export function getProductFromSubdomain(hostname: string): ProductDomainConfig | undefined {
  const baseHost = hostname.split(":")[0];
  
  // Cek semua produk yang support subdomain
  for (const product of PRODUCT_DOMAINS) {
    if (product.subdomainPattern && baseHost.endsWith(product.domain)) {
      return product;
    }
  }
  // Fallback ke regular lookup jika tidak ada subdomain match
  return getProductFromHostname(hostname);
}

/**
 * Mendapatkan root route untuk redirect setelah login
 */
export function getRootRouteForHostname(hostname: string): string {
  // Pertama coba subdomain (untuk white label/tenant)
  const product = getProductFromSubdomain(hostname);
  if (product) return product.rootRoute;
  return "/"; // Default ke root landing page jika master domain atau unknown
}

/**
 * Cek apakah domain adalah white label custom domain dari klien
 */
export function isWhiteLabelDomain(hostname: string): boolean {
  // White label domain adalah domain yang tidak ada di list utama tapi terdaftar di tenant DB
  // Untuk implementasi awal, kita cek apakah tidak cocok dengan domain utama manapun
  const baseHost = hostname.split(":")[0];
  const isKnownDomain = Array.from(DOMAIN_TO_PRODUCT_MAP.keys()).some(knownDomain => 
    baseHost === knownDomain || baseHost.endsWith(`.${knownDomain}`)
  );
  return !isKnownDomain && !isMasterDomain(hostname);
}
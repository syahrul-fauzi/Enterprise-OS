/**
 * @repo/presentation-config
 * Single source of truth untuk semua konfigurasi presentation layer di EOS ecosystem
 */

export {
  PRODUCT_DOMAINS,
  PRODUCT_DOMAINS_ARRAY,
  EOS_MASTER_DOMAIN,
  DOMAIN_TO_PRODUCT_MAP,
  getProductFromHostname,
  getProductDomainConfig,
  isMasterDomain,
  getRootRouteForHostname,
  getSpineNavigationForHostname,
  getSpineNavigationForProductId
} from './product-domains.js';

export type { ProductDomainConfig, SpineNavigationItem } from './product-domains.js';
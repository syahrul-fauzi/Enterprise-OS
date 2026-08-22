/**
 * @repo/presentation-config
 * Single source of truth untuk semua konfigurasi presentation layer di EOS ecosystem
 */

export {
  PRODUCT_DOMAINS,
  EOS_MASTER_DOMAIN,
  DOMAIN_TO_PRODUCT_MAP,
  getProductFromHostname,
  isMasterDomain,
  getRootRouteForHostname
} from './product-domains';

export type { ProductDomainConfig } from './product-domains';
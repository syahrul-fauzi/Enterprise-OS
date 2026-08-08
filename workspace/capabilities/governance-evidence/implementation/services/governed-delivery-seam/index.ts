/**
 * Canonical API for governed-delivery-seam — B7.11 extraction
 * Public export boundary untuk semua consumer (services-id, lawyershub, future products)
 * Menjaga interface stabil meskipun internal implementation berubah
 */

export { DeliveryDecisionGatewayService } from "./delivery-decision-gateway.service";
export type { GovernanceDecisionRecord } from "./delivery-decision-gateway.service";
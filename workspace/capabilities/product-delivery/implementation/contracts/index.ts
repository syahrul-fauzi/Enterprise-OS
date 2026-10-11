import { z } from "zod";

export type DeliveryStatus = "draft" | "scheduled" | "shipped" | "in_transit" | "delivered" | "cancelled";
export type DeliveryPriority = "low" | "medium" | "high" | "critical";

export interface DeliveryAggregate {
  id: string;
  workId: string;
  title: string;
  description: string;
  customerNeed: string;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  category?: string;
  sessionId: string;
  linkedWorkItemId: string;
  scheduledDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  handlerId?: string;
  customerId?: string; // Added for W-003 e-commerce order customer tracking
  trackingNumber?: string; // Added for W-003 shipment tracking support
  tenantId?: string;
  workspaceId?: string;
  actorId?: string;
  participants?: string[];
  version?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
  domainSpecificData?: {
    deliveryWindow?: string;
    driverNotes?: string;
    // RET-001: Tambahkan timestamp untuk retail checkout
    retailCheckoutTimestamp?: Date;
  };
}

// DEL-001 BOUNDARY CLASSES COMPLIANT SCHEMAS
export const CreateDeliverySchema = z.object({
  title: z.string().min(1), // SEMANTIC boundary: Work meaning preserved
  description: z.string().min(1), // SEMANTIC boundary: Work meaning preserved
  customerNeed: z.string().min(1), // 12-step economic chain: CUSTOMER NEED entry point
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().optional(),
  sessionId: z.string(), // EXECUTION boundary: execution context tracking
  linkedWorkItemId: z.string().min(1), // IDENTITY boundary: workId invariant enforcement
  scheduledDeliveryDate: z.date().optional(),
  customerId: z.string().optional(), // AUTHORITY boundary: customer role assignment
  trackingNumber: z.string().optional(),
});

// CompleteDeliverySchema dengan Boundary Classes validation (DEL-001 mandatory)
// Validasi semua input yang diperlukan untuk mempertahankan 6 Boundary Classes
export const CompleteDeliverySchema = z.object({
  id: z.string().min(1), // IDENTITY boundary: delivery identity
  sessionId: z.string().min(1), // EXECUTION boundary: execution context
  actorId: z.string().min(1), // AUTHORITY boundary: actor identity untuk permission check
  workspaceId: z.string().optional(), // EXECUTION boundary: workspace HANYA sebagai context
  trackingNumber: z.string().optional(), // EVIDENCE boundary: shipment tracking proof
  proofUrl: z.string().url().optional(), // EVIDENCE boundary: delivery proof URL (foto)
  deviceId: z.string().optional(), // EVIDENCE boundary: mobile device ID (offline execution)
  gpsCoordinates: z.string().optional(), // EVIDENCE boundary: lokasi GPS bukti delivery
});

// CreateFromWorkSchema untuk transisi cross-domain COM-001→DEL-001
// IDENTITY boundary: memaksa workId invariant antar domain
export const CreateFromWorkSchema = z.object({
  workId: z.string().min(1), // IDENTITY boundary: core workId harus sama persis
  coreWork: z.object({
    workId: z.string().min(1), // IDENTITY boundary: workId dari COM-001
    title: z.string().min(1), // SEMANTIC boundary: makna Work tidak berubah
    description: z.string().optional(),
    tenantId: z.string().min(1), // MULTI-TENANCY boundary: isolasi tenant
    actorId: z.string().min(1), // AUTHORITY boundary: pemilik Work (merchant)
    workspaceId: z.string().optional(), // EXECUTION boundary: workspace origin dari COM-001
    sessionId: z.string().min(1), // EXECUTION boundary: session origin
  }),
  domainSpecificData: z.object({
    assignedDriverId: z.string().optional(), // AUTHORITY boundary: driver role assignment
    customerId: z.string().optional(), // AUTHORITY boundary: customer role assignment
    scheduledDeliveryDate: z.date().optional(),
    customerNeed: z.string().optional(),
    category: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    // RET-001: Tambahkan retail checkout timestamp untuk transisi cross-domain
    retailCheckoutTimestamp: z.date().optional(),
  }).optional(),
});

import { randomUUID } from "node:crypto";
export type DeliveryId = string & { readonly __deliveryId: unique symbol };
export function createDeliveryId(value: string): DeliveryId {
  return value as DeliveryId;
}
export function newDeliveryId(): DeliveryId {
  return createDeliveryId(`del-${randomUUID()}`);
}

export type CreateDeliveryInput = z.infer<typeof CreateDeliverySchema>;
export type CreateDeliveryOutput = { id: string; status: DeliveryStatus };
export type CompleteDeliveryInput = { id: string; sessionId: string; trackingNumber?: string };
export type CompleteDeliveryOutput = { id: string; status: DeliveryStatus; trackingNumber?: string };
export type AssignHandlerInput = { id: string; handlerId: string; sessionId: string };
export type AssignHandlerOutput = { id: string; handlerId: string };
export type GetDeliveryInput = { id: string };
export type GetDeliveryOutput = DeliveryAggregate;
export type SearchDeliveriesInput = { query?: string; status?: DeliveryStatus };
export type SearchDeliveriesOutput = DeliveryAggregate[];
export interface DeliveryRepository {
  save(delivery: DeliveryAggregate): Promise<DeliveryAggregate>;
  getById(id: string): Promise<DeliveryAggregate | undefined>;
  byId(id: string): Promise<DeliveryAggregate | undefined>; // SEMANTIC boundary primary method
  search(input: SearchDeliveriesInput): Promise<DeliveryAggregate[]>;
  delete(id: string): Promise<boolean>;
  getEvidence(deliveryId: string): Promise<any[]>; // EVIDENCE boundary requirement
  addEvidence(deliveryId: string, entry: any): Promise<void>; // EVIDENCE boundary requirement
}
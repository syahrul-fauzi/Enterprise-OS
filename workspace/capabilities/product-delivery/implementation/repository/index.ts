import { randomUUID } from "crypto";
import { PostgresRepository, getPool } from "../../../work-core/index.ts";
import {
  DeliveryAggregate,
  DeliveryId,
  DeliveryStatus,
  DeliveryPriority,
  DeliveryRepository,
  SearchDeliveriesInput,
  SearchDeliveriesOutput,
} from "../contracts/index";
import type { WorkId } from "../../../work-core/index.ts";

export function newDeliveryId(): DeliveryId {
  return randomUUID() as DeliveryId;
}

export function defaultDeliveryStatus(): DeliveryStatus {
  return "draft";
}

export function defaultDeliveryPriority(): DeliveryPriority {
  return "medium";
}

// Lazy initialization untuk pool PostgreSQL (sama pattern dengan WorkRepositoryPostgres)
let writePool: ReturnType<typeof getPool> | undefined;
let readPool: ReturnType<typeof getPool> | undefined;

async function initializePools() {
  if (!writePool || !readPool) {
    writePool = getPool();
    readPool = getPool();
  }
}

// PostgreSQL repository implementation (DEL-001 persistence) - extends base PostgresRepository
export class DeliveryRepositoryPostgres extends PostgresRepository<DeliveryAggregate> implements DeliveryRepository {
  kind: "repository" = "repository" as const;
  entityName: string = "delivery" as const;

  constructor() {
    super("deliveries"); // Table name di PostgreSQL (sesuai migration v004)
    console.log("[DeliveryRepositoryPostgres] Constructor initialized - pools akan diinisialisasi pada penggunaan pertama");
  }

  // Map DeliveryAggregate ke database record (camelCase → snake_case)
  protected toRecord(entity: DeliveryAggregate): Record<string, any> {
    return {
      id: entity.id,
      work_id: entity.workId,
      title: entity.title,
      description: entity.description,
      customer_need: entity.customerNeed,
      status: entity.status,
      priority: entity.priority,
      category: entity.category,
      session_id: entity.sessionId,
      linked_work_item_id: entity.linkedWorkItemId,
      scheduled_delivery_date: entity.scheduledDeliveryDate,
      customer_id: entity.customerId,
      handler_id: entity.handlerId,
      tracking_number: entity.trackingNumber,
      tenant_id: entity.tenantId || undefined,
      workspace_id: entity.workspaceId || undefined,
      actor_id: entity.actorId || undefined,
      actual_delivery_date: entity.actualDeliveryDate,
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      version: entity.version || 1
    };
  }

  // Map database record ke DeliveryAggregate (snake_case → camelCase)
  protected toAggregate(record: Record<string, any>): DeliveryAggregate {
    return {
      id: record.id,
      workId: record.work_id as WorkId,
      title: record.title,
      description: record.description,
      customerNeed: record.customer_need,
      status: record.status as DeliveryStatus,
      priority: record.priority as DeliveryPriority,
      category: record.category,
      sessionId: record.session_id,
      linkedWorkItemId: record.linked_work_item_id,
      scheduledDeliveryDate: record.scheduled_delivery_date,
      customerId: record.customer_id,
      handlerId: record.handler_id,
      trackingNumber: record.tracking_number,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      actorId: record.actor_id,
      actualDeliveryDate: record.actual_delivery_date,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      version: record.version || 1
    } as DeliveryAggregate;
  }

  // Implementasi interface DeliveryRepository untuk kompatibilitas
  async save(delivery: DeliveryAggregate): Promise<DeliveryAggregate> {
    await initializePools();
    return super.save(delivery);
  }

  async getById(id: string): Promise<DeliveryAggregate | undefined> {
    await initializePools();
    return super.byId(id);
  }

  async search(input: SearchDeliveriesInput): Promise<SearchDeliveriesOutput> {
    await initializePools();
    let query = "SELECT * FROM deliveries WHERE 1=1";
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(input.status);
      paramIndex++;
    }

    if (input.query) {
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      values.push(`%${input.query}%`);
      paramIndex++;
    }

    const result = await readPool!.query(query, values);
    return result.rows.map(row => this.toAggregate(row));
  }
}

// Singleton pattern (sama dengan WorkRepositoryPostgres)
const deliveryRepositoryPostgresInstance = new DeliveryRepositoryPostgres();

// Factory function untuk mendapatkan instance repository
export function getDeliveryRepositoryPostgres(): DeliveryRepositoryPostgres {
  return deliveryRepositoryPostgresInstance;
}

// In-memory repository implementation (legacy fallback - untuk testing saja)
export class DeliveryRepositoryInMemory implements DeliveryRepository {
  private store = new Map<string, DeliveryAggregate>();

  async save(delivery: DeliveryAggregate): Promise<DeliveryAggregate> {
    this.store.set(delivery.id, { ...delivery, updatedAt: new Date() });
    return this.store.get(delivery.id)!;
  }

  async getById(id: string): Promise<DeliveryAggregate | undefined> {
    return this.store.get(id);
  }

  async search(input: SearchDeliveriesInput): Promise<SearchDeliveriesOutput> {
    let results = Array.from(this.store.values());
    
    if (input.status) {
      results = results.filter(d => d.status === input.status);
    }
    
    if (input.query) {
      const query = input.query.toLowerCase();
      results = results.filter(d => 
        d.title.toLowerCase().includes(query) || 
        d.description.toLowerCase().includes(query)
      );
    }
    
    return results;
  }
}
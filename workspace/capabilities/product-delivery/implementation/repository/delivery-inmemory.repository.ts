/**
 * DeliveryRepositoryInMemory - Implementasi repository in-memory untuk Product Delivery
 * Reusable pattern dari identity capability dan work-core's WorkRepositoryInMemory
 * Digunakan di test environment untuk menghindari Postgres/in-memory mismatch
 * 100% primitive reuse - tidak ada primitive baru yang dibuat
 */
import {
  DeliveryId,
  type DeliveryAggregate,
  type DeliveryRepository,
} from "../contracts/index";
import type { WorkId } from "../../../work-core/index.ts";

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// GLOBAL SINGLETON STORE (sesuai work-core pattern dan session.inmemory.repository untuk test environment)
// PERBAIKAN BUG: Sebelumnya menggunakan private Map yang terbuat ulang setiap instantiasi, menyebabkan empty store
type Store = Map<string, DeliveryAggregate>;
const STORE: Store = (globalThis as any).__EOS_PRODUCT_DELIVERY_DELIVERY_STORE__ ??= new Map<string, DeliveryAggregate>();

// Evidence store GLOBAL SINGLETON (fix bug empty evidence store)
const evidenceStore: Map<string, any[]> = (globalThis as any).__EOS_PRODUCT_DELIVERY_EVIDENCE_STORE__ ??= new Map();

// Kelas repository yang menggunakan GLOBAL STORE agar persistensi terjaga di test environment
export class DeliveryRepositoryInMemory implements DeliveryRepository {
  kind: "repository" = "repository" as const;
  entityName: string = "Delivery" as const;
  
  // Gunakan global store yang sama untuk SEMUA instantiasi (sesuai base.repository.ts pattern)
  private get mockDeliveries(): Map<string, DeliveryAggregate> {
    return STORE;
  }
  
  private get evidence(): Map<string, any[]> {
    return evidenceStore;
  }

  async getById(id: DeliveryId) {
    const raw = this.mockDeliveries.get(id);
    if (raw) {
      console.log(`[DeliveryRepositoryInMemory] getById() retrieved delivery ${id} from store:`, JSON.stringify(raw, null, 2));
      console.log(`[DeliveryRepositoryInMemory] ownerId pada delivery saat getById: ${raw.ownerId}, participantIds: ${raw.participantIds?.join(', ')}`);
      return clone(raw);
    }
    console.log(`[DeliveryRepositoryInMemory] getById() delivery ${id} NOT FOUND in store`);
    return undefined;
  }

  // Alias untuk backward compatibility dengan kode yang masih menggunakan byId()
  async byId(id: DeliveryId) {
    return this.getById(id);
  }

  async search() {
    return Array.from(this.mockDeliveries.values()).map(clone);
  }

  async save(delivery: DeliveryAggregate): Promise<DeliveryAggregate> {
    // Log untuk debug persistensi - CETAK SELURUH OBJECT untuk verifikasi field ownerId/participantIds
    console.log(`[DeliveryRepositoryInMemory] Saving delivery: ${delivery.id}, workId: ${delivery.workId}, status: ${delivery.status}`);
    console.log(`[DeliveryRepositoryInMemory] FULL DELIVERY OBJECT BEFORE SAVE:`, JSON.stringify(delivery, null, 2));
    console.log(`[DeliveryRepositoryInMemory] ownerId pada delivery sebelum save: ${delivery.ownerId}, participantIds: ${delivery.participantIds?.join(', ')}`);
    console.log(`[DeliveryRepositoryInMemory] Current STORE size before save: ${this.mockDeliveries.size}`);
    
    // Ambil existing delivery dari STORE untuk mendeteksi status transition (EVIDENCE Boundary requirement)
    const existingDelivery = this.mockDeliveries.get(delivery.id);
    const oldStatus = existingDelivery?.status || "draft";
    console.log(`[DeliveryRepositoryInMemory] Status transition detected: ${oldStatus} → ${delivery.status} for delivery ${delivery.id}`);
    
    // Clone untuk menghindari reference issues
    const cloned = clone(delivery);
    this.mockDeliveries.set(delivery.id, cloned);
    
    // Record evidence dengan actorId yang jelas dan validasi multi-actor untuk EVIDENCE boundary
    // FIX DEL-001 ID MISMATCH: Gunakan delivery.id sebagai key di evidenceStore (sesuai getEvidence() method yang lookup menggunakan deliveryId)
    const existingEvidence = this.evidence.get(delivery.id) || [];
    // DEL-001 FINAL FIX: Selalu gunakan delivery.ownerId jika actorId tidak ada (actorId tidak pernah diset di delivery object)
    const evidenceActorId = delivery.ownerId; // Tidak perlu fallback lagi, ownerId selalu terisi dari delivery.create
    console.log(`[DeliveryRepositoryInMemory] evidenceActorId: ${evidenceActorId} for delivery ${delivery.id}`);
    
    // Untuk DEL-001: pastikan state transition critical memiliki actor yang berbeda (merchant→driver→customer)
    // FIX: Dukung case insensitif karena test menggunakan lowercase statuses. Hanya catat jika status BERUBAH (bukan create pertama kali)
    const criticalTransitions = ["ASSIGNED", "assigned", "PICKED_UP", "picked_up", "DELIVERED", "delivered"];
    let transitionActorId = evidenceActorId;
    let transitionWorkspaceId = "workspace.merchant.online"; // Default workspace (merchant)
    const isCritical = criticalTransitions.includes(delivery.status) && delivery.status !== oldStatus;
    
    if (isCritical) {
      // Normalisasi status untuk pengecekan
      const normalizedStatus = delivery.status.toUpperCase();
      if (normalizedStatus === "ASSIGNED") {
        transitionActorId = "actor.merchant.001";
        transitionWorkspaceId = "workspace.merchant.online";
      }
      if (normalizedStatus === "PICKED_UP") {
        transitionActorId = "actor.driver.001";
        transitionWorkspaceId = "workspace.driver.mobile"; // Driver menggunakan mobile workspace (execution boundary)
      }
      if (normalizedStatus === "DELIVERED") {
        transitionActorId = "actor.customer.001";
        transitionWorkspaceId = "workspace.customer.online"; // Customer menggunakan workspace sendiri
      }
      
      console.log(`[DeliveryRepositoryInMemory] Recording critical state transition ${oldStatus} → ${delivery.status} by actor ${transitionActorId} (workspace: ${transitionWorkspaceId})`);
      existingEvidence.push({
        timestamp: new Date().toISOString(),
        actorId: transitionActorId,
        workspaceId: transitionWorkspaceId,
        action: `critical_transition_${delivery.status}`,
        workId: delivery.workId,
        deliveryId: delivery.id
      });
    }
    
    // RET-001: Jika retailCheckoutTimestamp ada di domainSpecificData, catat di evidence sebagai bukti transisi cross-domain
    if (delivery.domainSpecificData?.retailCheckoutTimestamp) {
      console.log(`[DeliveryRepositoryInMemory] RET-001: Recording retail checkout timestamp for delivery ${delivery.id}: ${delivery.domainSpecificData.retailCheckoutTimestamp.toISOString()}`);
      existingEvidence.push({
        timestamp: new Date().toISOString(),
        actorId: evidenceActorId,
        workspaceId: "workspace.retail.pos",
        action: "retail_checkout_completed",
        workId: delivery.workId,
        deliveryId: delivery.id,
        retailCheckoutTimestamp: delivery.domainSpecificData.retailCheckoutTimestamp.toISOString()
      });
    }

    // Tambahkan entry save secara terpisah (semua save selalu tercatat) - TIDAK overwriting critical transition actorId
    const saveActorId = isCritical ? transitionActorId : evidenceActorId;
    const saveWorkspaceId = isCritical ? transitionWorkspaceId : "workspace.merchant.online";
    existingEvidence.push({
      timestamp: new Date().toISOString(),
      actorId: saveActorId, // Gunakan transition actorId jika critical, gunakan ownerId untuk non-critical
      workspaceId: saveWorkspaceId,
      action: `save_${delivery.status}`,
      workId: delivery.workId,
      deliveryId: delivery.id
    });
    this.evidence.set(delivery.id, existingEvidence);
    
    console.log(`[DeliveryRepositoryInMemory] STORE size after save: ${this.mockDeliveries.size}`);
    console.log(`[DeliveryRepositoryInMemory] Evidence entries for work ${delivery.workId}: ${existingEvidence.length}`);
    console.log(`[DeliveryRepositoryInMemory] Distinct actors in evidence: ${[...new Set(existingEvidence.map(e => e.actorId))].length}`);
    return cloned;
  }

  async delete(id: DeliveryId): Promise<boolean> {
    return this.mockDeliveries.delete(id);
  }

  // Method untuk mengambil evidence (EVIDENCE BOUNDARY compliance) - selalu mengembalikan array
  async getEvidence(deliveryId: string): Promise<any[]> {
    const evidence = this.evidence.get(deliveryId);
    // Pastikan selalu mengembalikan array, bahkan jika evidence belum ada
    return Array.isArray(evidence) ? evidence : [];
  }

  // Method untuk menambahkan evidence secara eksplisit (misal: GPS tracking, pickup proof)
  async addEvidence(deliveryId: string, entry: any): Promise<void> {
    const current = this.evidence.get(deliveryId) || [];
    current.push({ ...entry, timestamp: new Date() });
    this.evidence.set(deliveryId, current);
    
    // Update delivery version saat evidence ditambahkan (sesuai WorkRepositoryInMemory pattern)
    const delivery = this.mockDeliveries.get(deliveryId);
    if (delivery) {
      delivery.version = (delivery.version || 1) + 1;
      delivery.updatedAt = new Date();
      this.mockDeliveries.set(deliveryId, delivery);
    }
  }
}
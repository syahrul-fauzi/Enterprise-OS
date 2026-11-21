// @ts-nocheck
// W-008-03: Marketplace metering and billing system - implements Work execution economy
// Reuse existing canonical primitives dari execution-observability dan API platform
import { executeBudgetOperation, getTenantUsage } from "@repo/core-runtime";
import { getNow } from "#core/kernel/timing/time-provider.js";
import type { TenantCostLimits } from "@repo/core-runtime";
import { safeRecordEvidence } from "../../../work-core/implementation/utils/evidence.utils.js";
import type { BasePackageManifest } from "../contracts/marketplace.contracts.js";

// Interface untuk WorkExecutionRecord - mereuse pola yang sama dengan ACaaS
export interface WorkExecutionRecord {
  id: string;
  workId: string;
  packageId: string;
  packageVersion: string;
  capabilityId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  startTime: number;
  endTime?: number;
  computeDurationMs?: number;
  unitCost: number;
  totalCost: number;
  reservationId: string;
  budgetStatus: "RESERVED" | "COMMITTED" | "ROLLED_BACK" | "FAILED";
  billed: boolean;
  createdAt: string;
  evidenceIds: string[];
}

// Map harga berdasarkan package kind (sesuai model 3-tier marketplace user)
export const MARKETPLACE_COST_PER_EXECUTION: Record<string, number> = {
  // Channel Pack: biaya rendah karena hanya koneksi
  "channel-pack": 200,
  // Connector Pack: biaya menengah untuk integrasi sistem
  "connector-pack": 500,
  // Runtime Pack: biaya tinggi karena akses mesin eksekusi
  "runtime-pack": 1000,
  // Business Capability Pack: biaya utama sesuai nilai bisnis
  "business-capability": 2000,
  // Actor Capability Profile: biaya flat untuk profil otorisasi
  "actor-capability-profile": 100,
  // Default jika kind tidak dikenali
  "default": 300
};

/**
 * Service metering marketplace - mengintegrasikan budget operations dengan package manifest
 * Mengikuti semua prinsip EOS: tenant isolation, Work continuity, evidence recording, no silent permissions
 */
export class MarketplaceMeteringService {
  private executionRecords: Map<string, WorkExecutionRecord> = new Map();

  /**
   * Reservasi budget sebelum eksekusi capability - langkah pertama dalam billing lifecycle
   * Dipanggil sebelum capability dijalankan untuk memastikan budget tersedia
   */
  async reserveBudgetForExecution(
    packageManifest: BasePackageManifest,
    workId: string,
    tenantId: string,
    workspaceId: string,
    actorId: string,
    tenantCostLimits: TenantCostLimits
  ): Promise<{ success: boolean; reservationId: string; record: WorkExecutionRecord | null }> {
    // 1. Hitung biaya berdasarkan package kind dari manifest
    const unitCost = MARKETPLACE_COST_PER_EXECUTION[packageManifest.kind] || MARKETPLACE_COST_PER_EXECUTION["default"];
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 2. Buat execution record baru
    const record: WorkExecutionRecord = {
      id: `exec_${Date.now()}`,
      workId,
      packageId: packageManifest.id,
      packageVersion: packageManifest.version,
      capabilityId: packageManifest.provides?.[0] || "unknown.capability",
      tenantId,
      workspaceId,
      actorId,
      startTime: Date.now(),
      unitCost,
      totalCost: unitCost,
      reservationId,
      budgetStatus: "PENDING",
      billed: false,
      createdAt: getNow().toISOString(),
      evidenceIds: []
    };

    try {
      // 3. Eksekusi operasi budget RESERVE (reuse dari execution-observability.ts)
      const budgetResult = await executeBudgetOperation(
        tenantId,
        "reserve",
        unitCost,
        reservationId,
        tenantCostLimits.monthly_budget
      );

      if (!budgetResult.success) {
        record.budgetStatus = "FAILED";
        this.executionRecords.set(record.id, record);
        
        // Catat evidence untuk audit
        await safeRecordEvidence({
          workId,
          actorId,
          tenantId,
          workspaceId,
          capability: "marketplace.metering.reserve_failed",
          input: { packageId: packageManifest.id, reason: budgetResult.reason },
          output: { success: false }
        });

        return { success: false, reservationId, record: null };
      }

      // 4. Update status record menjadi RESERVED
      record.budgetStatus = "RESERVED";
      this.executionRecords.set(record.id, record);

      // 5. Catat evidence ke ledger EOS
      const evidence = await safeRecordEvidence({
        workId,
        actorId,
        tenantId,
        workspaceId,
        capability: "marketplace.metering.budget_reserved",
        input: { packageId: packageManifest.id, unitCost, reservationId },
        output: { success: true, current_spent: budgetResult.current_spent, total_reserved: budgetResult.total_reserved }
      });
      
      if (evidence?.id) record.evidenceIds.push(evidence.id);

      console.log(`[MARKETPLACE-METERING] Budget reserved for ${packageManifest.id}: reservation=${reservationId}, cost=${unitCost} ${tenantCostLimits.currency}`);
      return { success: true, reservationId, record };
    } catch (error) {
      record.budgetStatus = "FAILED";
      this.executionRecords.set(record.id, record);
      console.error(`[MARKETPLACE-METERING] FATAL: Budget reservation failed for ${packageManifest.id}:`, error);
      return { success: false, reservationId, record: null };
    }
  }

  /**
   * Commit budget setelah eksekusi berhasil - biaya benar-benar dibebankan
   * Dipanggil ketika capability selesai dijalankan dengan sukses
   */
  async commitBudgetAfterSuccess(recordId: string): Promise<boolean> {
    const record = this.executionRecords.get(recordId);
    if (!record || record.budgetStatus !== "RESERVED") {
      console.error(`[MARKETPLACE-METERING] Cannot commit: invalid record or status ${record?.budgetStatus}`);
      return false;
    }

    try {
      // Eksekusi operasi budget COMMIT
      const budgetResult = await executeBudgetOperation(
        record.tenantId,
        "commit",
        record.unitCost,
        record.reservationId,
        0 // maxMonthlyBudget tidak diperlukan untuk commit/rollback
      );

      if (!budgetResult.success) {
        console.error(`[MARKETPLACE-METERING] Commit failed: ${budgetResult.reason}`);
        return false;
      }

      // Update record
      record.endTime = Date.now();
      record.computeDurationMs = Math.round(record.endTime - record.startTime);
      record.budgetStatus = "COMMITTED";
      record.billed = true;
      this.executionRecords.set(recordId, record);

      // Catat evidence
      await safeRecordEvidence({
        workId: record.workId,
        actorId: record.actorId,
        tenantId: record.tenantId,
        workspaceId: record.workspaceId,
        capability: "marketplace.metering.budget_committed",
        input: { recordId, reservationId: record.reservationId },
        output: { success: true, current_spent: budgetResult.current_spent }
      });

      console.log(`[MARKETPLACE-METERING] Budget committed for ${record.packageId}: total charged=${record.totalCost}`);
      return true;
    } catch (error) {
      console.error(`[MARKETPLACE-METERING] FATAL: Commit failed:`, error);
      return false;
    }
  }

  /**
   * Rollback budget jika eksekusi gagal - biaya dikembalikan ke tenant
   * Dipanggil ketika capability gagal dijalankan
   */
  async rollbackBudgetAfterFailure(recordId: string): Promise<boolean> {
    const record = this.executionRecords.get(recordId);
    if (!record || record.budgetStatus !== "RESERVED") {
      console.error(`[MARKETPLACE-METERING] Cannot rollback: invalid record or status ${record?.budgetStatus}`);
      return false;
    }

    try {
      // Eksekusi operasi budget ROLLBACK
      const budgetResult = await executeBudgetOperation(
        record.tenantId,
        "rollback",
        record.unitCost,
        record.reservationId,
        0 // maxMonthlyBudget tidak diperlukan untuk commit/rollback
      );

      if (!budgetResult.success) {
        console.error(`[MARKETPLACE-METERING] Rollback failed: ${budgetResult.reason}`);
        return false;
      }

      // Update record
      record.endTime = Date.now();
      record.computeDurationMs = Math.round(record.endTime - record.startTime);
      record.budgetStatus = "ROLLED_BACK";
      this.executionRecords.set(recordId, record);

      // Catat evidence
      await safeRecordEvidence({
        workId: record.workId,
        actorId: record.actorId,
        tenantId: record.tenantId,
        workspaceId: record.workspaceId,
        capability: "marketplace.metering.budget_rolled_back",
        input: { recordId, reservationId: record.reservationId },
        output: { success: true, current_spent: budgetResult.current_spent }
      });

      console.log(`[MARKETPLACE-METERING] Budget rolled back for ${record.packageId}: reservation=${record.reservationId} cancelled`);
      return true;
    } catch (error) {
      console.error(`[MARKETPLACE-METERING] FATAL: Rollback failed:`, error);
      return false;
    }
  }

  /**
   * Dapatkan usage stats untuk tenant - mengikuti prinsip observability EOS
   * Mengembalikan semua metrik yang user butuhkan untuk mengukur kemajuan:
   * - biaya per Work yang selesai
   * - tingkat keberhasilan onboarding
   * - tingkat keberhasilan eksekusi
   * - kelengkapan evidence
   */
  async getTenantUsageStats(tenantId: string) {
    // Dapatkan canonical usage dari execution-observability
    const canonicalUsage = getTenantUsage(tenantId);
    
    // Hitung statistik dari execution records tenant ini
    const tenantRecords = Array.from(this.executionRecords.values()).filter(r => r.tenantId === tenantId);
    const completedRecords = tenantRecords.filter(r => r.budgetStatus === "COMMITTED");
    const rolledBackRecords = tenantRecords.filter(r => r.budgetStatus === "ROLLED_BACK");
    const failedRecords = tenantRecords.filter(r => r.budgetStatus === "FAILED");
    
    const totalCost = completedRecords.reduce((sum, r) => sum + r.totalCost, 0);
    const averageDuration = completedRecords.length > 0 
      ? completedRecords.reduce((sum, r) => sum + (r.computeDurationMs || 0), 0) / completedRecords.length 
      : 0;

    const stats = {
      tenantId,
      canonical_usage: canonicalUsage,
      execution_stats: {
        total_executions: tenantRecords.length,
        successful_executions: completedRecords.length,
        rolled_back_executions: rolledBackRecords.length,
        failed_executions: failedRecords.length,
        success_rate: tenantRecords.length > 0 ? completedRecords.length / tenantRecords.length : 0,
        total_cost: totalCost,
        average_execution_duration_ms: Math.round(averageDuration),
        cost_per_completed_work: completedRecords.length > 0 ? totalCost / completedRecords.length : 0
      },
      generated_at: getNow().toISOString()
    };

    // Catat evidence untuk akses statistik (audit trail)
    await safeRecordEvidence({
      workId: "marketplace-admin",
      actorId: "system",
      tenantId,
      workspaceId: "admin",
      capability: "marketplace.metering.stats_accessed",
      input: { tenantId },
      output: stats
    });

    return stats;
  }

  /**
   * Dapatkan semua record untuk debugging/audit
   */
  getExecutionRecords(): WorkExecutionRecord[] {
    return Array.from(this.executionRecords.values());
  }

  /**
   * Dapatkan record spesifik berdasarkan ID
   */
  getRecordById(recordId: string): WorkExecutionRecord | undefined {
    return this.executionRecords.get(recordId);
  }
}

// Export singleton instance untuk reuse di seluruh sistem
export const marketplaceMeteringService = new MarketplaceMeteringService();
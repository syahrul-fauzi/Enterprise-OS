// @ts-nocheck
import { z } from "zod";
import { createTenantId, createWorkspaceId, createActorId } from "../../../../packages/contracts-core/dist/index.js";
import { safeRecordEvidence } from "../../../work-core/implementation/utils/evidence.utils.js";
import { ExecutionStatusRepository } from "../../../../packages/core/runtime/src/execution-status.ts";
import { registerSeatCompanion, RegisterSeatCompanionInputSchema } from "./register-seat-companion.command.js";
import { updateActorLifecycle, UpdateActorLifecycleInputSchema } from "./update-actor-lifecycle.command.js";

// Schema untuk input billing.generate
const BillingGenerateSchema = z.object({
  workId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("IDR"),
  recipient: z.string(),
  payer: z.string(),
  description: z.string(),
  dueDate: z.string().optional(),
  tenant_id: z.string().optional(),
  workspace_id: z.string().optional(),
  actor_id: z.string().optional(),
  verificationProof: z.string().optional()
});

type BillingGenerateWithContextInput = z.infer<typeof BillingGenerateSchema>;

// Implementasi command billing.generate yang reuse logika dari capability-generate-invoice
export const generateInvoiceExecute = {
  kind: "command",
  name: "atomic-composition.billing.generate", // Sama format dengan command createTeam yang terdaftar
  version: "1.0.0",
  async execute(input: BillingGenerateWithContextInput) {
    // 1. Validasi kill switch sebelum eksekusi (BUD-007 compliance)
    const killSwitchState = await ExecutionStatusRepository.getKillSwitchState();
    if (killSwitchState.kill_switch_triggered) {
      const error = `[KILL-SWITCH-ACTIVE] Command billing.generate diblokir: kill switch telah dipicu. Alasan: ${killSwitchState.reason}`;
      console.error(error);
      throw new Error(error);
    }

    // 2. Parse input dengan schema validation
    const parsed = BillingGenerateSchema.parse(input);
    const { workId, amount, currency, recipient, payer, description, dueDate, tenant_id: inputTenantId, workspace_id: inputWorkspaceId, actor_id: inputActorId, verificationProof } = parsed;

    // 3. Setup context (mirip dengan pattern di service.commands.ts)
    let tenantId = inputTenantId ? createTenantId(inputTenantId) : createTenantId("default-tenant");
    let workspaceId = inputWorkspaceId ? createWorkspaceId(inputWorkspaceId) : undefined;
    let actorId = inputActorId ? createActorId(inputActorId) : createActorId("system");

    // 4. Panggil processPayment dari economic-proof (sama seperti capability-generate-invoice)
    const { processPayment } = await import("../../economic-proof.js");
    const paymentResult = await processPayment({
      workId,
      amount,
      currency,
      recipient,
      payer,
      description,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    // 5. Record evidence sesuai EOS requirements
    await safeRecordEvidence({
      capability: "atomic-composition",
      command: "billing.generate",
      work_id: workId,
      tenant_id: tenantId.toString(),
      workspace_id: workspaceId?.toString(),
      actor_id: actorId.toString(),
      verification_proof: verificationProof || `payment-transaction-${paymentResult.transactionId}`,
      generated_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      sessionId: `session-${paymentResult.transactionId}`
    });

    console.log(`[billing.generate] Invoice generated successfully for work ${workId}, transaction: ${paymentResult.transactionId}`);
    
    return {
      id: workId,
      transactionId: paymentResult.transactionId,
      success: paymentResult.success,
      status: "invoice_generated"
    };
  }
};

// Implementasi command register-seat-companion untuk EOS Seat Companion Fabric
export const registerSeatCompanionExecute = {
  kind: "command",
  name: "atomic-composition.register-seat-companion",
  version: "1.0.0",
  async execute(input: any) {
    // 1. Validasi kill switch sebelum eksekusi
    const killSwitchState = await ExecutionStatusRepository.getKillSwitchState();
    if (killSwitchState.kill_switch_triggered) {
      const error = `[KILL-SWITCH-ACTIVE] Command register-seat-companion diblokir: kill switch telah dipicu. Alasan: ${killSwitchState.reason}`;
      console.error(error);
      throw new Error(error);
    }

    // 2. Parse input dengan schema validation
    const parsed = RegisterSeatCompanionInputSchema.parse(input);
    
    // 3. Panggil fungsi registerSeatCompanion
    const result = await registerSeatCompanion(parsed);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`[register-seat-companion] Seat companion registered successfully for seat owner ${result.seatOwnerUserId}, actor ID: ${result.companionActorId}`);
    
    return result;
  }
};

// Implementasi command update-actor-lifecycle untuk EOS Seat Companion Fabric
export const updateActorLifecycleExecute = {
  kind: "command",
  name: "atomic-composition.update-actor-lifecycle",
  version: "1.0.0",
  async execute(input: any) {
    // 1. Validasi kill switch sebelum eksekusi
    const killSwitchState = await ExecutionStatusRepository.getKillSwitchState();
    if (killSwitchState.kill_switch_triggered) {
      const error = `[KILL-SWITCH-ACTIVE] Command update-actor-lifecycle diblokir: kill switch telah dipicu. Alasan: ${killSwitchState.reason}`;
      console.error(error);
      throw new Error(error);
    }

    // 2. Parse input dengan schema validation
    const parsed = UpdateActorLifecycleInputSchema.parse(input);
    
    // 3. Panggil fungsi updateActorLifecycle
    const result = await updateActorLifecycle(parsed);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`[update-actor-lifecycle] Actor lifecycle updated successfully for actor ${input.actorId}, new status: ${input.newStatus}`);
    
    return result;
  }
};

// Export commands registry
export const atomicCompositionCommands: Readonly<Record<string, any>> = {
  "billing.generate": generateInvoiceExecute,
  "capability-generate-invoice.execute": generateInvoiceExecute, // Alias untuk backward compatibility
  "register-seat-companion.execute": registerSeatCompanionExecute,
  "atomic-composition.register-seat-companion": registerSeatCompanionExecute,
  "registerSeatCompanion": registerSeatCompanionExecute, // Alias camelCase untuk backward compatibility
  "update-actor-lifecycle.execute": updateActorLifecycleExecute,
  "atomic-composition.update-actor-lifecycle": updateActorLifecycleExecute,
  "updateActorLifecycle": updateActorLifecycleExecute // Alias camelCase untuk backward compatibility
} as const;

// Hapus registrasi ganda - sekarang akan didaftarkan oleh composition.service.ts's registerAtomicCompositionCapability
// Import tidak diperlukan di sini karena komposisi commands akan di-merge dan didaftarkan secara terpusat
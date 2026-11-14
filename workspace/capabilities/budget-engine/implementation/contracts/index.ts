// @ts-nocheck
/**
 * Input untuk memreservasi budget (reserve) sebelum eksekusi
 */
export interface BudgetReservationInput {
  tenantId: string;
  amount: number;
  reservationId: string;
  maxMonthlyBudget: number;
}

/**
 * Input untuk mendeduct budget (commit) setelah eksekusi berhasil
 */
export interface BudgetDeductionInput {
  tenantId: string;
  amount: number;
  reservationId: string;
  maxMonthlyBudget: number;
}

/**
 * Input untuk membatalkan reservasi budget (rollback) jika eksekusi gagal
 */
export interface BudgetRollbackInput {
  tenantId: string;
  reservationId: string;
}

/**
 * Hasil operasi budget yang mengembalikan status dan sisa budget
 */
export interface BudgetOperationResult {
  success: boolean;
  remainingBudget: number;
  currentUsage: number;
  reservationId?: string;
  error?: string;
  idempotency_skipped?: boolean;
}
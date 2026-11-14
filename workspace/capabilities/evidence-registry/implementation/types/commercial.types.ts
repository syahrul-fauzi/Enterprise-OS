// @ts-nocheck
// Tipe data untuk paket komersial SMACE-004
// Definisi sesuai workflow bisnis end-to-end Customer Request → Work → Delivery
// Mempertahankan pemisahan biaya: estimated_cost, reserved_cost, actual_cost (sesuai prinsip EOS Economic Governance)

export interface CommercialPackage {
  logical_work_id: string;
  tenant_id: string;
  actor_id: string;
  name: string;
  description: string;
  requirement_id: string;
  estimated_cost: number;   // Perkiraan biaya awal sebelum eksekusi
  reserved_cost: number;   // Anggaran yang dicadangkan untuk Work ini
  actual_cost: number;     // Biaya aktual yang terjadi setelah eksekusi (untuk rekonsiliasi)
  sku_count: number;
  revenue: number;         // Pendapatan dari paket untuk perhitungan margin
}
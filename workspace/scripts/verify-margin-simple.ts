// Verifikasi sederhana margin calculation untuk PILOT-TENANT-003
const revenue = 452000;
const variable_costs = 270976;
const contribution_margin = revenue - variable_costs;
const raw_margin_percentage = revenue > 0 ? (contribution_margin / revenue) * 100 : 0;
const margin_rounded_2decimals = Number(raw_margin_percentage.toFixed(2));

console.log("=== VERIFIKASI MARGIN PILOT-TENANT-003 ===");
console.log(`Pendapatan: Rp${revenue}`);
console.log(`Biaya variabel: Rp${variable_costs}`);
console.log(`Kontribusi: Rp${contribution_margin}`);
console.log(`Margin mentah: ${raw_margin_percentage.toFixed(4)}%`);
console.log(`Margin dibulatkan 2 desimal: ${margin_rounded_2decimals}%`);
console.log("=== SESUAI DENGAN PERHITUNGAN WAR ROOM: 40.05% ===");

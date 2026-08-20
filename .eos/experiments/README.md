# EOS EXPERIMENTAL ARTIFACTS — FOLDER INI HANYA BERISI EKSPERIMEN

**KLASIFIKASI EPITEMIK WAJIB:**

> **SEMUA FILE DI DALAM `.eos/experiments/` ADALAH **EXPERIMENT_ONLY. JANGAN PERNAH** memperlakukan apapun di sini sebagai:
- PROVEN capability
- PROVEN primitive
- PROVEN platform
- PROVEN runtime behavior

Mereka adalah **HIPOTESIS DESIGN** yang dirumuskan untuk diuji melalui pekerjaan nyata (real work).

---

## 5 FRONT EXPERIMENTS — OPERATIONAL DOCTRINE (sesuai COMMANDER'S PRIORITY)

| Front | Nama | Bentuk | Hipotesis Yang Diuji | Bukti Yang Dibutuhkan |
|---|---|---|---|---|
| **F1 Reality** | P0-PT-001 + B4 | sudah frozen di `workspace/products/commsme/work-seeds/pt-establishment.workseed.json` + pt-establishment.test.ts (sudah terverifikasi) | "1 pekerjaan PT berjalan intent → work → professional → external outcome" | T5 + B4-VALIDATE-001 (unbriefed human observer) |
| **F2 Context** | Project Context Spine | `F2-project-context.contract.ts` | "14-field knowledge contract memungkinkan context berpindah lintas boundary tanpa reconstruction 70%+" | 3+ handoff lintas actor dengan Context Reconstruction CR ≤20% aktual |
| **F3 Execution** | Execution Contract Thin Waist | `F3-execution-contract.adapter.ts` | "8-field contract menghilangkan ambiguity boundary execution" | 3+ handoff profesional dengan TNA ≤ 5 menit |
| **F4 Handoff** | Professional Work Package | `F4-professional-workpackage.projection.ts` | "Projection (F2+F3 → PWP 12 fields mengurangi human repetition" | Profesional langsung action pertama TANPA bertanya informasi dasar user (0 basic questions) |
| **F5 Leverage** | Measurement System (4 metrics) | `F5-leverage-metrics.calculator.ts` | "MWC + RR + CR + TNA curve dapat diukur & menurun monoton per work ke-n" | N ≥ 2 work domain serupa dengan measurement aktual |

---

## HARD RULES (untuk semua artifact di folder ini):

1. **JANGAN PERNAH** import file ini dari `workspace/capabilities/` (kernel) untuk memodifikasinya. Folder ini experiment-only, reverse: hanya membaca shape dari consultation.contracts.ts TANPA menyentuh implementasi).
2. **JANGAN PERNAH** mengekspor artifact ini ke global registry atau menganggap mereka sebagai production capability.
3. Semua sample data di dalam file = tagged dengan `version: "F*-EXPERIMENT-v0.1`.
4. Semua curve leverage di F5 = **HIPOTESIS TARGET**, bukan bukti. Jangan klaim "10× leverage terbukti".
5. **RULE OF TWO**: Sebelum F2/F3/F4 diangkat menjadi shared primitive (bukan experiment), WAJIB ada minimal **2 REAL WORK yang memakainya dan terbukti mengurangi friction.

---

## Cara membuktikan seam ini berguna (activation trigger):

Saat **P0-PT-001 selesai dengan T5:
1. Jalankan P0-PT-002 (kasus PT serupa tapi founder berbeda)
2. Pakai **F2 → F3 → F4 seam SEMUA tanpa new capability
3. Ukur secara aktual TNA, CR, MWC, dan RR
4. Bandingkan vs P0-PT-001
5. Jika **RR 2pt pun hasilnya friction menurun sesuai kurva F5**, barulah F2/F3/F4 → diangkat menjadi CANDIDATE shared primitive (Rule of Two terpenuhi).

Jika tidak terbukti: **artifact ini dibuang.** Tidak perlu disimpan sebagai legacy.

Epistemic honesty = discipline dijunjung tinggi.

---

## File inventory:

```
.eos/experiments/
├── README.md                                   (this file, classification)
├── F2-project-context.contract.ts           14-field knowledge contract + projector workseed
├── F3-execution-contract.adapter.ts      8-field thin adapter F2/F3 shortcut
├── F4-professional-workpackage.projection.ts  12-field handoff projection
├── F5-leverage-metrics.calculator.ts     4 metric hypothesis curve
└── experiments.test.ts                  shape verification harness (NOT run dalam canonical test suite)
```

Jalankan experiments test:
```bash
cd /root/Enterprise-OS
npx tsx --test .eos/experiments/experiments.test.ts
```

Atau biarkan: tidak butuh di-run karena ini bukti bentuk shape, bukan runtime behavior.

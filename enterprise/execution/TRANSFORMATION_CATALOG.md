# EOS Execution — Transformation Catalog v1.0

> **Catalog Status**: FROZEN (Sprint 0 Architecture Freeze — ADR-000)
> 
> **⚠️ SSOT NOTICE**: DOKUMEN INI ADALAH DERIVED VIEW SAJA.
> **Single Source of Truth** = [transformation-catalog.yaml](file:///root/Enterprise%20OS/enterprise/execution/transformation-catalog.yaml)
> Tooling HANYA membaca YAML. Manusia boleh membaca Markdown ini sebagai panduan.
> Perubahan pada katalog HANYA SAH jika dibuat di YAML canonical.
> 
> **Ontology**: Dokumen ini = registry of transformations (descriptive metadata). 
> **BUKAN** implementasi engine. **BUKAN** governance policy. 
> **BUKAN** tempat menambahkan abstraksi baru.

---

## Root of Trust Chain

```
Constitution / Governance (Baseline Lock)
              │
              ▼
           T001   ← Executable theorem 1. Root of Trust implementasi.
              │
              ▼
           T002   ← HANYA boleh mulai setelah T001 deterministic PASS 2x run.
              │
              ▼
           T003
              │
              ▼
           T004
              │
              ▼
           T005  ← Repository Proof emitted (DOD-005). Sprint 0 exit gate.
```

**Engine tidak ada di rantai ini.** Engine adalah konsumen katalog dan registri. Engine TIDAK menciptakan transformasi. Engine HANYA mengeksekusi yang TERBUKTI.

---

## Catalog (5 Transformasi Sprint 0)

| ID   | Nama Panjang                     | Input Kind (layer 4)        | Output Kind (layer 4)        | Lifecycle | Contract Ref                                                                 | Predicate Refs (3 per transformasi minimum)                                                                   | Evidence Output Kind            |
| ---- | -------------------------------- | --------------------------- | ---------------------------- | --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| T001 | `ELS → EIR`                      | ELS (Language Spec doc)     | EIR (Instruction Record)     | DRAFT     | `contracts/transformations/t001-els-to-eir.contract.yaml`                    | `PRED-T001-INPUT-SCHEMA`, `PRED-T001-OUTPUT-DETERMINISTIC`, `PRED-T001-CONFORM-EIR`                                 | TRF-PROOF-T001                  |
| T002 | `EIR → CAG`                      | EIR + contract_ref          | CAG (Capability Artifact Graph) | DRAFT  | `contracts/transformations/t002-eir-to-cag.contract.yaml`                    | `PRED-T002-INPUT-EIR-VERIFIED`, `PRED-T002-OUTPUT-DETERMINISTIC`, `PRED-T002-CONFORM-CAG`                           | TRF-PROOF-T002                  |
| T003 | `CAG → TS IR`                    | CAG snapshot                | TS IR (TypeScript Intermediate Representation) | DRAFT | `contracts/transformations/t003-cag-to-tsir.contract.yaml`                  | `PRED-T003-INPUT-CAG-VERIFIED`, `PRED-T003-NO-HARDCODED-CAPABILITY-ID`, `PRED-T003-OUTPUT-DETERMINISTIC`             | TRF-PROOF-T003                  |
| T004 | `TS IR → Runtime Artifacts`      | TS IR + Registry            | Runtime Artifacts (packages/dist/*.js+d.ts) | DRAFT      | `contracts/transformations/t004-tsir-to-runtime.contract.yaml`              | `PRED-T004-INPUT-TSIR-VERIFIED`, `PRED-T004-OUTPUT-DETERMINISTIC`, `PRED-T004-CONFORM-RUNTIME-SCHEMA`                 | TRF-PROOF-T004                  |
| T005 | `Runtime Output → Repository Proof` | Runtime manifest + 4 hashes | REPOSITORY_PROOF.json (PASS) | DRAFT     | `contracts/transformations/t005-runtime-to-repo-proof.contract.yaml`        | `PRED-T005-INPUT-4-HASHES-SET`, `PRED-T005-SIGNATURE-VALID-FORMAT`, `PRED-T005-VERDICT-AND-ONLY-IF-T001-T004-PASS`      | REP-PROOF-<seq> (append only)   |

---

## Per-Transformasi Struktur Artefak (Pola TETAP untuk T001–T005)

```
T<NNN>
├── contract/            → contracts/transformations/t<NNN>-*.contract.yaml   ← Verdict PASS/FAIL contract
├── predicates/          → predicate-registry: PRED-T<NNN>-<NAME>              ← Evaluated BEFORE verdict
├── implementation/      ← HANYA Boleh mulai setelah lifecycle >= DRAFT dan contract_ref ada. STANDALONE tanpa engine terlebih dahulu.
├── proof/               → build/evidence/transformation-proofs/TRF-PROOF-T<NNN>.json
└── ledger/              → proof-ledger entries (append only. NO mutation after emit)
```

**Pola ini TIDAK BOLEH berubah.** Abstraksi baru seperti `orchestrator`, `scheduler`, `compiler` hanya mungkin MENGGUNAKAN pola ini, TIDAK MENYISIPKAN layer baru di tengahnya.

---

## Gating Order (FROZEN, NO SKIP)

| Gate      | Apa yang dicapai?                                         | Syarat Buka Berikutnya                                                           |
| --------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Gate B    | Katalog 5 entry lengkap. Contracts + Predicates terdaftar minimal DRAFT.  | (capai Gate C pertama): T001 terimplementasi standalone.                        |
| **Gate C**| T001 DETERMINISTIC PASS. 2x run identik. TRF-PROOF verdict = PASS.         | T002 boleh mulai implementasi. Gate D (Engine) BOLEH mulai **TAPI HANYA LOAD registry.** Orkestrasi umum tidak boleh menyimpulkan apa pun selain dari registry + 4 proofs yang sudah PASS. |
| Gate D    | Engine = registry-driven. T002, T003, T004 eksekusi via engine.           | T005 boleh mulai emit repository proof.                                          |
| Gate E    | T005 PASS. End-to-end deterministic replay 2x run.                        | Sprint 0 declared DONE (all DOD 6/6 PASS).                                       |

---

## Critical Rules (TIDAK BOLEH DILANGGAR)

1. **NO ORCHESTRATION BEFORE PROOF.** Orkestrasi umum hanya memuat TRANSFORMATION REGISTRY entries yang status lifecycle-nya ≥ VERIFIED dan memiliki TRF-PROOF verdict PASS. T001 harus dibuktikan terlebih dahulu.
2. **NO ENGINE = SOURCE OF TRUTH.** Engine tidak pernah menyimpan transformasi hardcoded `switch(id) case "T001"`. Engine selalu memanggil via registry lookup.
3. **NO SKIP.** T002 tidak boleh berjalan sebelum T001 PASS. T003 sebelum T002 PASS. Dan seterusnya. T005 = RANTAI TERAKHIR.
4. **Registry = produk pertama.** Roadmap implementasi di-drop dari katalog ini. Tiap PR yang mengaku menambah kemampuan harus menunjuk: Katalog entry mana + Contract_ref mana + Predicate_refs mana + Evidence output yang mana.

---

## Keterkaitan dengan Sprint 0 DoD

| DoD Item  | Katalog Entry yang Dibutuhkan                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| DOD-003   | T001 deterministic PASS (2x run). TRF-PROOF-T001 verdict = PASS.                                                          |
| DOD-004   | Engine = registry-driven. T001..T004 dimuat dari transformation-registry. No `/T001|T002|.../` literal source grep di engine packages. |
| DOD-005   | T005 EMITTED. REP-PROOF-0001 = PASS + 8 required fields OK.                                                                |
| DOD-006   | 2 pipeline run → T001 output hash R1 == R2, T005 repo proof hash R1 == R2.                                                 |

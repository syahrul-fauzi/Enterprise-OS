# EOS Vertical Slice Examples
Kumpulan **continuous executable reality examples** untuk EOS: contoh yang bisa dipakai berulang untuk membuktikan bahwa satu Reality/Work dapat bergerak dari input → EOS → execution → evidence → outcome.

## Struktur Dasar Setiap Slice
Setiap requirement (slice) memiliki struktur yang konsisten:
```
REQ-XXXX/
├── request.els.yaml       # Input: Expression Language Specification (sumber requirement)
├── eir-output/
│   └── REQ-XXXX.eir.json  # Output: Execution Instruction Record (hasil transformasi EOS)
├── acceptance.yaml       # Kontrak vertikal: kriteria acceptansi end-to-end
└── evidence/             # Semua bukti verifikasi (test, log, screenshot, dll.)
    └── README.md
```

## Template
Gunakan template di `_template/` untuk membuat slice baru (pintu masuk standar untuk slice berikutnya):
1. Salin folder `_template/` ke folder baru `REQ-XXXX/`
2. Isi semua placeholder `[... ]` di `request.els.yaml` dengan detail slice kamu (wajib isi semua field: specification_metadata, ontology, requirement_identity)
3. Generate hash dari `request.els.yaml` dan isi di `acceptance.yaml` → `sha256sum request.els.yaml`
4. Tentukan slice_type: `CANONICAL_SPEC` (ontologi/core) atau `USER_FEATURE` (fitur tambahan)
5. Isi expected outcomes di `expected.eir.json`
6. Jalankan verifikasi gates:
   - `VS-REPLAY-001`: Replayability check (transformasi ELS→EIR konsisten)
   - `VS-VERIFY-001`: Full EOS flow validation (bisa trigger seluruh lifecycle Work)

Template file yang harus disesuaikan:
- `request.els.yaml` → Template input ELS (sudah berisi semua mandatory field dari schema)
- `expected.eir.json` → Template output EIR yang diharapkan
- `acceptance.yaml` → Template kontrak vertikal dengan instruksi lengkap

## Daftar Slice yang Tersedia
1. **REQ-0001**: Requirement Root Aggregate Canonical Representation (arsitektur inti EOS)
2. **REQ-010**: Location Filter untuk /community Page (fitur frontend platform komunitas)

## Cara Kerja
Setiap slice mengikuti alur EOS lengkap:
```
Reality
   ↓
Expression / Request (request.els.yaml)
   ↓
Intent
   ↓
Work
   ↓
Actor
   ↓
Capability
   ↓
State
   ↓
Evidence (folder evidence/)
   ↓
Outcome
   ↓
Acceptance (acceptance.yaml)
```

## Operating Mode (sesuai Vertical Slice Contract v2)
Setiap slice mengikuti alur continuous execution sebagai operating mode yang permanen:
```
CREATE → CONTRACT → RUN → OBSERVE → EVIDENCE → ACCEPT / REJECT → REPLAY
```
Ini bukan "contoh static" tapi **reference contract untuk continuous reality verification** yang bisa dijalankan ulang kapan saja untuk mendeteksi regression.

## Verification Gates (Mandatory untuk Semua Slice)
Semua slice harus lulus dua gate utama sebelum di-accept:
1. **VS-REPLAY-001 — Continuous Vertical Slice Replay**:
   - Verifikasi bahwa slice bisa di-replay berulang kali dengan hasil evidence yang konsisten
   - Transformasi ELS→EIR menghasilkan hash yang sama setiap run
   - Predikat T001: input schema valid, output deterministik, EIR compliant

2. **VS-VERIFY-001 — Full EOS Work Lifecycle Validation**:
   - Verifikasi bahwa slice bisa memicu seluruh alur EOS:
     Extract intent dari `acceptance.yaml` → Buat Work di EOS → Assign actor → Attach capability → Transition state → Simpan evidence → Verifikasi outcome
   - Semua langkah workflow ILC_INS_001_InstitutionalWorkflow berhasil dieksekusi
   - Bukti disimpan di folder `evidence/` sebagai JSON yang terverifikasi

Runner EOS menjalankan semua verifikasi secara otomatis:
- API verification
- Browser verification (Playwright)
- Persistence verification
- Recovery verification
- Traceability chain validation
- Hash chain integrity check
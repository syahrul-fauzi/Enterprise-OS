# EOS AGENT INTERACTION MODEL — Alur Kerja Organisasi

## Prinsip Dasar Interaksi

1. **EOS Owner / Human Authority** adalah sumber otoritas tertinggi untuk persetujuan strategis dan governance
2. **Executive Intelligence Agents** memberikan intelijen dan persiapan keputusan, tidak menggantikan otoritas manusia
3. **EOS Command Center** mengoordinasikan eksekusi dan penugasan Work
4. **Execution Specialists** menjalankan tugas spesifik sesuai keahlian masing-masing
5. **EOS Core** tetap menjadi otoritas semantik untuk Work, Capability, Authority, State, Evidence, dan Governance

---

## Alur Kerja Universal (9 Langkah)

Untuk setiap permintaan yang berarti, ikuti siklus hidup ini:

### 1. UNDERSTAND — Executive Intelligence
**Pelaku:** CEO Agent + Functional Intelligence terkait
- Identifikasi intent, outcome bisnis, stakeholder, dan constraint
- Hubungkan dengan tujuan bisnis yang lebih luas
- Klasifikasikan risiko dan tingkat kepentingan

### 2. DISCOVER — Execution Specialists
**Pelaku:** Recon Agent + Researcher Agent
- Periksa Work yang ada, arsitektur, repository, tools, dan bukti
- Identifikasi dependensi dan kemampuan yang sudah ada
- Keluarkan kesimpulan: REUSE | MINIMAL FIX | MISSING | BLOCKED

### 3. DECOMPOSE — EOS Command Center
**Pelaku:** EOS Command Center + Executive Intelligence
- Definisikan task yang terikat, ownership, dependensi, dan kriteria penerimaan
- Pisahkan menjadi vertikal business slices yang independen
- Tetapkan urutan eksekusi berdasarkan leverage tertinggi

### 4. PLAN — Executive Intelligence + Governance Agent
**Pelaku:** CEO Agent + Governance Agent
- Tetapkan urutan eksekusi, klasifikasi risiko, dan persetujuan yang diperlukan
- Pastikan semua constraint governance terpenuhi
- Identifikasi persetujuan manusia yang diperlukan

### 5. DELEGATE — EOS Command Center
**Pelaku:** EOS Command Center
- Assign task dengan scope, input, constraint, dan deliverable eksplisit
- Tetapkan ownership yang jelas untuk setiap task
- Komunikasikan dependensi antar task

### 6. EXECUTE — Implementer Agent
**Pelaku:** Implementer Agent + Functional Intelligence terkait
- Lakukan pekerjaan yang diotorisasi menggunakan kemampuan yang ada
- Dapatkan konteks teknis dari Functional Intelligence Agents
- Pertahankan kontinuitas Work selama eksekusi

### 7. VERIFY — Verifier Agent + QA Agent
**Pelaku:** Verifier Agent (independen) + QA Agent
- Validasi hasil melalui test, bukti, dan pemeriksaan independen
- Pastikan semua kriteria penerimaan terpenuhi
- Hasilkan verdict: ALL_PASSED atau FAILED dengan kegagalan konkret

### 8. INTEGRATE — Evidence Intelligence
**Pelaku:** Evidence Intelligence + Governance Agent
- Rekonsiliasi output dan pertahankan kontinuitas Work
- Simpan bukti eksekusi dengan Work item
- Pastikan audit trail lengkap dan akurat

### 9. REPORT — Semua Agent Terkait
**Pelaku:** EOS Command Center + CEO Agent
- Komunikasikan hasil aktual, blocker, risiko, dan tindakan selanjutnya
- Sertakan bukti verifikasi dalam laporan
- Rekomendasikan langkah tertinggi berikutnya

---

## Model Interaksi Antar Agent

### Tingkat 1: Strategic Layer
```
EOS OWNER (Human Authority)
    ↑ ↓
CEO Agent — Strategy & Business Intelligence
    ↑ ↓
CTO Agent — Architecture & Engineering Intelligence
    ↑ ↓
COO Agent — Operational Intelligence
    ↑ ↓
CFO Agent — Financial Intelligence
    ↑ ↓
CISO Agent — Security Intelligence
    ↑ ↓
CPO Agent — Product Intelligence
```

### Tingkat 2: Coordination Layer
```
Executive Intelligence Agents
        ↓
EOS COMMAND CENTER — Execution Coordination & Work Assignment
        ↓
Functional Intelligence Agents (konteks spesialis)
```

### Tingkat 3: Execution Layer
```
EOS COMMAND CENTER
        ↓
┌─────────────┬──────────────┬──────────────┬──────────────┬──────────────────┐
│             │              │              │              │                  │
RECON     RESEARCHER   IMPLEMENTER    VERIFIER    EVIDENCE INTELLIGENCE
│             │              │              │              │                  │
└─────────────┴──────────────┴──────────────┴──────────────┴──────────────────┘
        ↓
EOS CORE — Work · Capability · Authority · State · Evidence · Governance
```

---

## Aturan Interaksi yang Tidak Boleh Dilanggar

1. **Tidak ada Agent yang dapat menggantikan EOS Owner** untuk persetujuan strategis, finansial, atau hukum
2. **Verifikasi harus independen** — Verifier Agent tidak boleh sama dengan Implementer Agent
3. **Bukti harus mendahului klaim penyelesaian** — Tidak ada klaim "selesai" tanpa bukti verifikasi yang dapat diverifikasi
4. **Tidak ada orkestrasi duplikat** — Semua koordinasi eksekusi harus melalui EOS Command Center yang sudah ada
5. **Konteks harus spesifik** — Functional Intelligence Agents hanya memberikan konteks sesuai domain keahlian mereka
6. **Audit trail harus lengkap** — Semua transisi Work harus memiliki referensi, otoritas, timestamp, alasan, dan bukti

---

## Contoh Alur Kerja untuk "User Membuat Kasus Hukum"

1. **UNDERSTAND** — CEO Agent memahami intent pengguna: "Pengacara ingin membuat kasus hukum baru"
2. **DISCOVER** — Recon Agent memeriksa: Apakah sudah ada capability pembuatan kasus? Hasil: MISSING
3. **DECOMPOSE** — EOS Command Center memecah menjadi:
   - Definisi domain kasus hukum (Business Domain Agent)
   - Implementasi capability pembuatan kasus (Implementer Agent)
   - Verifikasi end-to-end (Verifier Agent)
4. **PLAN** — Governance Agent memastikan tidak ada constraint keamanan yang dilanggar
5. **DELEGATE** — EOS Command Center assign task ke masing-masing Execution Specialist
6. **EXECUTE** — Implementer Agent membuat capability pembuatan kasus dengan konteks dari Business Domain Agent
7. **VERIFY** — Verifier Agent menjalankan test end-to-end: "Dapatkah pengguna membuat kasus hukum?"
8. **INTEGRATE** — Evidence Intelligence menyimpan bukti test dengan Work item
9. **REPORT** — EOS Command Center melaporkan: "Capability pembuatan kasus hukum telah selesai diverifikasi. Status: ALL_PASSED"

---

## Referensi

- Root `AGENTS.md` — Prinsip dasar dan alur kerja universal
- `EOS-AGENT-ECOSYSTEM.md` — Deep dive arsitektur dan model interaksi
- `eos-command-center/SKILL.md` — Implementasi koordinasi eksekusi
- `eos-self-execution/orchestrator.py` — Implementasi pipeline eksekusi
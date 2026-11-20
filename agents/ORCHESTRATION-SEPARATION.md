# PEMISAHAN PERAN ORKESTRASI — Command Center vs Self-Execution

## Prinsip Dasar

Tidak ada duplikasi orkestrasi. Kedua komponen ini memiliki peran yang jelas dan saling melengkapi:

| Komponen | Peran Utama | Tingkat Abstraksi |
|----------|-------------|-------------------|
| **EOS Command Center** | **Strategic Orchestration** — Tingkat tinggi, multi-slices, prioritas | Objective, business outcome, portofolio Work |
| **EOS Self-Execution Orchestrator** | **Tactical Execution** — Tingkat rendah, satu slice, alur teknis | Work item, status lifecycle, pipeline teknis |

---

## Pembagian Peran yang Jelas

### 1. EOS Command Center — Strategic Orchestrator

**Tanggung Jawab:**
- Menerima **Objective bisnis tingkat tinggi** (contoh: "Membangun kemampuan manajemen kasus hukum")
- Memecah objective menjadi **vertical business slices** (bukan lapisan horizontal)
- Memetakan dependensi antar slices
- Mencegah pekerjaan duplikat antar slices
- Memutuskan **next highest-leverage work** — work item mana yang memberikan nilai bisnis tertinggi selanjutnya
- Memelihara **War Room Dashboard** tingkat portofolio
- Menetapkan aturan keras: Rule of Two, arsitektur terkunci, toleransi pekerjaan duplikat = 0%

**Input:** Objective bisnis, daftar work item yang ada  
**Output:** Daftar work item yang dipecah, assignment agent, dashboard, keputusan next highest-leverage work

**Alur Kerja:**
```
OBJECTIVE TINGKAT TINGGI
       ↓
DECOMPOSE → vertical business slices
       ↓
WORK ITEM CONTRACT → work_id + product + user_job + acceptance
       ↓
RECON DEPENDENCY CHECK → reuse first
       ↓
PARALLEL ASSIGNMENT → agents assigned by role
       ↓
MONITOR portofolio slices
       ↓
INTEGRASI ke ONE TRUTH
       ↓
DECIDE NEXT highest-leverage work
```

---

### 2. EOS Self-Execution Orchestrator — Tactical Execution Pipeline

**Tanggung Jawab:**
- Menerima **satu work item spesifik** dari Command Center
- Mengelola **status lifecycle work item** (PENDING → RECON → EXECUTION → VERIFICATION → EVIDENCE → COMPLETED)
- Menjalankan **pipeline teknis** untuk satu slice:
  - Memulai fase RECON
  - Memulai fase EXECUTION dengan rencana teknis
  - Memulai fase VERIFICATION
  - Mengumpulkan semua jenis bukti (kode, test, runtime, kepatuhan)
  - Menandai work item sebagai COMPLETED
- Menyimpan state work item ke `.eos-state/workitems.json`
- Menghasilkan **dashboard tingkat work item**

**Input:** Satu work item spesifik dari Command Center  
**Output:** Status lifecycle work item, laporan teknis, bukti eksekusi

**Alur Kerja:**
```
WORK ITEM SPESIFIK (dari Command Center)
       ↓
START RECON PHASE → inisiasi Recon Agent
       ↓
COMPLETE RECON → laporan dari Recon Agent
       ↓
START EXECUTION PHASE → rencana teknis, assignment agent
       ↓
START VERIFICATION PHASE → inisiasi Verifier Agent
       ↓
COMPLETE VERIFICATION → laporan dari Verifier Agent
       ↓
COLLECT EVIDENCE → semua jenis bukti dikumpulkan
       ↓
COMPLETE WORK ITEM → status = COMPLETED
```

---

## Interaksi Antar Komponen

```
┌─────────────────────────────────────────────────────────────┐
│  EOS COMMAND CENTER (Strategic Orchestrator)              │
│  • Objective tingkat tinggi                               │
│  • Memecah menjadi work item                               │
│  • Memutuskan next highest-leverage work                   │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  EOS SELF-EXECUTION ORCHESTRATOR (Tactical Pipeline)      │
│  • Menerima satu work item spesifik                        │
│  • Mengelola status lifecycle work item                    │
│  • Menjalankan pipeline teknis                             │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  EXECUTION SPECIALISTS                                      │
│  • Recon Agent                                             │
│  • Implementer Agent                                       │
│  • Verifier Agent                                          │
│  • Evidence Intelligence                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Contoh Alur Kerja Nyata

1. **EOS Command Center** menerima objective: "Membangun kemampuan manajemen kasus hukum"
2. **Command Center** memecah objective menjadi work item:
   - `LH-CASE-001`: Pengguna membuat kasus hukum
   - `LH-CASE-002`: Pengguna melihat daftar kasus
   - `LH-CASE-003`: Pengguna memperbarui kasus
3. **Command Center** memutuskan next highest-leverage work: `LH-CASE-001`
4. **Command Center** mengirim `LH-CASE-001` ke **Self-Execution Orchestrator**
5. **Self-Execution Orchestrator** mengelola lifecycle `LH-CASE-001`:
   - RECON → EXECUTION → VERIFICATION → EVIDENCE → COMPLETED
6. **Self-Execution Orchestrator** mengembalikan status COMPLETED ke Command Center
7. **Command Center** memperbarui War Room Dashboard dan memutuskan next highest-leverage work berikutnya

---

## Aturan yang Tidak Boleh Dilanggar

1. **Command Center tidak menjalankan pipeline teknis** — hanya Self-Execution Orchestrator yang menangani status lifecycle work item
2. **Self-Execution Orchestrator tidak memutuskan prioritas** — hanya Command Center yang memutuskan next highest-leverage work
3. **Tidak ada orkestrasi duplikat** — masing-masing komponen memiliki peran yang jelas dan saling melengkapi
4. **Command Center adalah satu-satunya sumber kebenaran untuk portofolio Work** — Self-Execution Orchestrator hanya melaporkan status work item individual
5. **Self-Execution Orchestrator adalah satu-satunya sumber kebenaran untuk status lifecycle work item** — Command Center hanya mengumpulkan status dari Self-Execution Orchestrator

---

## Referensi

- `eos-command-center/SKILL.md` — Peran Strategic Commander
- `eos-self-execution/SKILL.md` — Alur Self-Execution
- `eos-self-execution/orchestrator.py` — Implementasi Tactical Pipeline
- `agents/INTERACTION-MODEL.md` — Model interaksi antar agen
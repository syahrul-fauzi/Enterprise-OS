# EOS PILOT BLUEPRINT — ISSUE-TO-DECISION-TO-WORK

**Version:** 1.0  
**Date:** 2026-11-19  
**Phase:** Hari 6-10 — Business Process Design  
**Pilot Candidate:** Issue-to-Decision-to-Work (RECOMMENDED)  
**Architecture Constraint:** NO NEW PRIMITIVES · FROZEN CORE RESPECTED

---

## EXECUTIVE SUMMARY

Blueprint ini mendefinisikan alur proses pilot Issue-to-Decision-to-Work yang menguji tesis utama EOS: **Human accountability retained. Agent authority delegated. Work continuity preserved. Evidence independently verifiable.**

Alur ini tidak memerlukan perubahan Frozen Core atau pembuatan primitive baru — 100% reuse capability yang sudah ada.

---

## 1. PILOT OBJECTIVE

### Tesis Utama yang Diuji:
> Agent dapat mengumpulkan informasi, mengidentifikasi akar masalah, dan menyusun rekomendasi keputusan — **tetapi hanya manusia yang memiliki wewenang untuk menyetujui tindakan yang menjadi Work.**

### Metrik Keberhasilan Utama:
- Waktu proses Issue → Decision berkurang dari **3-7 hari** menjadi **< 4 jam**
- Semua bukti keputusan dapat diverifikasi secara independen
- Tidak ada perubahan Work ketika agent berganti
- Akuntabilitas manusia tetap terjaga di semua tahap

---

## 2. ALUR PROSES ISSUE→DECISION→WORK (END-TO-END)

```
┌─────────────────┐
│   ISSUE OPEN    │  Manusia mendaftarkan Issue dengan konteks, prioritas, dan stakeholder
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AGENT OBSERVE   │  Agent menerima delegasi, mulai mengumpulkan data dari semua sumber
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AGENT ANALYZE   │  Agent mengidentifikasi akar masalah, dampak, dan opsi tindakan
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DECISION MEMO   │  Agent menyusun memo dengan semua bukti, analisis, dan rekomendasi
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HUMAN REVIEW    │  Manusia meninjau, mengubah, atau menolak rekomendasi — HANYA MANUSIA YANG BISA SETUJUI
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  APPROVED  REJECTED
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│  WORK   │ │ ISSUE    │
│ CREATED │ │ REOPENED │
└─────────┘ └──────────┘
```

---

## 3. AUTHORITY MATRIX (NON-NEGOTIABLE)

| Tahap | Aktor yang Bertindak | Wewenang | Batasan |
|-------|----------------------|----------|---------|
| **Issue Pendaftaran** | Manusia | ✅ Daftarkan Issue, tetapkan prioritas, tambahkan stakeholder | Tidak ada batasan |
| **Pengumpulan Informasi** | Agent (delegasi) | ✅ Akses semua sumber data yang diizinkan, tarik laporan, kumpulkan bukti | ❌ Tidak boleh mengubah data apapun |
| **Analisis Akar Masalah** | Agent (delegasi) | ✅ Identifikasi pola, hitung dampak, usulkan opsi | ❌ Tidak boleh membuat klaim keputusan |
| **Penyusunan Decision Memo** | Agent (delegasi) | ✅ Susun semua bukti, analisis, rekomendasi | ❌ Tidak boleh menandatangani atau menyetujui |
| **Review & Persetujuan** | **HANYA MANUSIA** | ✅ Setujui, tolak, minta revisi, ubah rekomendasi | ✅ Ini SATU-SATUNYA jalan untuk membuat Work |
| **Eksekusi Work** | Agent + Manusia | ✅ Jalankan tindakan sesuai keputusan yang sudah disetujui | Harus sesuai dengan Decision Memo yang disetujui |

### Aturan Keras yang Tidak Bisa Dilanggar:
> **Agent tidak pernah dapat menyetujui keputusan bisnis. Hanya manusia yang memiliki wewenang otorisasi.**

---

## 4. DATA MODEL (REUSE EXISTING PRIMITIVES)

### Issue (menggunakan Work Core yang ada)
```typescript
interface Issue {
  workId: string; // Work Core invariant
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  stakeholder: ActorId[];
  status: 'open' | 'analyzing' | 'review' | 'resolved' | 'rejected';
  createdAt: Timestamp;
  createdBy: ActorId;
  evidence: EvidenceLink[]; // Reuse evidence-registry
}
```

### Decision Memo (dihasilkan oleh agent)
```typescript
interface DecisionMemo {
  issueId: WorkId;
  rootCause: string;
  impactAnalysis: {
    business: string;
    operational: string;
    cost: number; // Reuse budget-engine
  };
  options: Array<{
    description: string;
    pros: string[];
    cons: string[];
    estimatedCost: number;
    estimatedTime: string;
  }>;
  recommendedOption: number;
  evidence: EvidenceLink[]; // Semua bukti terikat
  generatedAt: Timestamp;
  generatedBy: AgentId;
}
```

### Work (dibuat HANYA setelah manusia menyetujui)
```typescript
interface Work {
  workId: string; // Work Core invariant
  sourceIssueId: WorkId;
  sourceDecisionId: string;
  approvedBy: ActorId; // Wajib manusia
  approvedAt: Timestamp;
  action: string;
  status: 'pending' | 'in_progress' | 'completed';
  evidence: EvidenceLink[];
}
```

---

## 5. CAPABILITY MAPPING (100% REUSE)

| Tahap Alur | Capability yang Digunakan | Status |
|------------|---------------------------|--------|
| Issue Pendaftaran | `atomic-composition` (intent understanding) | ✅ TERSEDIA |
| Agent Pengumpulan | `agent-orchestration` (delegasi task) | ✅ TERSEDIA |
| Analisis Masalah | `reasoning` (root cause analysis) | ✅ TERSEDIA |
| Decision Memo | `legal-document` (document generation) | ✅ TERSEDIA |
| Review Manusia | `business-os` (FACE interface) | ✅ TERSEDIA |
| Persetujuan | `identity` (authorization check) | ✅ TERSEDIA |
| Work Creation | `workflow-engine` (state transition) | ✅ TERSEDIA |
| Evidence Tracking | `evidence-registry` (provenance) | ✅ TERSEDIA |
| Notifikasi | `communication` (multi-channel) | ✅ TERSEDIA |

**Total New Primitives Required:** 0  
**Reuse Rate:** 100%

---

## 6. ACCEPTANCE CRITERIA (AWAL)

### Wajib (MUST HAVE):
1. ✅ Issue dapat didaftarkan melalui interface manusia
2. ✅ Agent menerima delegasi dan mulai mengumpulkan bukti tanpa intervensi manual
3. ✅ Decision Memo dihasilkan dengan semua bukti terikat dan dapat diverifikasi
4. ✅ Hanya manusia yang dapat menekan tombol "Setujui" untuk membuat Work
5. ✅ Semua tahap tercatat di evidence chain dengan timestamp dan actor attribution
6. ✅ Work ID tetap invariant meskipun agent berganti
7. ✅ Kill switch dapat menghentikan proses agent kapan saja

### Target (NICE TO HAVE):
1. 🎯 Waktu total proses < 4 jam
2. 🎯 Akurasi rekomendasi agent > 80% (dikonfirmasi oleh manusia)
3. 🎯 Setidaknya 5 Issue berhasil diproses end-to-end selama pilot
4. 🎯 Feedback manusia tentang kegunaan Decision Memo > 4/5

---

## 7. RISK MITIGATION

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|--------------|--------|----------|
| Agent menghasilkan analisis yang salah | Sedang | Rendah | Manusia tetap memiliki wewenang penuh untuk review dan koreksi |
| Proses memakan waktu lebih lama dari target | Rendah | Sedang | Optimalkan polling interval agent, berikan SLA eksplisit |
| Manusia tidak menggunakan interface | Rendah | Sedang | Sediakan demo dan panduan penggunaan yang jelas |
| Evidence chain tidak lengkap | Rendah | Tinggi | Verifikasi setiap tahap dengan `evidence-registry` sebelum lanjut |

---

## 8. NEXT STEPS (HARI 11-15)

1. Menyusun Skill Assurance Framework untuk evaluasi kualitas agent
2. Merancang security test scenario untuk delegasi agent
3. Memverifikasi bahwa semua capability mapping berfungsi dengan benar
4. Menyiapkan test case end-to-end untuk alur proses
5. Mendefinisikan metrik pengukuran kualitas output agent

---

**DOCUMENT STATUS:** ✅ BLUEPRINT COMPLETE  
**NEXT DOCUMENT:** EOS-SKILL-ASSURANCE-FRAMEWORK-001.md  
**AUTHOR:** EOS Business Process Design Agent  
**DATE:** 2026-11-19
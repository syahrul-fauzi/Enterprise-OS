# BDP-004 — EOS Integration Mapping

**ENTERPRISE-OS · WORKSPACE ARCHITECTURE · GENESIS EOS · 2026**

---

## 1. Tujuan Fase BDP-004

Fase ini mendefinisikan detail integrasi setiap Business Domain Package dengan EOS Core Fabric, termasuk:
- Peta integrasi setiap domain dengan Work Core, Identity, Governance, Evidence
- Aturan tenant isolation dan security boundary
- Pemetaan capability reuse antar domain
- Acceptance criteria BDP-G04 Integration Mapping

---

## 2. Prinsip Integrasi Dasar

### 2.1 Prinsip Utama
```
Domain mengandalkan EOS untuk otoritas, bukan sebaliknya.
Domain tidak pernah membuat keputusan governance sendiri.
Semua integrasi hanya melalui public contract terversi.
Tidak ada akses langsung ke internal domain lain.
```

### 2.2 Aturan Yang Tidak Boleh Dilanggar
1. **Setiap integrasi harus memiliki alasan bisnis yang jelas** — Tidak ada dependensi tanpa bukti penggunaan
2. **Integrasi hanya melalui public contract** — Tidak ada import langsung ke internal domain lain
3. **Domain tidak pernah mengubah state EOS Core secara langsung** — Semua perubahan melalui capability registry
4. **Semua integrasi harus tervalidasi oleh test** — Setiap peta integrasi memiliki test end-to-end
5. **Tidak ada duplikasi mekanisme EOS Core** — Semua mekanisme governance, evidence, dan work continuity menggunakan implementasi EOS yang sudah ada

---

## 3. Peta Integrasi Setiap Domain

### 3.1 Integrasi Wajib Untuk Semua Domain

Setiap Business Domain Package harus secara eksplisit mengintegrasikan dengan:

| Layer EOS Core | Tujuan Integrasi | Bukti Penggunaan |
|----------------|------------------|-------------------|
| **Work Core** | Mendapatkan dan memelihara logicalWorkId kanonik, mencatat state transition, memelihara Work continuity | Semua aggregate memiliki field `workId: WorkId` yang wajib, semua perubahan state mencatat workId yang sama |
| **Identity Domain** | Verifikasi actor, tenant, dan session, memetakan actorId ke EOS canonical identity | Semua command menerima `sessionId` sebagai parameter, semua test memverifikasi session validation |
| **Governance Domain** | Policy enforcement, authorization check, batas kewenangan | Semua command melalui governance boundary, semua perubahan state memerlukan authorization yang sesuai |
| **Evidence Registry** | Mencatat bukti setiap perubahan state, menyimpan immutable transition history | Semua perubahan state menghasilkan evidence entry, semua test memverifikasi evidence chain |

### 3.2 Integrasi Opsional Berdasarkan Kebutuhan Domain

| Domain | Integrasi Opsional | Alasan Bisnis |
|--------|-------------------|---------------|
| **Legal Case** | Requirement Management, Workflow Engine, Knowledge Graph | Legal case membutuhkan requirement tracking, workflow untuk approval, dan pengetahuan hukum |
| **Commerce Product** | Connector Ecosystem, Payment Processing | Commerce product membutuhkan integrasi dengan payment provider dan sistem eksternal |
| **Genesis Market Intelligence** | Connector Ecosystem, Communication, Reasoning | Market intelligence membutuhkan koneksi ke sumber data eksternal, komunikasi dengan prospect, dan reasoning untuk kualifikasi |
| **Genesis Solution Fulfillment** | Requirement Management, Product Delivery | Solution fulfillment membutuhkan requirement tracking dan delivery capability |
| **Genesis Value & Risk Audit** | Investment Compliance, Observability | Value & risk audit membutuhkan compliance check dan observability untuk biaya |
| **Genesis Growth & Commerce** | Commerce Product, Payment Processing | Growth & commerce membutuhkan product listing dan payment processing |
| **Genesis Customer Success** | Persistent Companion, Communication | Customer success membutuhkan komunikasi dengan client dan persistent state |

---

## 4. Aturan Tenant Isolation

### 4.1 Prinsip Tenant Isolation

```
Satu tenant, satu lingkungan terisolasi.
Tidak ada cross-tenant access pada level manapun.
Semua aggregate memiliki field tenantId yang wajib.
Semua query secara otomatis difilter berdasarkan tenantId.
```

### 4.2 Aturan Isolasi Per Layer

| Layer | Aturan Isolasi |
|-------|----------------|
| **Domain Aggregate** | Setiap aggregate memiliki field `tenantId: TenantId` yang wajib, tidak ada aggregate tanpa tenantId |
| **Repository** | Semua operasi repository secara otomatis menambahkan filter `WHERE tenantId = $1`, tidak ada query tanpa tenant filter |
| **Capability Registry** | Semua capability invocation menerima `session.tenantId` sebagai bagian dari context, semua authorization check memverifikasi tenant |
| **Evidence Registry** | Setiap evidence entry memiliki field tenantId, semua query evidence difilter berdasarkan tenant |
| **Persistence** | Semua tabel memiliki column tenantId, semua index mencakup tenantId sebagai prefix |

### 4.3 Test Isolasi Tenant

Setiap domain harus memiliki test yang memverifikasi:
- Dua tenant berbeda tidak dapat melihat aggregate satu sama lain
- Operasi pada satu tenant tidak mempengaruhi tenant lain
- Session dengan tenantId yang berbeda ditolak
- Semua query secara otomatis difilter berdasarkan tenantId

---

## 5. Security Boundary

### 5.1 Boundary Antar Domain

```
Anti-corruption boundary memisahkan setiap bounded context.
Tidak ada domain yang dapat menulis ke aggregate domain lain.
Komunikasi antar domain hanya melalui event terversi.
Setiap domain hanya memiliki read access ke domain lain melalui public contract.
```

### 5.2 Boundary Antar Layer

| Boundary | Aturan |
|----------|--------|
| **Domain ↔ EOS Core** | Domain hanya dapat memanggil capability registry, tidak dapat mengubah state core secara langsung |
| **Domain ↔ Execution Runtime** | Domain hanya menerima execution result, runtime tidak memiliki akses ke state domain |
| **Experience ↔ Domain** | Experience hanya dapat memanggil public command domain, tidak memiliki akses ke internal model |
| **External System ↔ Domain** | Semua komunikasi melalui connector ecosystem, tidak ada akses langsung ke domain |

---

## 6. Pemetaan Capability Reuse

### 6.1 Capability Yang Dapat Di-Reuse Oleh Semua Domain

| Capability | Tujuan |
|------------|--------|
| `work-core.create-work` | Membuat Work kanonik baru |
| `work-core.get-work` | Mendapatkan Work berdasarkan ID |
| `work-core.update-work-status` | Memperbarui status Work |
| `identity.validate-session` | Memvalidasi session dan tenant |
| `governance.check-authorization` | Memeriksa apakah actor memiliki kewenangan untuk aksi tertentu |
| `evidence-registry.record-evidence` | Mencatat bukti perubahan state |

### 6.2 Contoh Alur Integrasi End-to-End

Ketika sebuah legal case dibuat:

1. Experience mengirim `create-case` command dengan `sessionId`
2. Capability registry memvalidasi session melalui `identity.validate-session`
3. Jika valid, domain membuat aggregate Case baru dengan `tenantId = session.tenantId`
4. Domain memanggil `work-core.create-work` untuk mendapatkan `workId` kanonik
5. Domain menyimpan aggregate dengan `workId` yang baru dibuat
6. Domain memanggil `evidence-registry.record-evidence` untuk mencatat pembuatan kasus
7. Domain mengembalikan hasil ke experience

---

## 7. Acceptance Criteria BDP-G04

| ID | Kriteria Penerimaan | Status | Bukti |
|----|---------------------|--------|-------|
| BDP-G04.1 | Setiap domain memiliki integrasi eksplisit dengan Work Core, Identity, Governance, Evidence | PASS | Semua domain (legal-case, commerce-product) mengintegrasikan Work Core melalui capabilityRegistry.invoke("work-core", "create"), Identity melalui SessionRepositoryInMemory, Governance melalui validateAllBoundaries, Evidence melalui safeRecordEvidence |
| BDP-G04.2 | Semua aggregate memiliki field tenantId yang wajib | PASS | Semua aggregate (CaseAggregate, ProductListingAggregate) memiliki field tenantId: TenantId yang dideklarasikan sebagai required di kontrak, semua test memverifikasi tenantId tidak boleh kosong |
| BDP-G04.3 | Semua operasi repository secara otomatis difilter berdasarkan tenantId | PASS | Semua operasi repository (case-postgres.repository.ts, product-listing.repository.ts) menambahkan filter WHERE tenant_id = $1 pada setiap query, PostgresRepository base class mengimplementasikan setSessionContext untuk RLS enforcement |
| BDP-G04.4 | Tidak ada domain yang dapat menulis ke aggregate domain lain | PASS | Pencarian seluruh import menunjukkan domain hanya mengimport public contract dari domain lain, tidak ada import ke implementation domain lain, semua komunikasi melalui capabilityRegistry.invoke |
| BDP-G04.5 | Semua komunikasi antar domain hanya melalui event terversi | PASS | Semua komunikasi antar domain menggunakan capabilityRegistry.invoke dengan command terversi, tidak ada akses langsung ke internal domain lain, semua event memiliki schemaVersion dan tenantId |
| BDP-G04.6 | Setiap integrasi memiliki test end-to-end yang memverifikasi alur | PASS | Test LH-CASE-001 memverifikasi alur lengkap: validasi session → create core work → buat case aggregate → catat evidence → verifikasi workId tetap sama, test commerce-product.test.ts memverifikasi integrasi serupa |
| BDP-G04.7 | Tidak ada duplikasi mekanisme EOS Core di dalam domain | PASS | Semua mekanisme CMBCD (calculateExecutionFrame, validateAllBoundaries, safeRecordEvidence) diimport dari work-core, tidak ada duplikasi definisi type atau logic governance di domain |

---

## 8. Next Step

Setelah BDP-004 selesai, langkah selanjutnya adalah **BDP-005 Agentic Execution Mapping** yang akan:
1. Menentukan hubungan Business Domain Package, Agentic Work, dan Paperclip
2. Memetakan role agent, skill, dan execution assignment
3. Menentukan aturan human dan agent authority
4. Menyusun acceptance criteria untuk BDP-G05
# Gate 1.3: EOS MCP Contract - Definisi Kontrak Interface

**Status:** IN PROGRESS → VERIFIED  
**Tanggal:** 2026-11-19  
**Program:** EOS-BUSINESS-OS-001  
**Gate:** 1.3 EOS MCP Contract

---

## 1. Executive Summary

Tujuan Gate 1.3 adalah mendefinisikan kontrak interface antara EOS Core dengan ekosistem OpenAI (MCP, Agents SDK, ChatGPT Sites, Dots, dll.) berdasarkan command dan authorization yang sudah ada di Work Core.

**Hard Constraints yang harus dipenuhi:**
- ✅ Zero new core primitives
- ✅ 100% reuse existing capabilities
- ✅ Tidak ada duplicate semantic authority
- ✅ Semua operasi harus terverifikasi dengan evidence

---

## 2. Arsitektur Kontrak EOS MCP

### 2.1 Prinsip Dasar Kontrak

EOS MCP Contract beroperasi pada **Execution Boundary** dari arsitektur EOS:
- **EOS Core:** Sumber kebenaran semantic, Work continuity, authorization, evidence
- **OpenAI Ecosystem:** Intelligence, interface, execution runtime (replaceable)
- **Kontrak:** Interface terdefinisi yang memisahkan authority dari execution

```
┌─────────────────────────────────────────────────────────────┐
│                   OpenAI Ecosystem                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Agents  │ │   Dots   │ │  Sites   │ │  MCP     │      │
│  │   SDK    │ │          │ │          │ │  Server  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└───────────────────────────── MCP INTERFACE ─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EOS Work Core                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Work    │ │ Authority│ │ Evidence │ │  Seat    │      │
│  │ Continuity│ │  Layer  │ │  Store   │ │ Fabric   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. EOS MCP Command Contract

Berdasarkan `work.commands.ts` yang sudah ada, berikut adalah command yang diekspos melalui MCP:

### 3.1 Core Work Commands

| Command | Input | Output | Deskripsi |
|---------|-------|--------|-----------|
| `work.create` | `{ type, context, owner }` | `WorkId` | Membuat Work baru |
| `work.claim_authority` | `{ workId, actor, scope }` | `AuthorizationProof` | Mengklaim authority atas Work |
| `work.get_evidence` | `{ workId }` | `Evidence[]` | Mendapatkan bukti verifikasi Work |
| `work.link_existing` | `{ sourceId, targetId, relation }` | `LinkProof` | Menghubungkan Work yang sudah ada |
| `work.sync` | `{ workId, state }` | `SyncProof` | Menyinkronkan state Work |

### 3.2 Seat & Companion Commands

| Command | Input | Output | Deskripsi |
|---------|-------|--------|-----------|
| `seat.create` | `{ humanOwnerId, authorityScope, seatName? }` | `Seat` | Membuat seat baru untuk human |
| `seat.list` | `{ humanOwnerId? }` | `Seat[]` | Menampilkan daftar seat |
| `seat.get` | `{ seatId }` | `Seat` | Mendapatkan detail seat |
| `seat.update_authority` | `{ seatId, newScope, requesterId? }` | `Seat` | Memperbarui authority seat |
| `seat.suspend` | `{ seatId, requesterId? }` | `void` | Menangguhkan seat |
| `seat.activate` | `{ seatId, requesterId? }` | `Seat` | Mengaktifkan kembali seat |
| `seat.get_summary` | `{ seatId }` | `SeatSummary` | Mendapatkan ringkasan audit seat |
| `companion.create` | `{ seatId, type, autonomyLevel, scopedPermissions, validFrom, validUntil? }` | `Companion` | Membuat companion (Dot/Agent/Specialist) |
| `companion.list_by_seat` | `{ seatId, status? }` | `Companion[]` | Menampilkan companion per seat |
| `companion.get` | `{ companionId }` | `Companion` | Mendapatkan detail companion |
| `companion.update_permissions` | `{ companionId, newPermissions, requesterId? }` | `Companion` | Memperbarui izin companion |
| `companion.revoke` | `{ companionId, requesterId? }` | `void` | Mencabut companion |
| `companion.pause` | `{ companionId, requesterId? }` | `void` | Menjeda companion |
| `companion.resume` | `{ companionId, requesterId? }` | `void` | Melanjutkan companion |
| `companion.validate_authority` | `{ companionId, requiredPermission, requiredAutonomyLevel? }` | `AuthorityValidation` | Memvalidasi authority companion |

### 3.3 Evidence & Attribution Commands

| Command | Input | Output | Deskripsi |
|---------|-------|--------|-----------|
| `attribution.record` | `{ initiatedBy, executedBy, delegatedBy?, approvedBy?, evidenceRefs? }` | `ActorAttribution` | Mencatat attribution aksi |
| `attribution.list_by_work` | `{ workId }` | `ActorAttribution[]` | Menampilkan attribution per Work |
| `attribution.list_by_seat` | `{ seatId }` | `ActorAttribution[]` | Menampilkan attribution per seat |
| `work.get_authorization` | `{ workId, companionId }` | `WorkAuthorization` | Mendapatkan otorisasi Work untuk companion |

---

## 4. Authorization Contract

### 4.1 Autonomy Level Hierarchy

| Level | Nama | Deskripsi | Membutuhkan persetujuan human |
|-------|------|-----------|-------------------------------|
| A0 | Manual | Semua aksi membutuhkan persetujuan eksplisit human | ✅ Ya |
| A1 | Assisted | Agent mengusulkan aksi, human menyetujui | ✅ Ya |
| A2 | Delegated | Agent dapat mengeksekusi dalam scope terbatas, laporan setelahnya | ❌ Tidak (dalam scope) |
| A3 | Autonomous | Agent dapat mengeksekusi dan menyesuaikan dalam batas yang ditetapkan | ❌ Tidak |
| A4 | Full | Agent memiliki authority penuh dalam domainnya | ❌ Tidak |

### 4.2 Permission Scope Format

```
work:*                  # Semua Work dalam seat
work:strategy-*          # Semua Work dengan prefix tertentu
work:strategy-123       # Work spesifik
seat:read               # Membaca data seat
seat:update_authority   # Memperbarui authority seat
companion:*             # Semua operasi companion
evidence:read           # Membaca evidence
attribution:read        # Membaca attribution
```

### 4.3 Authorization Flow

```
1. Companion meminta eksekusi command
   ↓
2. EOS Core memvalidasi:
   - Companion status = ACTIVE
   - Seat status = ACTIVE
   - Companion masih dalam masa berlaku (validUntil)
   - Companion memiliki permission yang dibutuhkan
   - Autonomy level companion cukup untuk operasi
   ↓
3. Jika valid:
   - Eksekusi command
   - Catat attribution
   - Kembalikan hasil + evidence ref
   ↓
4. Jika tidak valid:
   - Kembalikan alasan penolakan
   - Catat upaya akses tidak sah
```

---

## 5. Evidence Contract

### 5.1 Setiap operasi melalui MCP harus menghasilkan:

```typescript
interface MCPResponse<T> {
  result: T;                    // Hasil operasi
  evidenceRef: string;          // Referensi bukti unik
  attributionRef: string;       // Referensi attribution
  timestamp: string;            // Waktu eksekusi ISO
  actor: {                      // Aktor yang mengeksekusi
    type: 'HUMAN' | 'COMPANION' | 'AGENT';
    id: string;
  };
  authorizationProof?: {       // Bukti otorisasi
    autonomyLevel: AutonomyLevel;
    permissionsUsed: string[];
  };
}
```

### 5.2 Evidence Store Structure

- Lokasi: `.eos/evidence/{workId}/{timestamp}-{operation}.json`
- Setiap file berisi: input, output, actor, timestamp, authorization proof
- Immutable setelah dibuat
- Dapat diverifikasi secara independen

---

## 6. Error Handling Contract

### 6.1 Error Codes

| Code | Kategori | Deskripsi |
|------|----------|-----------|
| `AUTH_FAILED` | Authorization | Validasi authority gagal |
| `SEAT_INACTIVE` | Seat | Seat tidak aktif |
| `COMPANION_INACTIVE` | Companion | Companion tidak aktif |
| `PERMISSION_DENIED` | Permission | Izin tidak cukup |
| `INSUFFICIENT_AUTONOMY` | Autonomy | Level autonomy tidak mencukupi |
| `EXPIRED` | Validity | Companion sudah kadaluarsa |
| `WORK_NOT_FOUND` | Work | Work tidak ditemukan |
| `INVALID_INPUT` | Input | Parameter input tidak valid |

### 6.2 Error Response Format

```typescript
interface MCPError {
  errorCode: string;
  message: string;
  details?: Record<string, any>;
  evidenceRef?: string;  // Bukti upaya gagal
  remediation?: string;  // Langkah perbaikan yang disarankan
}
```

---

## 7. Contract Validation Checklist

- [x] Semua command menggunakan implementasi yang sudah ada di `business-os.service.ts`
- [x] Tidak ada core primitive baru yang diperkenalkan
- [x] Semua operasi menghasilkan evidence dan attribution
- [x] Authorization layer terintegrasi dengan `validateCompanionAuthority`
- [x] Autonomy level enforcement terdefinisi dengan jelas
- [x] Error handling memiliki format yang konsisten
- [x] Kontrak kompatibel dengan MCP (Model Context Protocol) standar

---

## 8. Implementation Status

| Item | Status | Verifikasi |
|------|--------|------------|
| Core Work Commands | IMPLEMENTED | `work.commands.ts` |
| Seat Commands | IMPLEMENTED | `service.ts` |
| Companion Commands | IMPLEMENTED | `service.ts` |
| Authorization Validation | IMPLEMENTED | `validateCompanionAuthority` |
| Evidence & Attribution | IMPLEMENTED | `recordActorAttribution` |
| Autonomy Level Hierarchy | DEFINED | `business-os.contracts.ts` |
| Error Handling | DEFINED | Kontrak ini |

---

## 9. Next Action

Gate 1.3 selesai. Selanjutnya: **Gate 1.4 Security & Contract Validation**

Menguji:
1. Delegation flow
2. Approval flow
3. Revocation flow
4. Evidence persistence
5. Outcome verification
# EOS PRODUCT REALITY MATRIX — AUDIT AS-IS

Setiap route aktual dinilai berdasarkan **repo reality** (filesystem exists), **page exists** (memiliki page.tsx), **runtime ready** (tidak error compile), **browser navigable** (bisa dibuka di browser), dan product role. Audit ini menggantikan Surface Matrix lama sebagai single source of truth.

---

## GOLDEN SPINE — CANONICAL FACE v0.1 (ROUTE YANG WAJIB ADA)
| Route                | Exists | Page  | Runtime | Browser | Product Role   | Decision  | Keterangan                                                                 |
| -------------------- | ------ | ----- | ------- | ------- | -------------- | --------- | -------------------------------------------------------------------------- |
| `/`                  | ✓      | ✓     | ✓       | ?       | Entry          | **KEEP**  | Root route, session check, redirect ke /my-reality jika sudah login       |
| `/login`             | ✓      | ✓     | ✓       | ?       | Auth           | **KEEP**  | Canonical authentication entry point                                      |
| `/my-reality`        | ✓      | ✓     | ✓       | ?       | Return Home    | **KEEP**  | HALAMAN UTAMA setelah login — center of gravity user                      |
| `/cases`             | ✓      | ✓     | ✓       | ?       | Core Work List | **KEEP**  | Work list yang menggantikan /work — menyimpan semua pekerjaan user         |
| `/cases/[caseId]`    | ✓      | ✓     | ✓       | ?       | Work Detail    | **KEEP**  | Work detail yang menggantikan /work/[id] — single source of truth work    |
| `/workspace`         | ✓      | ✓     | ✓       | ?       | Continuity     | **REVIEW**| Evaluasi apakah perlu merge ke /my-reality atau tetap sebagai legacy route |
| `/cases/new`         | ✓      | ✓     | ✓       | ?       | Formation      | **KEEP**  | Membuat work baru — menggantikan /work/new                                |

---

## DUPLICATE ROUTE YANG PERLU RECONCILIATION
| Route                | Exists | Page  | Runtime | Browser | Product Role   | Decision   | Keterangan                                                                 |
| -------------------- | ------ | ----- | ------- | ------- | -------------- | ---------- | -------------------------------------------------------------------------- |
| `/(actors)/settings` | ✓      | ?     | ?       | ?       | Settings       | **MERGE**  | Hapus duplikasi settings — hanya simpan canonical /(eos)/settings         |
| `/(eos)/settings`    | ✓      | ✓     | ✓       | ?       | Settings       | **KEEP CANONICAL** | Satu-satunya settings yang muncul di navigation                           |
| `/(work)/settings`   | ✓      | ?     | ?       | ?       | Settings       | **HIDE**   | Nonaktifkan route duplikat, redirect ke /settings                         |
| `/(actors)/institution/[id]` | ✓ | ✓ | ✓ | ? | Actor Profile | **KEEP CANONICAL** | Satu-satunya route institusi yang canonical                                |
| `/(work)/institution/[id]` | ✓ | ? | ? | ? | Duplicate | **REDIRECT** | Redirect ke canonical /institution/[id]                                   |

---

## AMBIGUITY STRUKTUR YANG PERLU FIX
| Route                | Exists | Page  | Runtime | Browser | Issue          | Resolution  | Keterangan                                                                 |
| -------------------- | ------ | ----- | ------- | ------- | -------------- | ----------- | -------------------------------------------------------------------------- |
| `/cases/[id]/`       | ✓      | ✗     | —       | —       | Ambigu param   | **DELETE**  | Folder kosong, tidak ada page.tsx — buat confusion dengan [caseId]         |
| `/documents/create`  | ✓      | ✓     | ✓       | ?       | Mismatch matrix| **KEEP**     | Tree menunjukkan route ini exists — update matrix, bukan hapus route       |
| `/evidence/create`   | ✗      | ✗     | —       | —       | Missing route  | **BUILD**   | Matrix sebutkan exists, tapi tree tidak punya — perlu implementasikan      |

---

## INTENTIONAL ROUTES YANG TERLANJUT DIBUAT
| Route                | Exists | Page  | Runtime | Browser | Status Matrix | Resolution  | Keterangan                                                                 |
| -------------------- | ------ | ----- | ------- | ------- | ------------ | ----------- | -------------------------------------------------------------------------- |
| `/(work)/people`     | ✓      | ✓     | ✓       | ?       | INTENTIONAL FUTURE | **REVIEW** | Matrix sebelumnya bilang "future", tapi tree sudah ada — evaluasi apakah perlu masuk FACE v0.1 |
| `/capabilities/`     | ✓      | ✗     | —       | —       | —            | **HIDE**    | Hanya folder, tidak ada page.tsx — belum siap untuk user-facing             |

---

## API SURFACE (BACKEND ONLY, TIDAK USER-FACING)
Semua route di `/api/*` sudah ada backendnya, tapi **TIDAK PERLU muncul di main navigation**. Hanya diakses oleh client-side untuk data fetching.

---

## TOTAL AKHIR
| Kategori             | Jumlah |
| -------------------- | ------ |
| KEEP (Canonical)     | 7      |
| MERGE/HIDE/REDIRECT  | 5      |
| DELETE (kosong)      | 1      |
| BUILD (missing)      | 1      |
| REVIEW (butuh evaluasi) | 2    |
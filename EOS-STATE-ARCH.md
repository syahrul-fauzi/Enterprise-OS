# EOS-STATE-ARCH-001 — Next-Level Architecture Strategy

Jawaban saya: Ya, `.eos-state` perlu direorganisasi dan direfaktor. Bahkan, saya merekomendasikan evolusi arsitektural yang cukup signifikan. Tetapi bukan dengan membangun ulang seluruh sistem.

Ada satu informasi penting dari klarifikasi Anda:

> Seluruh state sudah disatukan menjadi satu di local. Jadi, target arsitektur kita adalah satu canonical state repository dan satu state mount, bukan mempertahankan dua state repository.

Ini mengubah hasil adjudikasi audit sebelumnya.

Deklarasi dua submodule yang terlihat pada remote GitHub harus diperlakukan sebagai kemungkinan konfigurasi remote yang belum sinkron dengan kondisi lokal. Kita tidak boleh menjadikan temuan remote tersebut sebagai alasan untuk memisahkan kembali state yang sudah dikonsolidasikan.

Saya mengusulkan kita mengubah cara pandang terhadap `.eos-state`:

Dari sekadar Engineering Memory Repository menjadi EOS Institutional Memory & Governance Substrate.

Namun, ada batas penting: `.eos-state` tidak boleh berkembang menjadi sistem operasi kedua, workflow engine kedua, atau Work Core kedua.

## 1. Apakah perlu DDD dan Bounded Context?

Recommended

Ya, tetapi gunakan DDD untuk memisahkan tanggung jawab dan authority, bukan untuk memecah repository menjadi banyak package atau service.

Ada tiga pendekatan yang perlu dibedakan:

| Pendekatan      | Rekomendasi                                                              |
| --------------- | ------------------------------------------------------------------------ |
| Strategic DDD   | Sangat diperlukan                                                        |
| Bounded Context | Diperlukan pada logical boundary                                         |
| Tactical DDD    | Selektif, hanya untuk domain yang memiliki aturan dan lifecycle kompleks |

Menurut saya, kesalahan yang perlu dihindari adalah membuat:

- `proof-domain` sebagai domain baru yang menduplikasi Proof Ledger.
- `work-domain` sebagai duplikasi Work Core.
- `governance-engine` sebagai engine kedua.
- `memory-engine` sebagai pengganti seluruh mekanisme state yang sudah berjalan.

DDD harus mengurangi coupling dan memperjelas ownership, bukan menambah kompleksitas.

## 2. Target architecture: Logical Bounded Contexts

Saya mengusulkan empat Bounded Context utama untuk Engineering Memory.

BC-01 · MEMORY & CONTINUITY

Engineering Memory

Memiliki tanggung jawab terhadap:

- Journey history.
- Milestones.
- Experiments.
- Historical engineering records.
- Open engineering issues.

Menjawab: Apa yang terjadi dan bagaimana engineering berkembang?

BC-02 · DECISION & ARCHITECTURE

Architecture Governance

Memiliki tanggung jawab terhadap:

- Architecture Decision Records.
- Architecture baseline.
- Domain boundaries.
- Dependency decisions.
- Superseded decisions.
- Architecture compliance references.

Menjawab: Mengapa sistem dirancang seperti ini?

BC-03 · EVIDENCE & VERIFICATION

Evidence Integrity

Memiliki tanggung jawab terhadap:

- State mutation proofs.
- Verification records.
- Test evidence.
- Audit trails.
- Evidence provenance.
- Acceptance results.

Menjawab: Apa yang benar-benar sudah dibuktikan?

BC-04 · GOVERNANCE & AUTHORITY

Governance Control

Memiliki tanggung jawab terhadap:

- Authorization policies.
- Approval records.
- Governance gates.
- Baseline status.
- Mutation permissions.
- Exception decisions.

Menjawab: Siapa yang berwenang mengubah apa?

Ada satu boundary lintas domain: Dependency & Traceability.

Saya tidak akan langsung menjadikannya Bounded Context kelima. Pada tahap pertama, jadikan relasi dan metadata lintas konteks yang memanfaatkan mekanisme dependency dan ownership graph EOS yang sudah tersedia.

### Context map

\#chatgpt-mermaid-\_r_fmj\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_fmj\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_fmj\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_fmj\_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-\_r_fmj\_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_fmj\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_fmj\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_fmj\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_fmj\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_fmj\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_fmj\_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_fmj\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_fmj\_ p{margin:0;}#chatgpt-mermaid-\_r_fmj\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ .cluster-label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ .cluster-label span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_fmj\_ .label text,#chatgpt-mermaid-\_r_fmj\_ span{fill:rgb(13, 13, 13);color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ .node rect,#chatgpt-mermaid-\_r_fmj\_ .node circle,#chatgpt-mermaid-\_r_fmj\_ .node ellipse,#chatgpt-mermaid-\_r_fmj\_ .node polygon,#chatgpt-mermaid-\_r_fmj\_ .node path{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .rough-node .label text,#chatgpt-mermaid-\_r_fmj\_ .node .label text,#chatgpt-mermaid-\_r_fmj\_ .image-shape .label,#chatgpt-mermaid-\_r_fmj\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_fmj\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .rough-node .label,#chatgpt-mermaid-\_r_fmj\_ .node .label,#chatgpt-mermaid-\_r_fmj\_ .image-shape .label,#chatgpt-mermaid-\_r_fmj\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_fmj\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_fmj\_ .root .anchor path{fill:rgb(143, 143, 143)!important;stroke-width:0;stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_fmj\_ .arrowheadPath{fill:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_fmj\_ .edgePath .path{stroke:rgb(143, 143, 143);stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .flowchart-link{stroke:rgb(143, 143, 143);fill:none;}#chatgpt-mermaid-\_r_fmj\_ .edgeLabel{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_fmj\_ .edgeLabel p{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_fmj\_ .edgeLabel rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_fmj\_ .labelBkg{background-color:rgba(252, 252, 252, 0.5);}#chatgpt-mermaid-\_r_fmj\_ .cluster rect{fill:rgb(243, 243, 243);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .cluster text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ .cluster span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(243, 243, 243);border:1px solid rgba(0, 0, 0, 0.1);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_fmj\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_fmj\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_fmj\_ .icon-shape,#chatgpt-mermaid-\_r_fmj\_ .image-shape{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_fmj\_ .icon-shape p,#chatgpt-mermaid-\_r_fmj\_ .image-shape p{background-color:rgb(252, 252, 252);padding:2px;}#chatgpt-mermaid-\_r_fmj\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_fmj\_ .image-shape .label rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_fmj\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_fmj\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_fmj\_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_fmj\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_fmj\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_fmj\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_fmj\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_fmj\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_fmj\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_fmj\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_fmj\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_fmj\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_fmj\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_fmj\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .node rect,#chatgpt-mermaid-\_r_fmj\_ .node circle,#chatgpt-mermaid-\_r_fmj\_ .node ellipse,#chatgpt-mermaid-\_r_fmj\_ .node polygon,#chatgpt-mermaid-\_r_fmj\_ .node path{fill:rgb(229, 243, 255);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_fmj\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_fmj\_ .mermaid-decision .label-container{fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_fmj\_ .edgePaths .flowchart-link{stroke:rgb(143, 143, 143);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_fmj\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_fmj\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Engineering MemoryDecision & ArchitectureGovernance & AuthorityEvidence & VerificationWork CoreEOS RuntimeAgentic Workauthorizescontrolscontrolsconstrainsreferencescanonical identityexecution evidenceconsumes contextrequests authorized changes

Perhatikan bahwa Agentic Work bukan pemilik Engineering Memory. Agent membaca konteks, mengusulkan perubahan, dan menjalankan pekerjaan sesuai authority yang diberikan.

Ini sesuai dengan prinsip Strategic DDD: setiap model memiliki batas konsistensi sendiri dan hubungan antar-model harus dinyatakan secara eksplisit.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://martinfowler.com\&sz=32)

martinfowler.com



## 3. Apakah perlu mengubah struktur direktori?

Ya. Tetapi saya merekomendasikan reorganisasi berdasarkan semantic ownership, bukan sekadar mengelompokkan file berdasarkan jenis ekstensi.

Target konseptual:

```
.eos-state/
│
├── manifest.yaml
│
├── engineering-memory/
│   ├── journeys/
│   ├── milestones/
│   ├── experiments/
│   └── open-issues/
│
├── architecture/
│   ├── decisions/
│   ├── baselines/
│   ├── boundaries/
│   └── dependencies/
│
├── evidence/
│   ├── proofs/
│   ├── verification/
│   ├── audits/
│   └── acceptance/
│
├── governance/
│   ├── policies/
│   ├── authorization/
│   ├── approvals/
│   └── exceptions/
│
├── coordination/
│   ├── command-center/
│   └── handoffs/
│
├── contracts/
│   ├── schemas/
│   └── domain-references/
│
└── indexes/
    ├── work-index.yaml
    ├── evidence-index.yaml
    └── decision-index.yaml
```

Proposed target — not migration authorization

Ada beberapa aturan penting:

1. Jangan memindahkan semua file sekaligus.
2. Jangan membuat duplikasi evidence untuk memenuhi struktur baru.
3. Jangan mengubah ID Work, proof ID, atau historical references.
4. Jangan membuat index sebagai source of truth kedua.
5. Pertahankan backward compatibility untuk seluruh consumer.
6. File yang belum jelas ownership-nya tetap berada di lokasi lama sampai selesai adjudication.

Khusus `contracts/domains/SG-*`, kita harus mengaudit apakah itu benar-benar kontrak domain, kontrak integrasi, atau sekadar spesifikasi slice pekerjaan. Jangan mencampurkan ketiganya.

## 4. NEXT LEVEL: bagaimana refactor implementasinya?

Saya melihat ada lima peningkatan yang lebih penting daripada sekadar reorganisasi folder.

### A. State Mutation Integrity

Ini prioritas tertinggi.

Mutation flow yang ideal:

```
REQUEST
   │
   ▼
AUTHORIZATION
   │
   ▼
VALIDATION
   │
   ▼
INVARIANT CHECK
   │
   ▼
PREPARE MUTATION
   │
   ▼
COMMIT STATE
   │
   ▼
VERIFY PROOF
   │
   ▼
PUBLISH RESULT
```

Harus ada penanganan khusus untuk kegagalan di tengah proses.

Contohnya, jika state berhasil ditulis tetapi evidence gagal dibuat, sistem tidak boleh mengumumkan `PASS`.

Perlu:

- Atomic file replacement.
- Optimistic concurrency atau locking yang sesuai.
- Idempotency untuk replay.
- Recovery setelah partial failure.
- Hash verification.
- Explicit mutation result.

Kita dapat memperkuat flow yang sudah ada tanpa membuat mutation engine baru.

### B. Evidence Integrity & Provenance

Ribuan file proof tidak otomatis berarti ribuan bukti valid.

Setiap proof perlu dapat diverifikasi berdasarkan:

| Elemen         | Fungsi                       |
| -------------- | ---------------------------- |
| Identity       | ID unik evidence             |
| Actor          | Pelaku yang menghasilkan     |
| Work reference | Work terkait                 |
| Timestamp      | Waktu kejadian               |
| Subject        | Objek yang dibuktikan        |
| Before/after   | Perubahan yang terjadi       |
| Provenance     | Asal evidence                |
| Integrity      | Hash dan hubungan integritas |
| Verification   | Hasil pemeriksaan            |

Proof historis harus tetap dapat dibaca meskipun schema berubah.

### C. Contract Evolution

Ini penting karena `.eos-state` sudah memiliki banyak kontrak.

Kita perlu:

- Schema versioning.
- Compatibility checks.
- Explicit deprecation.
- Contract migration rules.
- Historical schema preservation.
- Producer-consumer compatibility tests.

Jangan sampai perubahan Gate A–F membuat evidence lama tidak bisa dibaca.

### D. Agent-Readable Memory

Ini yang membuat `.eos-state` benar-benar naik level.

Agent tidak perlu membaca ribuan file setiap kali mulai bekerja.

Kita perlu kemampuan retrieval berdasarkan:

- Work identity.
- Domain dan bounded context.
- Decision dependencies.
- Evidence requirements.
- Governance status.
- Historical changes.
- Current unresolved issues.

Contoh:

Seorang AI Agent Engineer mendapatkan tugas memperbaiki ComfyUI integration.

Sistem seharusnya memberikan:

1. Kontrak domain terkait.
2. Keputusan arsitektur yang masih berlaku.
3. Evidence implementasi sebelumnya.
4. Invariant Work Core.
5. Governance restrictions.
6. Open issues yang relevan.

Agent tidak perlu mengarang konteks dari percakapan lama.

### E. Observability & State Health

`.eos-state` juga membutuhkan pengukuran kesehatan:

- Invalid references.
- Orphaned proofs.
- Broken dependency links.
- Schema drift.
- Stale indexes.
- Unauthorized mutation attempts.
- Incomplete mutation transactions.
- Evidence integrity failures.

Namun, metrik harus benar-benar mengukur kondisi sistem. Contohnya EWMA tidak boleh dilabeli sebagai P95.

## 5. Apakah perlu Event Sourcing?

Selective adoption

Saya tidak merekomendasikan full Event Sourcing untuk seluruh `.eos-state`.

Namun, pola append-only untuk mutation evidence sangat relevan.

Ada perbedaan:

| Pola                | Penggunaan                              |
| ------------------- | --------------------------------------- |
| Snapshot state      | Membaca kondisi journey terkini         |
| Append-only proof   | Mempertahankan bukti perubahan          |
| Decision records    | Menyimpan alasan dan konsekuensi        |
| Index/projection    | Mempercepat pencarian                   |
| Full Event Sourcing | Tidak perlu diterapkan ke seluruh state |

Event Sourcing menawarkan auditability dan rekonstruksi histori, tetapi juga meningkatkan kompleksitas concurrency, schema evolution, replay, dan migration.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.aws.amazon.com\&sz=32)

AWS Prescriptive Guidance+1



Rekomendasi: pertahankan model state yang sekarang, perkuat append-only evidence, dan gunakan recovery mechanism yang sesuai.

Jangan mengubah seluruh `.eos-state` menjadi event store hanya karena ingin terlihat lebih modern.

## 6. Refactoring roadmap — lima execution waves

Saya menyarankan implementasi vertikal, bukan refactor horizontal seluruh repository.

| Wave | Work ID            | Deliverable                                  | Priority |
| ---- | ------------------ | -------------------------------------------- | -------- |
| 1    | EOS-STATE-NEXT-001 | Canonical ownership & boundary map           | P0       |
| 2    | EOS-STATE-NEXT-002 | Mutation integrity & recovery                | P0       |
| 3    | EOS-STATE-NEXT-003 | Evidence provenance & schema evolution       | P1       |
| 4    | EOS-STATE-NEXT-004 | Semantic reorganization & compatibility      | P1       |
| 5    | EOS-STATE-NEXT-005 | Agent-readable memory & health observability | P2       |

### Acceptance criteria

Setiap wave wajib memenuhi:

- 100% reuse terhadap primitive EOS yang sudah tersedia.
- Tidak ada duplicate Work identity.
- Tidak ada kehilangan historical evidence.
- Tidak ada governance bypass.
- Seluruh consumer lama tetap berfungsi atau memiliki migration plan.
- Test dan verification evidence tersedia.
- Tidak ada perubahan frozen-core tanpa otorisasi.

## 7. Posisi `.eos-state` dalam Genesis EOS

Ini juga penting untuk arah besar EOS.

## EOS Institutional Architecture

Genesis EOS — Business Domain

Organisasi, business capabilities, actors, responsibilities, dan business policies.

EOS Core — Semantic Authority

Work Core, continuity, ownership, governance authority.

`.eos-state` — Institutional Engineering Memory

Engineering decisions, history, proof, architecture evolution, institutional knowledge.

Agentic Work — Execution

Agents, tools, orchestration, execution, coordination.

Runtime Infrastructure

Databases, event transport, storage, compute, observability.

Hubungannya:

- Genesis EOS mengetahui bagaimana organisasi bekerja.
- Work Core mengetahui Work yang sedang berlangsung.
- Engineering Memory mengetahui bagaimana EOS berkembang.
- Agentic Work melaksanakan pekerjaan.
- Runtime menyediakan infrastruktur eksekusi.

Dengan demikian, `.eos-state` tidak menjadi bagian dari business domain Genesis EOS, tetapi menjadi sumber institutional engineering knowledge yang dapat digunakan Genesis dan Agentic Work melalui kontrak yang jelas.

## 8. Final architecture decision

Recommended architecture direction

# EOS Institutional Memory 2.0

One Repository. One Mount. Multiple Bounded Contexts.

Saya merekomendasikan keputusan berikut:

| Keputusan                          | Status         |
| ---------------------------------- | -------------- |
| Single canonical state repository  | ACCEPT         |
| Single canonical state mount       | ACCEPT         |
| Strategic DDD                      | ACCEPT         |
| Logical bounded contexts           | ACCEPT         |
| Tactical DDD                       | SELECTIVE      |
| Semantic directory reorganization  | ACCEPT, phased |
| Mutation integrity refactoring     | P0             |
| Append-only evidence strengthening | ACCEPT         |
| Full Event Sourcing                | REJECT         |
| New core primitives                | REJECT         |
| Agent-readable retrieval           | ACCEPT, phased |

Architecture thesis

`.eos-state` bukan sekadar tempat EOS mengingat apa yang telah terjadi.

Ia harus memastikan setiap perubahan engineering dapat ditelusuri, setiap keputusan memiliki alasan, setiap klaim memiliki evidence, dan setiap agent dapat memahami batas authority sebelum bertindak.

### 9. Satu hal yang harus dilakukan sebelum implementasi

Karena Anda sudah menyatukan seluruh state secara lokal, saya ingin menjadikan kondisi lokal tersebut sebagai authoritative working baseline.

Urutannya:

1. Audit local `.eos-state` dan pastikan hanya satu canonical mount.
2. Inventaris semua existing directories, schemas, consumers, dan proof formats.
3. Bangun Context Map berdasarkan ownership aktual.
4. Cocokkan struktur aktual dengan target architecture.
5. Baru lakukan vertical-slice refactoring.

Jangan langsung membuat direktori baru atau memindahkan ribuan file berdasarkan rancangan konseptual di atas.

Keputusan akhir saya: REORGANIZE + REFACTOR, bukan REBUILD. DDD untuk boundaries, bukan untuk menambah framework.

Referensi desain: [Martin Fowler — Bounded Context](https://martinfowler.com/bliki/BoundedContext.html?utm_source=chatgpt.com), [Microsoft — Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing?utm_source=chatgpt.com) dan [Git — Submodule Architecture](https://git-scm.com/docs/gitsubmodules?utm_source=chatgpt.com).

Langkah paling bernilai berikutnya adalah menyusun dan menjalankan EOS-STATE-NEXT-001: Local State Architecture Discovery, sehingga desain NEXT LEVEL benar-benar mengikuti implementasi lokal, bukan memaksakan struktur baru ke dalamnya.
MCP 2026 — Deep Dive Arsitektur, Enterprise Readiness & Implikasi Strategis untuk EOS
Technical architecture review · 10 November 2026

Ada satu hal fundamental yang perlu kita pisahkan sebelum membahas implementasi:

MCP adalah standar interoperabilitas dan komunikasi antara AI applications dengan external capabilities. MCP bukan sistem yang menentukan kebenaran bisnis, kepemilikan Work, governance, atau kontinuitas eksekusi.

Pembedaan ini sangat penting bagi EOS.

MCP dapat menjadi salah satu lapisan konektivitas dalam Universal Agentic Execution Middleware, tetapi tidak boleh mengambil alih semantic authority yang dimiliki EOS.

Saya akan membedah materi tersebut dalam tiga perspektif:
1. Validitas klaim spesifikasi MCP terbaru.
2. Perubahan arsitektur dan implikasinya bagi sistem enterprise.
3. ReFactory blueprint integrasi MCP ke EOS tanpa menduplikasi Core.
1. Fact-check: mana yang benar dan mana yang perlu dikoreksi?

Terverifikasi
 Spesifikasi 2026-07-28 memang resmi dirilis pada 28 Juli 2026. Perubahan stateless core, MRTR, header-based routing, cache hints, authorization hardening, dan extensions framework sesuai pengumuman resmi MCP. 
Model Context Protocol Blog+1

Namun ada beberapa penyederhanaan dalam materi awal yang perlu diperbaiki sebelum dijadikan dasar architecture decision.
Klaim	Hasil pemeriksaan
Stateless protocol core	Benar
initialize/initialized dihapus	Benar
Mcp-Session-Id dihapus	Benar
Semua metadata ada di _meta	Perlu koreksi
Tasks menjadi extension	Benar
MCP Apps menjadi extension	Benar
MRTR menggantikan pola server-initiated lama	Benar
CIMD menggantikan DCR	Benar dengan masa transisi
Roots, Sampling, Logging deprecated	Benar
MCP server sepenuhnya stateless	Tidak sepenuhnya

Koreksi A — Protocol version bukan seluruhnya berada di _meta
Ada pemisahan yang penting:
- MCP-Protocol-Version: HTTP header yang membawa versi protokol.
- Mcp-Method: HTTP header untuk jenis RPC.
- Mcp-Name: HTTP header untuk nama tool atau target yang relevan.
- _meta: metadata terkait identitas klien dan kapabilitas yang diiklankan.
Jadi, jangan mengimplementasikan seluruh metadata request sebagai satu objek _meta. 

Model Context Protocol Blog+1

Koreksi B — Stateless bukan berarti aplikasi tidak memiliki state
Ini justru salah satu perubahan paling penting.
Sebelum MCP 2026-07-28
Client

Session ID / handshake


MCP Server Instance A
Protocol session state
Sticky routing / shared session storage


MCP 2026-07-28
Client

Self-describing requests


Instance A
Stateless


Instance B
Stateless


Instance C
Stateless



Request dapat diarahkan ke instance berbeda tanpa mempertahankan protocol session.

Tetapi MCP server tetap boleh memiliki application state, misalnya:
- workflow_id
- job_id
- browser_id
- execution_handle
State tersebut harus dikelola secara eksplisit, bukan disembunyikan dalam session transport. 

Model Context Protocol Blog+1

Implikasi: Stateless protocol adalah peningkatan skalabilitas, bukan pengganti state management, persistence, atau transaction management.
Koreksi C — Tasks dan MCP Apps bukan pengganti seluruh Core
Keduanya berada dalam framework extensions.
- Tasks: lifecycle pekerjaan asinkron dengan task handle, polling, update, dan cancellation.
- MCP Apps: kemampuan menyajikan UI interaktif melalui resources dan integrasi klien.
- MRTR: memungkinkan interaksi lanjutan selama suatu pemanggilan tool, termasuk meminta input pengguna.
Jangan menyamakan ketiganya:
Mekanisme	Tanggung jawab
MCP Tasks	Tracking operasi asinkron
MRTR	Interaksi multi-round-trip
MCP Apps	Presentation dan interaksi UI
EOS Work	Identitas dan kontinuitas pekerjaan

Tasks juga tidak otomatis memberikan durable execution, exactly-once execution, atau distributed transaction. Semua itu tetap memerlukan jaminan implementasi di lapisan aplikasi. 

Model Context Protocol Blog+1

Koreksi D — CIMD bukan sekadar penggantian nama DCR
CIMD (Client ID Metadata Documents) mengubah pendekatan identifikasi dan metadata OAuth client. DCR masih didukung untuk backward compatibility, tetapi secara formal didepresiasi.

MCP juga memperkuat validasi issuer berdasarkan RFC 9207 dan binding credential terhadap authorization server penerbitnya. 

Model Context Protocol Blog+1

Catatan: CIMD bukan solusi tunggal terhadap prompt injection. Risiko tetap harus dikendalikan melalui trust boundaries, consent, authorization, dan validasi setiap tindakan.
2. Arsitektur MCP generasi baru
2.1 Empat lapisan yang perlu dipahami
Layer 04
Presentation & Interaction

MCP Apps · UI Resources · Sandboxed iframe · Host integration


Layer 03
Agent Interaction & Execution

Tools · Resources · Prompts · Tasks · MRTR


Layer 02
Protocol & Interoperability

JSON-RPC · Streamable HTTP · Protocol metadata · Extensions · Routing


Layer 01
Infrastructure & Trust

OAuth · CIMD · TLS · Authorization · Rate limiting · Audit · Observability


Ini merupakan model konseptual untuk memahami MCP, bukan pembagian layer resmi dalam spesifikasi.
2.2 Stateless execution architecture
Perubahan ini mempunyai implikasi langsung pada desain infrastruktur.








isharadbharadwaj.medium.com


Sebelumnya, pengembang sering harus mengelola:
- Sticky sessions.
- Shared session stores.
- Session affinity.
- Connection lifecycle.
- Reconnection recovery.
Dengan arsitektur baru, request dapat diarahkan melalui load balancer biasa.

Tetapi ada empat komponen yang tetap wajib dibangun:
1. Durable storage untuk state aplikasi.
2. Idempotency untuk mencegah eksekusi ganda.
3. Authorization context yang konsisten di setiap request.
4. Observability lintas instance dan lintas execution.
Artinya, MCP menghilangkan ketergantungan pada protocol session, bukan kebutuhan terhadap distributed systems engineering.
2.3 Tasks: asynchronous execution








docs.dapr.io


Siklus Tasks:
Client
  |
  | tools/call
  v
MCP Server
  |
  | CreateTaskResult
  v
Task Handle
  |
  +---- tasks/get ------> Working
  |
  +---- tasks/update --> InputRequired
  |
  +---- tasks/get ------> Completed
  |
  +---- tasks/cancel --> Cancellation requested


Perlu diperhatikan bahwa cancellation bersifat kooperatif. Permintaan pembatalan tidak otomatis berarti proses fisik atau pekerjaan eksternal sudah berhenti. 

MCP Tasks Extension+2

Implikasi bagi enterprise:

Task handle harus mempunyai hubungan dengan durable execution record. Jangan menjadikan task ID sebagai identitas utama pekerjaan bisnis.
2.4 MCP Apps: UI menjadi bagian dari interoperabilitas








keyvalue.systems


MCP Apps membawa perubahan menarik:
- Server mendeklarasikan UI Resource dengan URI ui://.
- Tool menghubungkan dirinya dengan UI tersebut.
- Host mengambil resource dan merendernya dalam sandboxed iframe.
- UI berkomunikasi dengan host melalui mekanisme yang ditentukan extension.
Ini bukan berarti MCP server mempunyai kendali langsung terhadap seluruh interface host.

Host tetap menentukan izin, tampilan, dan kebijakan interaksi. UI juga dapat menggunakan progressive enhancement sehingga tool tetap dapat bekerja dalam bentuk teks apabila host tidak mendukung MCP Apps. 

MCP Apps+2

Ada peluang besar untuk workflow approval, dashboard operasional, konfigurasi agent, dan visualisasi hasil pekerjaan.

3. Security Architecture — hal yang tidak boleh diremehkan
MCP yang lebih modern tidak otomatis menjadikan agent aman.

Justru semakin banyak kemampuan yang diberikan kepada agent, semakin besar kebutuhan untuk mengendalikan authority.
Enterprise MCP Trust Boundary
AI Host / Agent

Untrusted intent and generated arguments


MCP Gateway
- Authentication
- Client identity
- Rate limits
- Protocol validation


Policy Enforcement
- Tenant isolation
- Capability authorization
- Human approval
- Risk classification
- Execution constraints


Authorized Tool Execution

Connector / API / External system


Evidence & Audit

Request · Decision · Result · External confirmation


Security controls yang saya rekomendasikan
Domain	Kontrol enterprise
Identity	OAuth issuer validation, CIMD
Authorization	Least privilege, capability-based access
Multi-tenancy	Tenant context validation
Execution	Policy checks sebelum dan sesudah tool call
Data	Input/output validation, data minimization
Human control	Approval untuk tindakan berisiko
Reliability	Idempotency, timeout, retry budget
Audit	Immutable evidence dan correlation IDs
Network	TLS, egress restrictions, CSP
Operations	OpenTelemetry, metrics, tracing

Satu prinsip penting:

Tool discovery bukan authorization.

Fakta bahwa sebuah agent dapat melihat suatu tool tidak berarti agent tersebut berhak menjalankannya.

MCP Apps sandbox juga bukan pengganti pemeriksaan authorization di server. Semua tindakan yang memiliki dampak bisnis harus tetap melalui pemeriksaan otoritas server-side.

Untuk UI, pendekatan sandboxed iframe, komunikasi terkontrol, dan deklarasi CSP merupakan bagian penting dari model keamanannya. 

MCP Apps+2


4. Implikasi strategis: MCP versus EOS
Ini bagian yang menurut saya paling penting dari seluruh pembahasan.

Kita harus membedakan tiga jenis authority:
Pertanyaan	Pemilik tanggung jawab
Bagaimana agent berkomunikasi dengan tools?	MCP
Bagaimana agent memperoleh kemampuan eksekusi?	Runtime / Connector
Siapa yang berhak memutuskan suatu tindakan?	Governance / Policy
Apa identitas pekerjaan yang sedang berlangsung?	EOS Work
Bagaimana kontinuitas pekerjaan dijaga?	EOS Work Core
Apakah hasil benar-benar terjadi di sistem eksternal?	External evidence + EOS evidence

MCP menjawab masalah interoperabilitas.

EOS menjawab masalah kontinuitas, authority, governance, dan semantic truth.
4.1 Posisi MCP dalam Universal Agentic Execution Middleware
EOS
Universal Agentic Execution Middleware

Semantic authority · Work continuity · Governance

Controlled capability interface

Execution & Integration Fabric
MCP

Tool interoperability


A2A

Agent communication


gRPC

Service communication


MQTT

Device messaging





Heterogeneous Execution Substrate

AI agents · Human actors · Robots · APIs · External providers · DePIN


Diagram tersebut adalah target positioning arsitektur, bukan klaim bahwa semua protokol sudah terintegrasi atau diimplementasikan dalam EOS.
4.2 Mengapa MCP tidak boleh menjadi Work Engine EOS?
Misalkan sebuah agent menjalankan pekerjaan:

Create AI Product Photography

Urutannya:
1. EOS menerima dan mempertahankan identitas Work.
2. EOS menentukan authority dan execution policy.
3. Agent memilih kemampuan ComfyUI melalui MCP.
4. MCP meneruskan tool call.
5. ComfyUI menjalankan proses generasi.
6. MCP Tasks dapat memberikan task handle dan status.
7. EOS menghubungkan hasil, status, biaya, dan evidence dengan Work yang sama.
8. EOS memverifikasi hasil eksternal sebelum menyatakan pekerjaan selesai.
Perhatikan perbedaannya:
Komponen	Identitas
EOS	logicalWorkId
MCP	Tool call / request ID
MCP Tasks	taskId
ComfyUI	providerJobId
EOS Evidence	Evidence record ID

Tidak boleh ada asumsi bahwa keempat identitas tersebut merupakan hal yang sama.
Invariant
Work tetap satu. Authority berubah. Execution dapat diganti. Evidence tetap dapat ditelusuri.

Inilah yang menjaga EOS tetap independen dari MCP, ComfyUI, model LLM, atau vendor runtime tertentu.
5. EOS ReFactory Blueprint — MCP Integration
Saya merekomendasikan agar EOS tidak membangun MCP sebagai sistem baru yang berdiri sendiri.

Tempatkan MCP sebagai adapter/interoperability capability di dalam existing connector-ecosystem.

Ini mempertahankan pemisahan antara semantic authority dan integration substrate.
5.1 Target architecture
EOS MCP Integration Blueprint
Proposed · No Frozen Core Changes
FACE / Agent Experience

ChatGPT · Trae · OpenClaw · Custom FACE


EOS Work Core

Logical Work ID · State · Authority · Continuity


Existing EOS Governance & Execution
Policy Enforcement

Capability Registry

Evidence Registry

Dependency Graph




Connector Ecosystem
MCP Adapter Boundary
MCP Client · MCP Server Adapter · Protocol Negotiation · Tool Mapping


ComfyUI

AI media


Business APIs

External systems


Other Agents

Capabilities




5.2 Boundary ownership
Existing EOS domain	MCP integration responsibility
work-core	Tidak berubah
connector-ecosystem	MCP transport and adapter
Capability Registry	Discovery dan mapping kemampuan
Governance	Authorization dan execution policy
Evidence Registry	Pencatatan hasil dan bukti
Dependency Graph	Hubungan Work dengan execution dependencies
FACE	Interaksi dan visualisasi

Jangan membuat:
- MCP Work Database.
- MCP Workflow Engine.
- MCP Agent Registry sebagai duplikasi EOS.
- MCP Task Database sebagai pengganti Work Core.
- MCP Authorization Engine yang menyaingi governance EOS.
MCP adapter boleh mempunyai operational storage untuk kebutuhan teknis, tetapi tidak boleh menjadi semantic source of truth.
5.3 Data contract yang perlu dipetakan
Berikut adalah contoh kontrak integrasi konseptual, bukan klaim tentang schema EOS yang sudah tersedia.
interface EOSMCPExecutionContext {
  logicalWorkId: string;
  tenantId: string;
  actorId: string;
  capabilityId: string;
  policyContext: {
    authorization: string;
    approvalRequired: boolean;
  };
  correlationId: string;
  idempotencyKey: string;
}

interface MCPExecutionReference {
  serverId: string;
  toolName: string;
  requestId?: string;
  taskId?: string;
  providerJobId?: string;
}

interface EOSExecutionEvidence {
  logicalWorkId: string;
  executionReference: MCPExecutionReference;
  outcome: "succeeded" | "failed" | "cancelled";
  externalEvidenceRef?: string;
  verifiedAt?: string;
}


Prinsipnya:
- Context EOS masuk ke adapter sebagai execution context.
- Adapter melakukan mapping ke MCP request.
- MCP response dikembalikan sebagai execution result.
- EOS mempertahankan identitas dan authority.
- Evidence baru dinyatakan valid setelah verifikasi yang sesuai.
Untuk transaksi finansial atau perubahan data eksternal, jangan menganggap tools/call sukses sebagai bukti settlement atau business completion.
5.4 Perilaku yang wajib ditangani adapter
Kondisi	Perilaku EOS
MCP timeout	Work tetap ada
MCP server unavailable	Retry berdasarkan policy
Duplicate request	Idempotency protection
Task cancelled	Verifikasi cancellation aktual
Task failed	Evidence failure
Provider success	Verifikasi external outcome
Authorization revoked	Tolak eksekusi lanjutan
Agent diganti	Work continuity tetap dipertahankan


6. Roadmap implementasi — vertical slices
Saya tidak merekomendasikan implementasi seluruh MCP specification sekaligus.

Mulai dari satu business capability yang sudah mempunyai nilai nyata dan infrastruktur EOS yang dapat digunakan kembali.

Strategi
 Reuse existing primitives terlebih dahulu, tanpa mengubah Frozen Core.
MCP-EOS Integration Roadmap
1. Phase 0 — Architecture & Compatibility Audit
   First priority
   - Audit existing connector ecosystem.
   - Audit Notion Registry dan EOS capabilities.
   - Verifikasi MCP SDK dan versi protokol.
   - Petakan existing authorization/evidence contracts.
   - Susun ADR dan frozen-core inventory.
   Output: Compatibility Matrix + ADR + Gap Analysis
2. Phase 1 — MCP Client Vertical Slice
   - Satu existing EOS capability.
   - Satu remote MCP server.
   - Tool discovery dan invocation.
   - Tenant isolation.
   - Request correlation dan evidence.
   Output: Verified MCP Tool Execution
3. Phase 2 — Asynchronous Execution
   - Integrasi MCP Tasks.
   - Task-to-Work correlation.
   - Polling dan cancellation.
   - Retry dan idempotency.
   - Failure recovery.
   Output: Durable Work Continuity
4. Phase 3 — MCP Server Exposure
   - Expose selected EOS capabilities.
   - Define external tool contracts.
   - Authorization boundary.
   - Rate limits dan audit.
   - Compatibility dengan external hosts.
   Output: EOS as an interoperable capability provider
5. Phase 4 — MCP Apps
   - UI Resource integration.
   - Approval experience.
   - Execution monitoring.
   - Result visualization.
   - Progressive enhancement.
   Output: Interoperable Agent Experience
6. Phase 5 — Enterprise Hardening
   - Horizontal scaling.
   - Security testing.
   - Multi-tenant isolation.
   - Observability.
   - Load testing dan failure injection.
   - Independent verification.
   Output: Production Readiness Evidence

6.1 Acceptance gates
Gate	Acceptance criteria
G0	Existing architecture dan compatibility terverifikasi
G1	Tool invocation berhasil dan terotorisasi
G2	Work continuity terjaga saat timeout/retry
G3	Task lifecycle dapat ditelusuri
G4	MCP server tidak dapat melewati EOS governance
G5	UI tidak melewati authorization boundary
G6	Multi-instance execution lolos independent verification

Tidak ada alasan untuk membuka Frozen Core demi memenuhi G0–G6.
7. Architecture Decisions (ADR) yang saya rekomendasikan
Berikut keputusan yang sebaiknya menjadi pegangan sebelum implementasi.
ID	Architecture Decision	Status
MCP-ADR-001	MCP menjadi interoperability adapter, bukan Work Engine	Proposed
MCP-ADR-002	EOS Work Core tetap semantic authority	Proposed
MCP-ADR-003	Protocol stateless, application state tetap durable	Proposed
MCP-ADR-004	MCP Tasks tidak menggantikan EOS Work lifecycle	Proposed
MCP-ADR-005	Semua tool execution tunduk pada EOS governance	Proposed
MCP-ADR-006	MCP Apps menjadi optional FACE enhancement	Proposed
MCP-ADR-007	Evidence harus dapat ditelusuri ke logicalWorkId	Proposed
MCP-ADR-008	MCP SDK dan protocol version harus interchangeable	Proposed

7.1 Hal yang belum boleh diasumsikan
Ada tiga persoalan yang harus masuk audit:

A. SDK maturity

Pengumuman resmi spesifikasi menyebut SDK TypeScript, Python, Go, dan C# diperbarui untuk rilis ini. Jangan menganggap seluruh SDK pihak ketiga atau seluruh implementasi bahasa sudah mempunyai tingkat kompatibilitas yang sama. 

Model Context Protocol Blog+1

B. Deprecation

Roots, Sampling, Logging, dan legacy HTTP+SSE mendapatkan masa transisi minimal 12 bulan. Artinya, jangan menganggap semuanya sudah dihapus pada November 2026. Tetapkan compatibility matrix untuk klien dan server lama. 

Model Context Protocol Blog+1

C. Interoperability bukan semantic interoperability

MCP menyederhanakan cara sistem berkomunikasi. Namun dua server tetap bisa memiliki definisi bisnis, authorization semantics, dan data contracts yang berbeda.

MCP tidak otomatis menyelesaikan persoalan tersebut.

8. Posisi MCP dalam evolusi Agentic AI Foundation






















6











MCP kini berada dalam ekosistem yang lebih luas di bawah Agentic AI Foundation.

AAIF dibentuk pada Desember 2025 dengan kontribusi awal MCP, goose, dan AGENTS.md. Pada Oktober 2026, fondasinya telah berkembang menjadi sepuluh proyek. 

Linux Foundation+1

Ini menunjukkan bahwa masa depan agentic infrastructure tidak hanya bergantung pada satu protokol.

Ekosistem tersebut bergerak menuju standardisasi beberapa lapisan:
- Agent capabilities.
- Model interoperability.
- Agent-to-agent communication.
- Tool interoperability.
- Secure execution environments.
- Reusable agent skills.
Bagi EOS, ini memperkuat keputusan untuk tidak mengunci arsitektur pada satu vendor, satu model, atau satu protokol.

9. Keputusan strategis akhir untuk EOS
MCP ≠ EOS
MCP connects capabilities. EOS preserves Work.

MCP
- Universal tool interoperability.
- Standardized execution interface.
- Remote capability access.
- Interactive extension ecosystem.
EOS
- Universal Agentic Execution Middleware.
- Semantic Source of Truth.
- Work Continuity.
- Authority & Governance.
- Evidence & Accountability.
  
  Everything Can Change. Work Remains.
  Authority is replaceable. Work is continuous.

Rekomendasi saya:

Jadikan MCP-EOS Integration sebagai vertical-slice engineering initiative di bawah existing connector-ecosystem, bukan proyek pembangunan subsystem baru.

Prioritasnya:
1. Audit existing EOS capabilities dan connector ecosystem.
2. Audit existing MCP-related implementations di repository dan Notion Registry.
3. Verifikasi kompatibilitas SDK 2026-07-28.
4. Buat MCP compatibility matrix dan ADR.
5. Pilih satu existing business capability untuk pilot.
6. Buktikan Work continuity, governance, evidence, dan failure recovery.
7. Baru pertimbangkan MCP Apps dan ekspansi ke multi-agent.
Tidak perlu menambahkan primitive baru sebelum audit membuktikan kebutuhan tersebut.
Referensi teknis primer
- MCP Specification — 2026-07-28 Release
- Official MCP Specification
- SEP-2663 — Tasks Extension
- MCP Apps Architecture
- MCP Release Candidate — Architecture & Migration
- AAIF — October 2026 Ecosystem Update

Langkah berikutnya yang saya sarankan: lakukan MCP-EOS Architecture & Compatibility Audit terlebih dahulu, kemudian hasilnya menjadi dasar Blueprint implementasi yang benar-benar sesuai kondisi repository Enterprise-OS, bukan asumsi arsitektur baru.

Saya juga bisa membantu memantau perubahan spesifikasi MCP, SDK, dan security advisories setiap bulan agar compatibility EOS tidak tertinggal.
🔎Monitor MCP changes monthlyTap to set up
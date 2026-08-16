const fs = await import('fs');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';

const b4Harness = {
  work_id: 'B4-BLACKBOX-HARNESS',
  version: '1.0.0',
  created_at: TIMESTAMP,
  synced_with_commander: '2026-08-15 War Room Assessment (Engineering First Light 🟢 EOS First Light 🟡 B4 🟡/🔴 Production 🔴)',
  acceptance_bar: {
    definition: 'HTTP 200 + test pass + reuse calculation ≠ human-black-box EOS acceptance. B4 = unbriefed human external observer can enter from outside, run product-specific natural jobs, and understand distinct outcomes on distinct products WITHOUT seeing shared rail/EOS internals.',
    locked_by: 'Commander EOS 2026-08-15 Assessment',
    gates: [
      'B4-G1: Unbriefed human opens LawyersHub → understands product purpose → takes natural first action → sees legal-case-specific outcome',
      'B4-G2: Same unbriefed human opens Services.ID → understands DIFFERENT product purpose → takes DIFFERENT natural first action → sees service-specific outcome',
      'B4-G3: Product distinctness LH ≠ SRV ≠ ILC ≠ Academic PROVEN by human verbal/written answers (not just structural code diff)',
      'B4-G4: Shared execution INVISIBLE to human (no EOS/registry/capability/command-bus language found on landing surfaces — only on governance trace panel by design)',
      'B4-G5: Governance chain observable — human opens trace page and can explain requirement→attribution→procedure→capability→persistence→evidence→evaluation→decision NEXT ACTION',
      'B4-G6: EOS experience = distinct product experiences glued by shared login/workspace — human does NOT feel "one app with skins"',
    ],
    pass_threshold: 'B4-G1 through B4-G6 ALL answered with evidence. 1 gate failed = B4 NOT PROVEN.',
  },
  protocol: {
    briefing_level: 'UNBRIEFED — observer told: "You are testing 3-4 web products. We will give you URLs in order. For each, answer the questions naturally. Do NOT search for explanations. We do not want you helped. We want your raw first impression."',
    forbidden_briefing: [
      'No mention of EOS, Enterprise OS, shared rail, capability registry',
      'No hint about LawyersHub/Services/ILC/Academic purpose before observer sees page',
      'No guidance on what buttons to click',
    ],
    observer_selection: 'Person who has NOT worked on EOS codebase. Has NOT read any EOS docs. Has NOT seen product demos.',
    session_flow: [
      'S1: Send observer to / (root) — let them navigate freely to signup/login/workspace OR deep-link directly to /products/lawyershub if auth is not blocking',
      'S2: Observer encounters LawyersHub first — completes Q1/Q2/Q3 LH questionnaire',
      'S3: Observer navigates OR is sent to /products/services-id — completes Q1/Q2/Q3 SRV questionnaire',
      'S4: Observer goes to /products/ilc then /products/academic — completes distinctness questionnaire D1',
      'S5: Observer goes to /products/lawyershub/requirements/case-101/trace — completes governance G8 questionnaire',
      'S6: Debrief — capture any confusion or friction points',
    ],
    evidence_required_per_session: [
      'Screenshot for each product landing (4 screenshots minimum)',
      'Written answers (verbatim) to each question from observer',
      'Screenshot of trace governance page (LH + SRV if possible)',
      'Session timestamp + observer ID (anonymous is okay)',
    ],
  },
  question_bank: {
    per_product_core_questions: {
      note: 'Applied to LawyersHub first (LH-Q1..LH-Q3), then Services.ID (SRV-Q1..SRV-Q3). Same questions but answers MUST be DISTINCT product-to-product.',
      questions: [
        {
          id: 'Q1',
          text: 'Dalam 1 kalimat, produk ini untuk apa? (In one sentence, what is this product for?)',
          type: 'open_ended',
          expected_answers: {
            lawyershub: 'Untuk mengelola kasus hukum / legal matter untuk klien hukum (bukan jasa, bukan komunitas, bukan penelitian)',
            'services-id': 'Untuk mencari / memesan jasa profesional dari provider terdaftar (bukan kasus hukum, bukan diskusi, bukan paper)',
            ilc: 'Untuk berdiskusi dan menemukan konten hukum komunitas praktisi Indonesia (bukan marketplace, bukan kasus individual)',
            academic: 'Untuk submit / mempublikasikan artikel penelitian hukum akademis (bukan diskusi pendek, bukan service)',
          },
          scoring_note: 'B4 pass = LH answer does NOT mention service/category/academic AND SRV answer does NOT mention legal case/lawyer/priority',
        },
        {
          id: 'Q2',
          text: 'Anda baru membuka halaman ini. Apa tindakan alami pertama yang akan Anda lakukan? (What is your natural first action?)',
          type: 'open_ended',
          expected_first_actions: {
            lawyershub: 'Isi form Buat Kasus → pilih Prioritas (low/medium/high) → klik Buat Kasus',
            'services-id': 'Isi form Permintaan Layanan → pilih KATEGORI (Cloud/IT/Cybersecurity/Marketing/etc) → klik Ajukan Permintaan',
            ilc: 'Pilih Topik Hukum → isi Judul Diskusi → klik Mulai Diskusi',
            academic: 'Pilih Topik Hukum → tulis Judul Artikel → klik Submit Artikel',
          },
          scoring_note: 'Natural first actions DISTINCT: LH uses PRIORITY selector, SRV uses CATEGORY selector, ILC/Academic share TOPIK but DIFFERENT CTA button wording and lifecycle',
        },
        {
          id: 'Q3',
          text: 'Setelah Anda klik tindakan pertama itu, apa yang seharusnya terjadi? Apa hasil yang Anda harapkan? (After clicking first action, what should happen? What expected result?)',
          type: 'open_ended',
          expected_product_specific_outcomes: {
            lawyershub: 'Kasus hukum tersimpan dengan status Draft → nanti assign lawyer → progress ke Open → ditutup Closed',
            'services-id': 'Permintaan layanan tersimpan Draft → diterima provider Accepted → dikerjakan → Delivered',
            ilc: 'Diskusi terbuka di komunitas → user lain reply → engagement komunitas',
            academic: 'Artikel submit Proposed → review → Accepted → Published',
          },
          scoring_note: 'LH outcome lifecycle (Draft→Open→Closed) ≠ SRV lifecycle (Draft→Accepted→Delivered) ≠ ILC community ≠ Academic publish. Distinct expected outcomes = distinct proof.',
        },
      ],
    },
    product_distinctness: [
      {
        id: 'D1',
        text: 'Anda buka ILC dan Academic. Menurut Anda, ini dua produk berbeda atau hanya skin warna / copy beda? Jelaskan.',
        expected_correct_answer: 'BEDA — ILC untuk diskusi komunitas (interaksi, reply sesama praktisi). Academic untuk publikasi ilmiah (artikel, review, published lifecycle). CTA dan cara kerja keduanya beda meskipun shared 8 pilihan Topik Hukum.',
        rule_of_two_linked: 'Shared primitive = legal-community 8 Topik Hukum. Distinct product jobs = community discussion vs academic publication. Rule of Two EKONOMIS = 2 outputs / 1 primitive cost.',
      },
      {
        id: 'D2',
        text: 'Bandingkan LawyersHub dan Services.ID. Form input dan tombol CTA-nya beda secara produk-spesifik atau "ganti label doang"?',
        expected_correct_answer: 'BEDA SECARA SPESIFIK — LH pilih PRIORITAS (low/medium/high/critical) dengan workflow kasus hukum Close. SRV pilih KATEGORI (Cybersecurity/IT/Cloud/Marketing/dll) dengan workflow Deliver service. Ini bukan sekadar ganti label, ini domain pekerjaan BERBEDA.',
      },
    ],
    governance_trace: [
      {
        id: 'G8',
        text: 'Anda buka halaman governance trace /products/lawyershub/requirements/case-101/trace. Sebutkan 8 node yang Anda lihat dan jelaskan SECARA SEDERHANA apa yang terjadi di node DECISION: apa NEXT ACTION untuk kasus ini?',
        expected_node_list: ['REQUIREMENT (user intent)', 'ATTRIBUTION (session identity)', 'PROCEDURE (resolver)', 'CAPABILITY (command per produk)', 'PERSISTENCE (simpan ke repo)', 'EVIDENCE (ledger record)', 'EVALUATION (kriteria konstitusi)', 'DECISION (next action for human)'],
        expected_next_action_lh: 'Next action untuk LawyersHub = Assign lawyer ke kasus atau Close case jika selesai (product-specific decision).',
        expected_next_action_srv: 'Next action untuk Services.ID = Accept quotation / terima permintaan provider atau Tandai service sudah delivered.',
        scoring_note: 'Human dapat menjelaskan minimal 5/8 node, dan dapat menyebut NEXT ACTION YANG SESUAI PRODUK (bukan generic). Ini bukti governance CHAIN bukan hanya tulisan di code tapi OBSERVABLE oleh manusia.',
      },
    ],
    shared_rail_invisibility: [
      {
        id: 'INV1',
        text: 'Scroll SAMPAI BAWAH halaman landing LawyersHub/SRV/ILC/Academic. Apakah Anda menemukan kata-kata berikut: EOS, registry, command bus, shared rail, capability invocation, unified command? (YA/TIDAK untuk masing-masing kata)',
        expected: 'SEMUA TIDAK ditemukan di landing pages. Kata-kata ini HANYA boleh muncul di governance TRACE PAGE dalam panel "SHARED RAIL INVISIBILITY CHECK" yang disengaja. Jika ada leak → MF-002 fix perlu di-reapply.',
      },
    ],
  },
  automated_structural_evidence_snapshot: {
    note: 'These are structural checks already passed via automation. HUMAN BLACK-BOX is still the acceptance gate. Automated evidence = NECESSARY NOT SUFFICIENT per Commander.',
    already_structural_proven: {
      'HTTP 8/8 routes 200 + adapter content present': 'PASS (B4-A 21/21)',
      'SRV replay tests': 'PASS (8/8 services-id.test.ts)',
      'ILC replay tests': 'PASS (9/9 ilc.test.ts)',
      'Governance 8-node chain renders': 'PASS (B4-E 8/8 structural, product-specific distinct next-actions)',
      'LH proper name LawyersHub (10x) dominates lowercase lawyershub (4x)': 'PASS (B4-A)',
      'Shared execution leak MF-002 removed landing pages': 'PASS (4/4 product pages CLEAN)',
      'SRV CATEGORY selector vs LH PRIORITY selector vs ILC+Academic TOPIK selector structural': 'PROVEN',
      'Rule of Two: shared legal-community → 2 distinct product jobs (ILC + Academic)': 'PROVEN structural',
      'Thin App signal: Academic 31 LOC marginal + no primitive fork': 'PROVEN',
    },
    still_requires_human: {
      'B4-G1 LH natural flow understood': 'PENDING',
      'B4-G2 SRV DIFFERENT natural flow understood': 'PENDING',
      'B4-G3 Distinctness verbal proof': 'PENDING',
      'B4-G4 Invisibility human verification': 'PENDING',
      'B4-G5 Governance human explainable': 'PENDING',
      'B4-G6 Not "one app with skins"': 'PENDING',
    },
  },
  replay_artifacts_to_capture: {
    path: '/root/Enterprise-OS/workspace/.eos-state/evidence/',
    expected_files_after_human_session: [
      'B4-SESSION-observer-<id>-LH-screenshot.png',
      'B4-SESSION-observer-<id>-SRV-screenshot.png',
      'B4-SESSION-observer-<id>-Q-A-verbatim-answers.json',
      'B4-SESSION-observer-<id>-governance-trace-explanation.md',
      'B4-SESSION-observer-<id>-final-verdict.json (B4-G1..G6 per-gate PASS/FAIL)',
    ],
  },
  economic_leverage_note: {
    shared_rail_to_marginal_ratio_srv_corrected_commander: '86,840 shared rail LOC / 1,353 SRV marginal = ~64.2x structural leverage INDICATOR (NOT 66x as previously reported)',
    true_reuse_percentage_denominator_locked_by_commander: 'NOT YET LOCKED — reuse % requires denominator definition agreement; 98.5% structural shared-to-marginal ratio is reported as IS, not economic reuse.',
    economic_66x_cheaper_claim_status: 'REJECTED per Commander 2026-08-15. LOC ≠ cost. Economic leverage requires engineering effort/time data.',
    strongest_thin_app_signal: 'Academic product = 31 LOC marginal (adapter + copy + lifecycle). 4th product output / 1 shared rail primitive cost = VERY STRONG structural leverage signal.',
  },
};

const outdir = '/root/Enterprise-OS/workspace/.eos-state/evidence';
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

const outfile = outdir + '/B4-BLACKBOX-HARNESS-' + TIMESTAMP + '.json';
fs.writeFileSync(outfile, JSON.stringify(b4Harness, null, 2));

const observerScript = `# EOS B4 HUMAN BLACK-BOX OBSERVER SCRIPT
## Generated: ${TIMESTAMP}

### RULE FOR YOU (Observer):
- Anda TIDAK AKAN diberi briefing tentang EOS/LawyersHub/Services/ILC/Academic.
- Jawab dengan PENGALAMAN PERTAMA ANDA SAJA.
- Jika bingung, TULISKAN "SAYA TIDAK TAHU" atau "SAYA BINGUNG". Jangan menebak.
- Setiap halaman: Baca sebentar, lakukan tindakan alami pertama yang ingin Anda lakukan, lalu jawab pertanyaan.

---

## SESI 1: LawyersHub
URL: http://localhost:3004/products/lawyershub

**LH-Q1**: Dalam 1 kalimat, produk ini untuk apa?
\`\`\`text
(jawaban Anda)
\`\`\`

**LH-Q2**: Apa tindakan alami PERTAMA yang Anda lakukan / ingin lakukan di halaman ini?
\`\`\`text
(jawaban Anda)
\`\`\`

**LH-Q3**: Setelah Anda klik tombol utama / lakukan tindakan pertama, apa hasil yang Anda HARAPKAN terjadi? Bagaimana workflow produk ini dari awal sampai selesai?
\`\`\`text
(jawaban Anda)
\`\`\`

---

## SESI 2: Services.ID
URL: http://localhost:3004/products/services-id

**SRV-Q1**: Dalam 1 kalimat, produk ini untuk apa? (Jangan lihat jawaban LawyersHub — jawab natural)
\`\`\`text
(jawaban Anda)
\`\`\`

**SRV-Q2**: Tindakan alami PERTAMA Anda di sini = apa? (Bandingkan dengan LawyersHub — apakah input field dan pilihan selector-nya TERASA beda pekerjaan?)
\`\`\`text
(jawaban Anda)
\`\`\`

**SRV-Q3**: Hasil akhir yang Anda harapkan dari produk ini = apa? Apakah lifecycle selesainya sama dengan "kasus hukum closed"?
\`\`\`text
(jawaban Anda)
\`\`\`

---

## SESI 3: ILC vs Academic DISTINCTNESS
ILC URL: http://localhost:3004/products/ilc
Academic URL: http://localhost:3004/products/academic

**D1**: Buka ILC, lalu Academic. Menurut Anda, ini 2 produk BERBEDA atau hanya "ganti warna + copy"? Apa perbedaan UTAMA yang Anda lihat?
\`\`\`text
(jawaban Anda — sebutkan CTA button, field form, dan expected outcome masing-masing)
\`\`\`

**D2**: [LawyersHub vs Services.ID] Form dan tombol CTA keduanya — menurut Anda, ini "beda label doang" atau benar-benar untuk PEKERJAAN BERBEDA?
\`\`\`text
(jawaban Anda)
\`\`\`

---

## SESI 4: GOVERNANCE TRACE (Observability)
URL: http://localhost:3004/products/lawyershub/requirements/case-101/trace

**G8**: Lihat 8 node di halaman ini.
(a) Sebutkan node-node yang Anda lihat!
(b) Di node DECISION — apa NEXT ACTION yang direkomendasikan untuk kasus ini?
(c) Apakah node-node ini membantu Anda MEMAHAMI apa yang terjadi dengan data Anda, atau hanya tulisan teknis yang tidak berguna?
\`\`\`text
(a) ...
(b) ...
(c) ...
\`\`\`

---

## SESI 5: SHARED RAIL INVISIBILITY CHECK
Buka KEEMPAT halaman landing (LH, SRV, ILC, Academic). Scroll SAMPAI BAWAH masing-masing.

**INV1**: Apakah Anda melihat kata-kata ini di HALAMAN LANDING (bukan halaman trace governance)?
  [ ] EOS
  [ ] registry / command registry
  [ ] command bus
  [ ] shared rail
  [ ] capability invocation
  [ ] unified command
Centang kata YANG ANDA TEMUKAN di landing pages. Biarkan kosong jika TIDAK DITEMUKAN.

\`\`\`text
(jawaban Anda — centang atau daftar kata yang ditemukan)
\`\`\`

---

## SESI AKHIR: Verdict
Untuk setiap kalimat, lingkari PASS atau FAIL:

B4-G1 [PASS / FAIL] — Saya paham LawyersHub untuk apa + natural first action jelas + expected outcome produk-spesifik
B4-G2 [PASS / FAIL] — Saya paham Services.ID untuk PEKERJAAN BERBEDA + natural first action BERBEDA + expected outcome BERBEDA
B4-G3 [PASS / FAIL] — LawyersHub ≠ Services.ID ≠ ILC ≠ Academic — saya rasakan beda produk, bukan sekadar skin
B4-G4 [PASS / FAIL] — Di landing pages (bukan trace), saya TIDAK menemukan bahasa teknis EOS/internal
B4-G5 [PASS / FAIL] — Governance trace node dapat saya baca dan saya bisa sebut next action per produk
B4-G6 [PASS / FAIL] — Secara keseluruhan, ini rasanya seperti beberapa produk berbeda dalam satu workspace, BUKAN satu aplikasi dengan beberapa tema warna.

\`\`\`text
(pilih PASS/FAIL per gate, dan beri satu kalimat penutup)
\`\`\`
`;

const mdOutFile = outdir + '/B4-HUMAN-OBSERVER-SCRIPT-' + TIMESTAMP + '.md';
fs.writeFileSync(mdOutFile, observerScript);

console.log('=== B4-B: STRUCTURED BLACK-BOX TEST HARNESS + QUESTION BANK GENERATED ===');
console.log('JSON Artifact: ' + outfile);
console.log('MD Observer Script: ' + mdOutFile);
console.log('');
console.log('Acceptance Bar Summary (6 gates, 6 PASS required):');
console.log('  B4-G1 LH unbriefed natural flow        : PENDING_HUMAN');
console.log('  B4-G2 SRV DIFFERENT natural flow       : PENDING_HUMAN');
console.log('  B4-G3 Distinctness verbal proof        : PENDING_HUMAN');
console.log('  B4-G4 Shared rail invisibility human   : PENDING_HUMAN');
console.log('  B4-G5 Governance explainable human     : PENDING_HUMAN');
console.log('  B4-G6 Not "one app with skins"          : PENDING_HUMAN');
console.log('');
console.log('Automated Structural Evidence (already PASS):');
console.log('  ✅ HTTP 8/8 routes + displayNames + adapters (B4-A 21/21)');
console.log('  ✅ SRV replay 8/8 tests + ILC replay 9/9 tests (B4-D)');
console.log('  ✅ Governance 8-node chain × 2 products with distinct next-actions (B4-E 8/8)');
console.log('  ✅ Leak MF-002 removed from 4 landing surfaces (shared words NOT FOUND)');
console.log('  ✅ Structural distinctness PRIORITY vs CATEGORY vs TOPIK selectors');
console.log('  ✅ Rule of Two: 1 legal-community → 2 jobs (ILC + Academic)');
console.log('  ✅ Thin App: Academic 31 LOC signal STRONG');
console.log('');
console.log('NEXT STEP: Invite unbriefed observer → run script above → capture Q&A + screenshots + verdict.');

#!/usr/bin/env node

// W06-A3-005 — Operational Readiness Test Matrix
// Acceptance Gates: O01 → O02 → O03 → O04 → O05

const W06_A3_005 = {
  id: "W06-A3-005",
  title: "Operational Readiness",
  status: "GATE_O01_IN_PROGRESS",
  strategic_context: {
    previous_milestone: "W06-A3-003-P: ACCEPTED — Assurance Baseline Established",
    decision: "genesis-eos is now a Business Domain Package, not an agentic experiment",
    architecture_principles: [
      "genesis-eos owns business semantics",
      "EOS Work Core owns authority and evidence governance",
      "Paperclip executes agents"
    ],
    hash_manifest: "W06-A3-006-HASH-MANIFEST-001 — All 11 evidence artifacts verified"
  },
  gates: [
    {
      id: "O01",
      title: "Deployment Readiness",
      focus: "Environment dan konfigurasi tervalidasi",
      evidence: [
        "Environment variables terdefinisi untuk staging/production",
        "Database migration script idempotent dan dapat dijalankan berulang",
        "Health check endpoint tersedia dan mengembalikan status sistem yang akurat",
        "Dependency graph terverifikasi tanpa konflik versi",
        "Secrets management terkonfigurasi sesuai kebijakan keamanan"
      ],
      expected_outcomes: [
        "Deployment ke staging dapat dijalankan tanpa error manual",
        "Semua service dapat start dan terhubung ke database",
        "Health check mengembalikan 200 OK dengan detail status setiap komponen"
      ],
      failure_scenarios: [
        "Database connection gagal karena konfigurasi environment",
        "Dependency conflict menyebabkan startup failure",
        "Missing environment variable menyebabkan runtime error"
      ]
    },
    {
      id: "O02",
      title: "Runtime Observability",
      focus: "Execution dan event trace lengkap",
      evidence: [
        "Execution trace tersedia untuk setiap operasi Work",
        "Event log mencatat actor, timestamp, work_id, dan outcome",
        "Evidence record terhubung dengan execution trace melalui context_trace_id",
        "Metric dasar tersedia: jumlah Work, success rate, latency",
        "Audit trail tidak dapat dimodifikasi setelah dibuat"
      ],
      expected_outcomes: [
        "Setiap operasi menghasilkan trace_id yang dapat dilacak",
        "Event log berisi semua field yang dibutuhkan untuk audit",
        "Evidence record dapat dicocokkan dengan execution trace"
      ],
      failure_scenarios: [
        "Trace ID hilang dari evidence record",
        "Event log tidak mencatat actor atau timestamp dengan benar",
        "Metric tidak terupdate ketika operasi berhasil"
      ]
    },
    {
      id: "O03",
      title: "Agent Safety",
      focus: "Budget, timeout, permissions, escalation",
      evidence: [
        "Agent execution memiliki batas waktu yang dapat dikonfigurasi",
        "Budget usage tercatat dan tidak melebihi batas yang ditentukan",
        "Permissions agent divalidasi sebelum eksekusi capability",
        "Escalation path tersedia ketika agent melebihi batas",
        "Agent tidak dapat menjalankan capability tanpa authorization policy"
      ],
      expected_outcomes: [
        "Agent timeout ketika eksekusi melebihi batas waktu",
        "Budget usage tercatat dengan benar untuk setiap eksekusi",
        "Permission denied ketika agent mencoba menjalankan capability tanpa izin"
      ],
      failure_scenarios: [
        "Agent dapat menjalankan capability tanpa authorization",
        "Timeout tidak berfungsi dan agent menggantung",
        "Budget usage tidak tercatat atau melebihi batas"
      ]
    },
    {
      id: "O04",
      title: "Business Workflow UAT",
      focus: "Skenario CTX-1 sampai CTX-5",
      evidence: [
        "CTX-1: Work creation dan assignment berhasil",
        "CTX-2: Evidence recording dan verification berhasil",
        "CTX-3: Work state transition sesuai policy",
        "CTX-4: Agent execution dan handoff ke manusia berhasil",
        "CTX-5: Audit trail dan reconstruction Work lengkap"
      ],
      expected_outcomes: [
        "Semua skenario CTX-1 sampai CTX-5 berhasil dijalankan tanpa error",
        "Setiap langkah workflow menghasilkan evidence record yang sesuai",
        "Work state berubah sesuai dengan transisi yang diizinkan"
      ],
      failure_scenarios: [
        "Work creation gagal karena validasi policy",
        "Evidence tidak tercatat ketika workflow selesai",
        "State transition tidak diizinkan tetapi tetap terjadi"
      ]
    },
    {
      id: "O05",
      title: "Incident & Recovery",
      focus: "Failure injection, recovery, audit trail",
      evidence: [
        "Database failure: sistem dapat mendeteksi failure dan mencatatnya",
        "Filesystem failure: evidence tidak hilang dan recovery dapat dijalankan",
        "Concurrent request failure: idempotency tetap terjaga",
        "Crash recovery: sistem dapat melanjutkan Work yang belum selesai",
        "Audit trail lengkap untuk semua failure dan recovery"
      ],
      expected_outcomes: [
        "Sistem menangani failure tanpa crash total",
        "Recovery mengembalikan sistem ke state yang konsisten",
        "Semua failure tercatat di audit trail dengan detail yang lengkap"
      ],
      failure_scenarios: [
        "Database failure menyebabkan data loss",
        "Recovery tidak mengembalikan state yang konsisten",
        "Failure tidak tercatat di audit trail"
      ]
    }
  ],
  acceptance_criteria: [
    "Semua gate O01 sampai O05 lulus dengan 100% pass rate",
    "Tidak ada critical atau high severity issue yang terbuka",
    "Evidence untuk setiap gate tersedia dan dapat diverifikasi",
    "Deployment script telah diuji dan dapat dijalankan berulang",
    "Failure scenarios telah diuji dan sistem menangani dengan benar"
  ],
  next_action: "Jalankan gate O01 terlebih dahulu, lanjutkan ke O02 setelah O01 lulus, dan seterusnya sesuai urutan"
};

console.log("W06-A3-005 — Operational Readiness Test Matrix");
console.log("Status:", W06_A3_005.status);
console.log("Jumlah Acceptance Gates:", W06_A3_005.gates.length);
console.log("\nGate Sequence: O01 → O02 → O03 → O04 → O05\n");

W06_A3_005.gates.forEach(gate => {
  console.log(`[${gate.id}] ${gate.title}`);
  console.log(`  Fokus: ${gate.focus}`);
  console.log(`  Bukti utama: ${gate.evidence.length} item`);
  console.log(`  Expected outcomes: ${gate.expected_outcomes.length} item`);
  console.log(`  Failure scenarios: ${gate.failure_scenarios.length} item`);
  console.log("");
});

console.log("Acceptance Criteria:");
W06_A3_005.acceptance_criteria.forEach((criteria, i) => {
  console.log(`  ${i + 1}. ${criteria}`);
});

console.log("\nNext Action:", W06_A3_005.next_action);
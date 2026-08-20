"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { decodeWorkspaceSession, createAnonymousWorkspaceSession } from "../../../packages/core/kernel/src/session/workspace-session";
import PT_ESTABLISHMENT_WORKSEED from "../work-seeds/pt-establishment.workseed.json" assert { type: "json" };

type Stage = "landing" | "discovery" | "conversation" | "escalation" | "status" | "outcome";

type NeedKey = "contract" | "legalitas" | "customer" | "employee" | "consultation" | "document";

interface ConversationMessage {
  readonly id: string;
  readonly role: "user" | "ai";
  readonly text: string;
  readonly createdAt: number;
}

interface ExecutionResult {
  readonly id: string;
  readonly type: "nda_case" | "nib_request" | "sop_article" | "pt_establishment";
  readonly title: string;
  readonly status: string;
  readonly workId?: string;
  readonly workStatus?: string;
  readonly workVerification?: string;
  readonly handoffReady?: boolean;
  readonly operatorAssigned?: string;
  readonly documentUrl?: string;
  readonly notes: readonly string[];
  readonly evidence: readonly { readonly label: string; readonly value: string }[];
  readonly nextSteps: readonly string[];
}

interface WorkPollResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly workId?: string;
  readonly status?: "draft" | "approved" | "in_delivery" | "implemented" | "verified";
  readonly verificationStatus?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly owner?: string;
  readonly priority?: string;
  readonly source?: string;
  readonly acceptanceCriteria?: readonly string[];
  readonly linkedCapabilityIds?: readonly string[];
  readonly dates?: {
    readonly createdAt: string | null;
    readonly approvedAt: string | null;
    readonly implementedAt: string | null;
    readonly verifiedAt: string | null;
    readonly updatedAt: string | null;
  };
  readonly updatedAt?: string | null;
  readonly handoffReady?: boolean;
  readonly error?: string;
}

const NEEDS: ReadonlyArray<{ readonly key: NeedKey; readonly icon: string; readonly title: string; readonly intro: string; readonly firstUserPrompt: string }> = [
  { key: "contract", icon: "📝", title: "Membuat / Memeriksa Kontrak", intro: "Kontrak vendor, NDA kerahasiaan, atau perjanjian dengan klien.", firstUserPrompt: "Saya butuh membuat NDA perjanjian kerahasiaan untuk mitra waralaba kopi saya. Tolong bantu saya dari awal." },
  { key: "legalitas", icon: "🏪", title: "Mengurus Legalitas Usaha", intro: "Pendirian PT/CV, NIB, NPWP Badan, Akta Notaris, SK Kemenkumham, PIRT, SPPL.", firstUserPrompt: "Saya mau mendirikan PT untuk usaha saya (CV/PT Perorangan). Tolong bantu dari awal sampai selesai: Akta Notaris, NIB OSS, NPWP Badan, dan SK Kemenkumham." },
  { key: "customer", icon: "🛒", title: "Masalah dengan Pelanggan", intro: "Retur barang, keluhan konsumen, atau UU Perlindungan Konsumen.", firstUserPrompt: "Pelanggan ingin retur barang yang sudah dibeli 2 minggu lalu tapi rusak karena salah pakai. Bagaimana hukumnya?" },
  { key: "employee", icon: "👷", title: "Masalah dengan Karyawan", intro: "Kontrak kerja, PHK, upah lembur, atau SOP HR.", firstUserPrompt: "Saya butuh SOP kontrak kerja karyawan harian toko kelontong saya di Solo, sesuai UU Ketenagakerjaan No.13 Tahun 2003." },
  { key: "consultation", icon: "💬", title: "Konsultasi Bisnis Harian", intro: "Pertanyaan hukum sehari-hari untuk keputusan usaha.", firstUserPrompt: "Saya mau buka cabang waralaba toko bakso saya. Apa saja yang harus saya perhatikan secara legal sebelum menandatangani MoU?" },
  { key: "document", icon: "📑", title: "Dokumen Usaha", intro: "Pembuatan SOP internal, peraturan toko, atau dokumen legal.", firstUserPrompt: "Saya butuh template peraturan internal toko yang lengkap: jam kerja, cuti bersama, sanksi keterlambatan." },
] as const;

const UMBA_STAGE_COPY: Record<Stage, { readonly title: string; readonly subtitle: string }> = {
  landing: { title: "Pendamping Hukum untuk Usaha Anda", subtitle: "Punya masalah hukum dalam menjalankan usaha? Kami bantu menemukan langkah yang tepat dan menghubungkan Anda dengan proses serta tenaga profesional yang sesuai." },
  discovery: { title: "Apa yang sedang Anda butuhkan?", subtitle: "Pilih kategori masalah hukum yang paling dekat dengan kebutuhan Anda saat ini." },
  conversation: { title: "Mari kita bicarakan kebutuhan Anda", subtitle: "Ceritakan detailnya. Saya bantu petakan langkah demi langkah." },
  escalation: { title: "Membutuhkan bantuan profesional?", subtitle: "Jika proses ini perlu pendampingan manusia, kita bisa hubungkan dengan tenaga terverifikasi." },
  status: { title: "Permintaan Anda", subtitle: "Pantau progress pekerjaan hukum secara transparan." },
  outcome: { title: "Hasil pekerjaan", subtitle: "Dokumen, status, catatan, bukti, dan langkah berikutnya." },
} as const;

export default function CommsMeFirstLightPage() {
  const [stage, setStage] = useState<Stage>("landing");
  const [selectedNeed, setSelectedNeed] = useState<NeedKey | null>(null);
  const [messages, setMessages] = useState<readonly ConversationMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [statusSteps, setStatusSteps] = useState<ReadonlyArray<{ readonly label: string; readonly done: boolean; readonly current: boolean }>>([]);
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  const [workPollState, setWorkPollState] = useState<WorkPollResponse | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // P1: Conversation → Work binding state - pekerjaan nyata dari percakapan
  const [workItemId, setWorkItemId] = useState<string | null>(null);
  const [workItemStatus, setWorkItemStatus] = useState<string>("init");
  // P2: Handoff Context Retention - 100% konteks tetap utuh untuk AI→Human
  const [handoffContext, setHandoffContext] = useState<Record<string, any>>({
    what: null,              // Apa masalahnya?
    whatWeKnow: [],          // Apa yang sudah diketahui?
    documentsAvailable: [],  // Dokumen apa yang tersedia?
    whatMissing: [],         // Apa yang belum lengkap?
    whatDone: [],            // Apa yang sudah dilakukan?
    aiLimits: [],            // Apa yang tidak boleh dilakukan AI?
    humanDecisionsNeeded: [] // Apa keputusan yang membutuhkan manusia?
  });

  // P0 PT-ESTABLISHMENT: Bind dengan Work Seed kanonik (bukan hardcoded chat)
  const [activeWorkSeed, setActiveWorkSeed] = useState<typeof PT_ESTABLISHMENT_WORKSEED | null>(null);
  const [requiredInputsProgress, setRequiredInputsProgress] = useState<Record<string, any>>({});
  const [currentInputIndex, setCurrentInputIndex] = useState<number>(0);
  // Minimum Common Lobby: State untuk daftar pekerjaan aktif user
  const [activeWorks, setActiveWorks] = useState<readonly WorkPollResponse[]>([]);
  const [isLoadingActiveWorks, setIsLoadingActiveWorks] = useState<boolean>(false);

  // Add keyframe animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, stage]);

  useEffect(() => {
    if (activeWorkId === null) return;
    const STEP_LABELS = [
      "Kebutuhan dipahami (Work Item dibuat)",
      "Kebutuhan disetujui & delivery dimulai",
      "Dokumen & legal capability diproses",
      "Menunggu profesional / handoff",
      "Hasil tersedia & tervalidasi",
    ] as const;
    let cancelled = false;
    async function pollOnce() {
      try {
        const r = await fetch(`/products/commsme/work?workId=${encodeURIComponent(activeWorkId)}`);
        const j = (await r.json()) as WorkPollResponse;
        if (cancelled) return;
        setWorkPollState(j);
        if (j.ok && j.status) {
          const order: readonly WorkPollResponse["status"][] = ["draft", "approved", "in_delivery", "implemented", "verified"];
          const currentIdx = order.indexOf(j.status);
          setStatusSteps(STEP_LABELS.map((label, idx) => {
            const done = idx < currentIdx || (idx === currentIdx && j.status === "verified");
            const current = idx === currentIdx && j.status !== "verified";
            return { label, done, current };
          }));
          if (j.status === "verified") {
            if (pollIntervalRef.current !== null) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
          }
        }
      } catch {
        if (!cancelled) setWorkPollState({ ok: false, error: "poll gagal — cek koneksi" });
      }
    }
    void pollOnce();
    pollIntervalRef.current = setInterval(pollOnce, 800);
    return () => {
      cancelled = true;
      if (pollIntervalRef.current !== null) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    };
  }, [activeWorkId]);

  const brandColor = useMemo(() => "#b45309", []);
  const brandColorAccent = useMemo(() => "#f59e0b", []);

  const needDefinition = useMemo(() => NEEDS.find((n) => n.key === selectedNeed) ?? null, [selectedNeed]);

  function pushAIMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role: "ai", text, createdAt: Date.now() },
    ]);
  }
  function pushUserMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role: "user", text, createdAt: Date.now() },
    ]);
  }

  // ============================================
  // MINIMUM COMMON LOBBY - 4 Core Actions Implementation
  // ============================================
  async function loadActiveWorks() {
    setIsLoadingActiveWorks(true);
    try {
      const res = await fetch("/products/commsme/work/list", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setActiveWorks(data.works || []);
      }
    } catch (_) {
      setActiveWorks([]);
    } finally {
      setIsLoadingActiveWorks(false);
    }
  }

  function goDiscoveryFromLanding() {
    // Start a need - Action 1: Mulai pekerjaan baru
    setStage("discovery");
    setExecution(null);
  }

  function continueActiveWork(work: WorkPollResponse) {
    // Continue active work - Action 2: Lanjutkan pekerjaan yang sudah berjalan
    setActiveWorkId(work.id);
    setStage("status");
    setHandoffContext(prev => ({
      ...prev,
      what: work.title,
      whatDone: [`Melanjutkan pekerjaan aktif: ${work.title}`]
    }));
  }

  function seeCurrentWork() {
    // See current work - Action 3: Lihat semua pekerjaan aktif
    loadActiveWorks();
    setStage("status");
  }

  function resumeNextAction() {
    // Resume next action - Action 4: Lanjutkan langkah berikutnya dari pekerjaan terakhir
    if (activeWorks.length > 0) {
      const lastWork = activeWorks[0]; // Urutkan berdasarkan updatedAt terbaru
      continueActiveWork(lastWork);
    }
  }

  function chooseNeed(needKey: NeedKey) {
    setSelectedNeed(needKey);
    // P0-PT-ESTABLISHMENT: Aktifkan Work Seed kanonik jika user pilih legalitas
    if (needKey === "legalitas") {
      setActiveWorkSeed(PT_ESTABLISHMENT_WORKSEED);
      setCurrentInputIndex(0);
      setRequiredInputsProgress({});
      setHandoffContext(prev => ({ ...prev, what: PT_ESTABLISHMENT_WORKSEED.need.summary }));
    } else {
      setActiveWorkSeed(null);
    }
    // Jika dari halaman utama (landing), pindah ke step2 (discovery) dengan kategori sudah terpilih
    if (stage === "landing") {
      setStage("discovery");
    } else {
      // Jika dari halaman discovery, lanjut ke conversation
      setStage("conversation");
      const need = NEEDS.find((n) => n.key === needKey)!;
      setMessages([]);
      setTimeout(() => {
        pushAIMessage(`Halo! Saya CommsMe pendamping UMKM. 🙋 Anda memilih **${need.title}**. ${need.intro}\n\nSilakan jawab beberapa pertanyaan agar saya bisa petakan langkahnya. Anda mulai dengan kalimat ini atau tulis detail sendiri di kolom bawah ya.`);
      }, 50);
    }
  }

  function fillFirstPrompt() {
    if (needDefinition === null) return;
    pushUserMessage(needDefinition.firstUserPrompt);
    setTimeout(() => aiReplyInitial(needDefinition.key), 400);
  }

  function aiReplyInitial(key: NeedKey) {
    switch (key) {
      case "contract":
        return pushAIMessage("Baik, NDA untuk mitra waralaba kopi Nusantara. Mari kita petakan:\n\n**1. Identitas:** Nama toko Anda, kota, dan pihak mitra?\n**2. Materi rahasia:** Resep kopi, harga pokok, data pelanggan?\n**3. Durasi NDA:** Berapa tahun (umumnya 3-5 tahun)?\n\nSaya bisa siapkan draf NDA, lalu jika Anda setuju, kita tanda tangani dan masukkan ke tahap close case dengan advokat pendamping UMKM. 💼");
      case "legalitas": {
        // P0 PT-ESTABLISHMENT: Load pertanyaan dari Work Seed requiredInputs, BUKAN hardcoded
        const seed = PT_ESTABLISHMENT_WORKSEED;
        const inputs = seed.requiredInputs;
        const outcomeList = seed.outcome.successCriteria.slice(0, 4).map((c: string, i: number) => `**${i + 1}.** ${c}`).join("\n");
        const firstInput = inputs[0];
        const introMsg = `Untuk **${seed.need.title}** sesuai prosedur resmi (Work Seed ID: ${seed.workSeedId}):\n\n✅ **Hasil akhir yang akan Anda dapatkan:**\n${outcomeList}\n\nSekarang mari kita jawab pertanyaan 1 dari ${inputs.length} secara berurutan. Semua jawaban akan tersimpan — Anda TIDAK PERLU mengulang cerita nanti.\n\n---\n**Pertanyaan 1:** ${firstInput.label}\n${"example" in firstInput ? `Contoh: *${firstInput.example}*` : ""}`;
        return pushAIMessage(introMsg);
      }
      case "customer":
        return pushAIMessage("Kasus retur 2 minggu lalu. Ada 3 pemeriksaan awal:\n\n① Apakah ada garansi toko tertulis?\n② Apakah kerusakan *cacat produk* atau *human error salah pakai*?\n③ Bukti foto / video kerusakan?\n\nSilakan berikan detailnya. Saya bantu analisa sesuai UU Perlindungan Konsumen Pasal 4 & 7 (hak konsumen mendapatkan barang sesuai perjanjian).");
      case "employee":
        return pushAIMessage("Baik SOP karyawan harian toko kelontong Solo. Saya akan bantu:\n\n✅ Template kontrak kerja harian sesuai UU 13/2003\n✅ Upah harian minimum kota Solo + lembur\n✅ Cuti bersama (ketentuan 1 hari cuti = 1 hari kerja)\n✅ Batas PHK tanpa pesangon (bagi karyawan harian)\n✅ Perlindungan BPJS Ketenagakerjaan untuk UMKM\n\nPertanyaan: toko Anda mempekerjakan berapa orang? Dan upah harian rata-ratanya?");
      case "consultation":
        return pushAIMessage("Membuka cabang waralaba bakso ⚠️ sebelum tanda tangan MoU, Anda WAJIB memastikan 4 poin legal:\n\n① Apakah waralaba terdaftar di Kemenkumham sebagai sistem waralaba sesuai PP No.42 Th.2007?\n② Besar franchise fee + royalty fee + durasi kontrak (minimal 5 tahun untuk waralaba)?\n③ Lokasi eksklusif (non-compete radius berapa KM?) dan kewajiban supply bahan baku?\n④ Materi training & SOP yang akan diberikan franchisor kepada franchisee?\n\nSilakan berikan lebih detail. Saya bantu analisis MoU sebelum Anda tanda tangani.");
      case "document":
        return pushAIMessage("Peraturan internal toko. Struktur template yang saya siapkan:\n\n1. Jam Kerja & Absensi\n2. Upah & Lembur\n3. Cuti Bersama & Izin\n4. Sanksi Keterlambatan / Pelanggaran\n5. Tanggung Jawab Pekerjaan\n6. PHK & Masa Percobaan\n\nAnda punya preferensi khusus? Misalnya sanksi denda keterlambatan berapa persen? Atau jam kerja buka jam berapa?");
      default:
        return pushAIMessage("Silakan ceritakan lebih detail. Saya bantu petakan langkahnya.");
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (text.length === 0) return;
    pushUserMessage(text);
    setInputText("");

    // Dekode session dari cookie (core kernel function)
    const cookie = document.cookie;
    const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("eos-workspace-session="));
    let session = null;
    if (sessionCookie) {
      try {
        session = decodeWorkspaceSession(sessionCookie.split("=")[1]);
      } catch(e) {
        session = createAnonymousWorkspaceSession();
      }
    } else {
      session = createAnonymousWorkspaceSession();
    }

    // ============================================
    // P1 + WORKSEED BIND: Conversation → Inputs → Work
    // Work Seed active → kumpulkan requiredInputs berurutan DULU, baru buat Work Item
    // ============================================
    if (activeWorkSeed !== null && selectedNeed === "legalitas") {
      const inputs = activeWorkSeed.requiredInputs;
      const currentInput = inputs[currentInputIndex];

      if (currentInput !== undefined) {
        // Update progress dengan jawaban user untuk required input saat ini
        setRequiredInputsProgress(prev => ({
          ...prev,
          [currentInput.id]: {
            value: text,
            answeredAt: new Date().toISOString()
          }
        }));

        // Update handoffContext
        setHandoffContext(prev => ({
          ...prev,
          what: activeWorkSeed.need.title,
          whatWeKnow: [...prev.whatWeKnow, { [currentInput.label]: text }],
          whatMissing: inputs
            .filter((inp, idx) => idx > currentInputIndex && !(inp.id in requiredInputsProgress))
            .map((inp) => inp.label)
        }));

        // Rekam evidence tiap input
        try {
          await fetch("/api/capabilities/evidence-registry/evidence.record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              entityRef: workItemId ?? `seed-collection-${activeWorkSeed.workSeedId}`,
              entityType: workItemId ? "consultation" : "work_seed_collection",
              action: `required_input_collected::${currentInput.id}`,
              actorId: session?.actorId,
              details: {
                inputId: currentInput.id,
                inputLabel: currentInput.label,
                valueLength: text.length,
                sequence: currentInputIndex + 1,
                ofTotal: inputs.length,
                workSeedId: activeWorkSeed.workSeedId
              },
              timestamp: new Date().toISOString(),
              sessionId: session?.sessionId,
              tenantId: session?.tenantId,
              workspaceId: session?.workspaceId
            })
          });
        } catch (_) { /* evidence record non-blocking */ }

        const isLastInput = currentInputIndex >= inputs.length - 1;

        if (!isLastInput) {
          // Tanya required input BERIKUTNYA dari Work Seed (bukan hardcoded!)
          const nextIndex = currentInputIndex + 1;
          const nextInput = inputs[nextIndex];
          setCurrentInputIndex(nextIndex);
          pushAIMessage(`✅ Jawaban **Pertanyaan ${currentInputIndex + 1}/${inputs.length}** tersimpan di konteks pekerjaan.\n\n---\n**Pertanyaan ${nextIndex + 1}/${inputs.length}:** ${nextInput.label}\n${"example" in nextInput ? `Contoh: *${nextInput.example}*` : ""}\n${"constraint" in nextInput ? `\n⚠️ Catatan: ${nextInput.constraint}` : ""}`);
          return;
        }

        // ====== SEMUA requiredInputs terkumpul (proc.1.context_collection DONE) ======
        // SEKARANG baru buat Work Item consultation.create (jantung Work binding)
        if (!workItemId) {
          try {
            const createResp = await fetch("/api/capabilities/consultation/consultation.create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                title: `${activeWorkSeed.need.title} · Work Seed ${activeWorkSeed.workSeedId}`,
                description: JSON.stringify({
                  userNeed: activeWorkSeed.need,
                  collectedInputs: requiredInputsProgress,
                  procedure: activeWorkSeed.procedure.map(p => ({ step: p.step, title: p.title, actor: p.actor }))
                }, null, 2),
                userNeed: "pt_establishment_legal_umkm",
                priority: "medium",
                businessType: "umkm",
                sessionId: session?.sessionId,
                tenantId: session?.tenantId,
                workspaceId: session?.workspaceId,
                actorId: session?.actorId,
                workSeedId: activeWorkSeed.workSeedId,
                workSeedVersion: activeWorkSeed.version,
                procedureCurrentStep: 2,
                procedureStepsTotal: activeWorkSeed.procedure.length
              })
            });

            if (createResp.ok) {
              const { output } = await createResp.json();
              setWorkItemId(output.id);
              setWorkItemStatus("context_complete");
              setHandoffContext(prev => ({
                ...prev,
                whatDone: [...prev.whatDone, "proc.1.context_collection: Semua requiredInputs terkumpul & tervalidasi"],
                aiLimits: activeWorkSeed.humanBoundary.nonDelegableToAI.map((r: string) => r),
                humanDecisionsNeeded: (activeWorkSeed.procedure[2].handoffContext as any).humanDecisionsNeeded
              }));

              // Evidence: work_item_created_from_work_seed
              await fetch("/api/capabilities/evidence-registry/evidence.record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  entityRef: output.id,
                  entityType: "consultation",
                  action: "work_item_created_from_work_seed_context_complete",
                  actorId: session?.actorId,
                  details: {
                    workSeedId: activeWorkSeed.workSeedId,
                    requiredInputsCollected: inputs.length,
                    procedureStepsTotal: activeWorkSeed.procedure.length,
                    nextProcedureStep: "proc.2.ai_document_draft",
                    handoffContextInitiated: true
                  },
                  timestamp: new Date().toISOString(),
                  sessionId: session?.sessionId,
                  tenantId: session?.tenantId,
                  workspaceId: session?.workspaceId
                })
              });

              pushAIMessage(`✅ **Semua ${inputs.length} pertanyaan jawabannya terkumpul!**\n\n📋 **Status Prosedur Resmi:**\n${activeWorkSeed.procedure.slice(0, 2).map((p: any) => `  Step ${p.step}. *${p.title}* — ✅ SELESAI`).join("\n")}  Step 3. *${activeWorkSeed.procedure[2].title}* — 🔁 SEDANG BERJALAN\n\n🆔 Work Item Anda: **#${output.id.slice(0,8)}**\n🚀 Selanjutnya: Draf Akta Pendirian sedang disiapkan AI. Setelah itu Notaris pendamping UMKM akan menandatangani Akta dan mengurus legalitas ke Kemenkumham/OSS.\n\nAnda TIDAK PERLU mengulang cerita jika nanti berbicara dengan Notaris — semua jawaban Anda telah tersimpan 100% di dalam Work Item ini. 💼`);
              return;
            }
          } catch (err) {
            console.error("[COMMSME] Gagal buat work item dari work seed:", err);
          }
        }
      }
    }
    // Jika work seed active tapi work item sudah dibuat → lanjutkan default update context
    else if (workItemId) {
      // Update handoffContext dengan pesan baru
      setHandoffContext(prev => ({
        ...prev,
        whatWeKnow: [...prev.whatWeKnow, text]
      }));
      
      // Rekam evidence tiap interaksi
      await fetch("/api/capabilities/evidence-registry/evidence.record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entityRef: workItemId,
          entityType: "consultation",
          action: "context_updated_in_conversation",
          actorId: session?.actorId,
          details: { newMessage: text, handoffContextSnapshot: handoffContext },
          timestamp: new Date().toISOString(),
          sessionId: session?.sessionId,
          tenantId: session?.tenantId,
          workspaceId: session?.workspaceId
        })
      });

      setTimeout(() => {
        pushAIMessage(`Baik, saya catat informasinya. Semua data sudah tersimpan di pekerjaan #${workItemId.slice(0,8)}. Kita lanjutkan mengumpulkan apa yang masih dibutuhkan ya.`);
      }, 400);
      return;
    }

    // Fallback untuk need lainnya (bukan P0)
    setTimeout(() => {
      pushAIMessage("Baik, saya catat. Saya akan terus memandu Anda sampai kebutuhan ini jelas.");
    }, 400);
  }

  async function executeCanonicalWorkflow() {
    if (selectedNeed === null) return;
    setIsExecuting(true);
    setStage("status");
    setWorkPollState(null);
    setActiveWorkId(null);
    setStatusSteps([
      { label: "Menyiapkan Work Item...", done: false, current: true },
      { label: "Approval & delivery start", done: false, current: false },
      { label: "Memproses dokumen & legal capability", done: false, current: false },
      { label: "Handoff ke profesional (jika diperlukan)", done: false, current: false },
      { label: "Verifikasi & hasil tersedia", done: false, current: false },
    ]);
    try {
      const cap: ExecutionResult["type"] =
        selectedNeed === "contract" ? "nda_case"
        : selectedNeed === "legalitas" ? "pt_establishment"
        : selectedNeed === "employee" ? "sop_article"
        : selectedNeed === "document" ? "sop_article"
        : "nib_request";
      const res = await fetch("/products/commsme/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needKey: selectedNeed, messages, capability: cap }),
      });
      const json = (await res.json()) as { readonly ok: boolean; readonly execution: ExecutionResult; readonly error?: string };
      if (json.ok) {
        setExecution(json.execution);
        if (json.execution.workId !== undefined && json.execution.workId !== null) {
          setActiveWorkId(json.execution.workId);
          let waited = 0;
          const maxWaitMs = 15_000;
          const waitForVerified = setInterval(() => {
            waited += 300;
            setWorkPollState((cur) => {
              if (cur?.ok === true && cur.status === "verified") {
                clearInterval(waitForVerified);
                setTimeout(() => { setStage("outcome"); }, 300);
              }
              return cur;
            });
            if (waited >= maxWaitMs) {
              clearInterval(waitForVerified);
              setStage("outcome");
            }
          }, 300);
        } else {
          setTimeout(() => setStage("outcome"), 800);
        }
      } else {
        pushAIMessage("Ada kendala kecil saat menjalankan. Silakan coba lagi atau hubungkan dengan profesional. Error: " + (json.error ?? "unknown"));
        setStage("conversation");
      }
    } catch (err) {
      pushAIMessage("Tidak bisa terhubung ke runtime. Anda bisa klik Hubungkan Profesional di bawah ini untuk pendampingan manusia.");
      setStage("escalation");
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <main style={{ background: "linear-gradient(180deg,#fffbeb 0%,#fff7ed 45%,#ffffff 100%)", minHeight: "100vh" }}>
      <header style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #fed7aa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: brandColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            ☕
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#431407", letterSpacing: -0.3 }}>COMMSME</div>
            <div style={{ fontSize: 13, color: brandColorAccent, fontWeight: 600 }}>Pendamping Hukum UMKM</div>
          </div>
        </div>
        {/* Stepper Navigasi Responsif: Mobile (collapsible) + Desktop (full) */}
        {/* Definisi label & index untuk stepper */}
        {(() => {
          const labelMap: Record<Stage, string> = { landing: "Beranda", discovery: "Kebutuhan", conversation: "Bicara", escalation: "Profesional", status: "Status", outcome: "Hasil" };
          const currentIdx = ["landing", "discovery", "conversation", "escalation", "status", "outcome"].indexOf(stage);
          return (
            <nav style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
              {/* Mobile View: Collapsible Progress Bar */}
              <div style={{ display: "none", "@media (max-width: 768px)": { display: "flex", alignItems: "center", gap: 12, width: "100%" } }}>
                <div style={{ flex: 1, height: 6, background: "#fed7aa", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    background: brandColor, 
                    width: `${((currentIdx + 1) / 6) * 100}%`, 
                    transition: "width 0.3s ease" 
                  }} />
                </div>
                <span style={{ color: "#78350f", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Langkah {currentIdx + 1} dari 6: {labelMap[stage]}
                </span>
              </div>
              {/* Desktop View: Full Stepper */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", "@media (max-width: 768px)": { display: "none" } }}>
                {(["landing", "discovery", "conversation", "escalation", "status", "outcome"] as readonly Stage[]).map((s, idx) => {
                  const isAccessible = idx <= currentIdx;
                  const isCurrent = stage === s;
              return (
                <React.Fragment key={s}>
                  <button
                    onClick={() => isAccessible ? setStage(s) : null}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: isCurrent ? `2px solid ${brandColor}` : isAccessible ? `1px solid #fed7aa` : "1px dashed #fde68a",
                      background: isCurrent ? brandColor : "transparent",
                      color: isCurrent ? "#fff" : brandColor,
                      cursor: isAccessible ? "pointer" : "not-allowed",
                      fontWeight: isCurrent ? 700 : 500,
                      opacity: isAccessible ? 1 : 0.5,
                      transition: "all 0.2s ease",
                      transform: isCurrent ? "scale(1.05)" : "scale(1)",
                    }}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {idx + 1}. {labelMap[s]} {isCurrent ? "←" : ""}
                  </button>
                  {idx < 5 && <div style={{ width: 20, height: 2, background: idx < currentIdx ? brandColor : "#fde68a", borderRadius: 1 }} />}
                </React.Fragment>
              );
            })}
          </div>
             </nav>
           );
         })()}
        </header>

      <section style={{ padding: "56px 32px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.2, color: "#431407", margin: 0, lineHeight: 1.05 }}>{UMBA_STAGE_COPY[stage].title}</h1>
          <p style={{ fontSize: 18, color: "#78350f", marginTop: 12, maxWidth: 720, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>{UMBA_STAGE_COPY[stage].subtitle}</p>
        </div>

        {stage === "landing" && (
          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ background: "#fff", padding: 36, borderRadius: 20, boxShadow: "0 8px 30px rgba(120,53,15,0.08)", textAlign: "center", border: "1px solid #fed7aa" }}>
              <p style={{ fontSize: 20, color: "#44403c", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
                Punya masalah hukum dalam menjalankan usaha?
                <br />
                Kami membantu Anda menemukan langkah yang tepat dan menghubungkan Anda dengan proses serta tenaga profesional yang sesuai.
              </p>
              
              {/* MINIMUM COMMON LOBBY - 4 Core Actions sesuai user mandate */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto 24px" }}>
                <button 
                  onClick={goDiscoveryFromLanding} 
                  style={{ background: brandColor, color: "#fff", padding: "20px 24px", borderRadius: 14, fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(180,83,9,0.18)", transition: "all 0.2s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(180,83,9,0.22)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(180,83,9,0.18)"; }}
                >
                  🚀 Start a need
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, opacity: 0.9 }}>Mulai pekerjaan baru</div>
                </button>
                <button 
                  onClick={seeCurrentWork} 
                  style={{ background: "#fff", color: brandColor, padding: "20px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700, border: "2px solid " + brandColorAccent, cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  📋 See current work
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, opacity: 0.9 }}>Lihat semua pekerjaan aktif</div>
                </button>
                <button 
                  onClick={resumeNextAction} 
                  style={{ background: "#fff", color: brandColor, padding: "20px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700, border: "2px solid " + brandColorAccent, cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  ⏩ Resume next action
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, opacity: 0.9 }}>Lanjutkan pekerjaan terakhir</div>
                </button>
              </div>

              {/* Daftar pekerjaan aktif jika ada */}
              {isLoadingActiveWorks ? (
                <div style={{ padding: 16, color: "#78350f" }}>Memuat daftar pekerjaan aktif...</div>
              ) : activeWorks.length > 0 ? (
                <div style={{ marginTop: 24, padding: 24, background: "#fffbeb", borderRadius: 14, border: "1px solid #fed7aa" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: "#431407" }}>Pekerjaan Aktif Anda ({activeWorks.length})</h3>
                  <div style={{ display: "grid", gap: 12 }}>
                    {activeWorks.map((work) => (
                      <button 
                        key={work.id} 
                        onClick={() => continueActiveWork(work)}
                        style={{ textAlign: "left", padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #fcd34d", cursor: "pointer", transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(4px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; }}
                      >
                        <div style={{ fontWeight: 700, color: "#431407" }}>{work.title}</div>
                        <div style={{ fontSize: 13, color: "#78350f", marginTop: 4 }}>Status: {work.status} · Terakhir diperbarui: {new Date(work.updatedAt || "").toLocaleDateString("id-ID")}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {NEEDS.map((n) => (
                <button
                  key={n.key}
                  onClick={() => chooseNeed(n.key)}
                  style={{ textAlign: "left", background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #fed7aa", cursor: "pointer", boxShadow: "0 4px 10px rgba(180,83,9,0.04)", transition: "all 0.2s ease", transform: "scale(1)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140 }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(180,83,9,0.12)"; e.currentTarget.style.border = `2px solid ${brandColor}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(180,83,9,0.04)"; e.currentTarget.style.border = "1px solid #fed7aa"; }}
                >
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{n.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#431407", marginBottom: 4 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.45 }}>{n.intro}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 20, color: brandColor }}>→</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "discovery" && (
          <div>
            <div style={{ marginBottom: 24, textAlign: "center" }}>
              <h2 style={{ color: "#431407", fontSize: 24, margin: "0 0 8px" }}>Pilih Kebutuhan Hukum Anda</h2>
              <p style={{ color: "#78350f", margin: 0 }}>Klik salah satu kartu di bawah, lalu tekan tombol Lanjutkan untuk memulai konsultasi.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginBottom: 24 }}>
              {NEEDS.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setSelectedNeed(n.key)}
                  style={{ textAlign: "left", background: "#fff", padding: 24, borderRadius: 18, border: "2px solid " + (selectedNeed === n.key ? brandColor : "#fed7aa"), cursor: "pointer", boxShadow: selectedNeed === n.key ? "0 8px 22px rgba(180,83,9,0.15)" : "0 2px 6px rgba(180,83,9,0.05)", transition: "all 0.2s ease", transform: selectedNeed === n.key ? "scale(1.02)" : "scale(1)" }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{n.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#431407" }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "#78350f", marginTop: 6, lineHeight: 1.5 }}>{n.intro}</div>
                  {selectedNeed === n.key && <div style={{ marginTop: 12, textAlign: "right", fontSize: 18, color: brandColor, fontWeight: 700 }}>✓ Dipilih</div>}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button onClick={() => setStage("landing")} style={{ padding: "14px 22px", borderRadius: 12, background: "#fff", color: brandColor, border: "2px solid " + brandColorAccent, fontWeight: 700, cursor: "pointer" }}>
                ← Kembali
              </button>
              <button 
                onClick={() => selectedNeed && chooseNeed(selectedNeed)} 
                disabled={!selectedNeed}
                style={{ padding: "14px 28px", borderRadius: 12, background: brandColor, color: "#fff", border: "none", fontWeight: 800, cursor: selectedNeed ? "pointer" : "not-allowed", opacity: selectedNeed ? 1 : 0.5, boxShadow: "0 4px 12px rgba(180,83,9,0.15)", transition: "all 0.2s ease", transform: selectedNeed ? "scale(1)" : "scale(0.98)" }}
              >
                Lanjutkan ke Konsultasi →
              </button>
            </div>
          </div>
        )}

        {stage === "conversation" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #fed7aa", display: "flex", flexDirection: "column", minHeight: 480 }}>
              <div ref={scrollRef} style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", color: "#78350f", padding: 20, fontSize: 14 }}>
                    Pilih tombol <b>Isi contoh percakapan</b> di panel kanan untuk memulai, atau tulis pesan Anda di bawah.
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 14, background: m.role === "user" ? brandColor : "#fff7ed", color: m.role === "user" ? "#fff" : "#431407", border: m.role === "user" ? "none" : "1px solid #fed7aa", whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 14 }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 14, borderTop: "1px solid #fed7aa", display: "flex", gap: 10 }}>
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Tulis pesan Anda tentang kebutuhan hukum UMKM..."
                  style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #fed7aa", fontSize: 14, outline: "none", background: "#fffbeb" }}
                />
                <button 
                  onClick={handleSend} 
                  disabled={inputText.trim().length === 0}
                  style={{ 
                    background: brandColor, 
                    color: "#fff", 
                    padding: "12px 20px", 
                    borderRadius: 12, 
                    fontWeight: 700, 
                    border: "none", 
                    cursor: inputText.trim().length === 0 ? "not-allowed" : "pointer",
                    opacity: inputText.trim().length === 0 ? 0.5 : 1,
                    transition: "all 0.15s ease",
                    transform: inputText.trim().length > 0 ? "scale(1)" : "scale(0.98)",
                  }}>
                  📤 Kirim
                </button>
                <button onClick={() => setStage("escalation")} style={{ background: "#fff", color: brandColor, padding: "12px 16px", borderRadius: 12, fontWeight: 700, border: "2px solid " + brandColorAccent, cursor: "pointer" }}>
                  🧑‍💼 Hubungkan Profesional
                </button>
              </div>
            </div>

            <aside style={{ display: "grid", gridTemplateRows: activeWorkSeed ? "auto auto auto 1fr auto" : "auto auto 1fr", gap: 12 }}>
              <div style={{ background: "#fff", padding: 18, borderRadius: 16, border: "1px solid #fed7aa" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: brandColor, marginBottom: 6 }}>KATEGORI SAAT INI</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#431407" }}>{needDefinition ? `${needDefinition.icon} ${needDefinition.title}` : "Belum dipilih"}</div>
                {activeWorkSeed !== null && (
                  <div style={{ marginTop: 8, fontSize: 11, color: brandColor, fontWeight: 600 }}>
                    📦 Work Seed: {activeWorkSeed.workSeedId} v{activeWorkSeed.version}
                  </div>
                )}
              </div>

              {activeWorkSeed !== null && (
                <div style={{ background: "#fff", padding: 18, borderRadius: 16, border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: brandColor, marginBottom: 10 }}>
                    📝 Pengumpulan Data ({currentInputIndex >= activeWorkSeed.requiredInputs.length ? activeWorkSeed.requiredInputs.length : currentInputIndex}/{activeWorkSeed.requiredInputs.length})
                  </div>
                  <div style={{ height: 8, background: "#fed7aa", borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{
                      height: "100%",
                      background: brandColor,
                      width: `${Math.min(100, ((currentInputIndex >= activeWorkSeed.requiredInputs.length ? activeWorkSeed.requiredInputs.length : currentInputIndex) / activeWorkSeed.requiredInputs.length) * 100)}%`,
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                  <ol style={{ paddingLeft: 20, fontSize: 12, color: "#78350f", lineHeight: 1.7, margin: 0 }}>
                    {activeWorkSeed.requiredInputs.map((inp: any, idx: number) => (
                      <li key={inp.id} style={{ color: idx < currentInputIndex || (currentInputIndex >= activeWorkSeed.requiredInputs.length) ? "#166534" : (idx === currentInputIndex ? "#431407" : "#a16207"), fontWeight: idx === currentInputIndex ? 800 : 500 }}>
                        {idx < currentInputIndex || (currentInputIndex >= activeWorkSeed.requiredInputs.length) ? "✅ " : idx === currentInputIndex ? "👉 " : "○ "}
                        {inp.label}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <button onClick={fillFirstPrompt} disabled={needDefinition === null} style={{ padding: 14, borderRadius: 14, background: brandColorAccent, color: "#431407", border: "none", fontWeight: 700, cursor: needDefinition ? "pointer" : "not-allowed", opacity: needDefinition ? 1 : 0.5 }}>
                ✨ Isi contoh percakapan
              </button>

              {activeWorkSeed !== null && (
                <div style={{ background: "#fff", padding: 18, borderRadius: 16, border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: brandColor, marginBottom: 10 }}>📋 Prosedur Resmi ({activeWorkSeed.procedure.length} langkah)</div>
                  <ol style={{ paddingLeft: 20, fontSize: 12, color: "#78350f", lineHeight: 1.8, margin: 0 }}>
                    {activeWorkSeed.procedure.map((p: any) => (
                      <li key={p.id} style={{ marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, color: "#431407" }}>Step {p.step}. {p.title}</div>
                        <div style={{ fontSize: 11, color: brandColor, fontWeight: 600, marginLeft: 4 }}>
                          Pelaksana: {p.actor === "ai" ? "🤖 AI" : p.actor === "human_professional" ? "🧑‍💼 Profesional" : p.actor.includes("external") ? "🏛️ Sistem Eksternal" : p.actor}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div style={{ marginTop: 10, padding: 8, background: "#fffbeb", borderRadius: 8, fontSize: 11, color: brandColor, border: "1px dashed " + brandColorAccent }}>
                    🔁 <b>Handoff Guarantee:</b> {activeWorkSeed.humanBoundary.contextRetentionGuarantee.guarantee}
                  </div>
                </div>
              )}

              {activeWorkSeed === null && (
                <div style={{ background: "#fff", padding: 18, borderRadius: 16, border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: brandColor, marginBottom: 10 }}>Rekomendasi langkah</div>
                  <ol style={{ paddingLeft: 20, fontSize: 13, color: "#78350f", lineHeight: 1.7, margin: 0 }}>
                    <li>Jawab beberapa pertanyaan</li>
                    <li>COMMSME bantu petakan alur</li>
                    <li>Jalankan proses (dokumen + capabilities)</li>
                    <li>Jika perlu → Hubungkan profesional</li>
                    <li>Pantau status → Lihat hasil</li>
                  </ol>
                </div>
              )}

              <button onClick={executeCanonicalWorkflow} disabled={isExecuting || messages.length === 0} style={{ padding: 14, borderRadius: 12, background: isExecuting ? "#fed7aa" : brandColor, color: "#fff", border: "none", fontWeight: 800, cursor: isExecuting || messages.length === 0 ? "not-allowed" : "pointer", transition: "all 0.2s ease", opacity: isExecuting || messages.length === 0 ? 0.7 : 1 }}>
                {isExecuting ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ animation: "spin 1s linear infinite" }}>⏳</span> Menjalankan proses...
                  </span>
                ) : "▶ Jalankan pekerjaan hukum"}
              </button>
            </aside>
          </div>
        )}

        {stage === "escalation" && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #fed7aa", padding: 36, maxWidth: 720, margin: "0 auto", boxShadow: "0 10px 30px rgba(180,83,9,0.08)" }}>
            <div style={{ textAlign: "center", fontSize: 48 }}>🧑‍💼</div>
            <h2 style={{ textAlign: "center", color: "#431407", fontSize: 26 }}>Membutuhkan bantuan profesional?</h2>
            <p style={{ textAlign: "center", color: "#78350f", maxWidth: 520, margin: "8px auto 24px", lineHeight: 1.6 }}>
              Kami akan menghubungkan Anda dengan advokat / konsultan UMKM terverifikasi sesuai kebutuhan spesifik {needDefinition ? `${needDefinition.icon} **${needDefinition.title}**` : "hukum usaha"} Anda.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 520, margin: "0 auto 20px" }}>
              <div style={{ padding: 16, borderRadius: 12, border: "1px solid #fed7aa", background: "#fffbeb" }}>
                <div style={{ fontSize: 12, color: brandColor, fontWeight: 800 }}>KECEPATAN</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#431407", marginTop: 4 }}>≤ 1 hari kerja</div>
              </div>
              <div style={{ padding: 16, borderRadius: 12, border: "1px solid #fed7aa", background: "#fffbeb" }}>
                <div style={{ fontSize: 12, color: brandColor, fontWeight: 800 }}>BIAYA AWAL</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#431407", marginTop: 4 }}>Rp 0 — GRATIS konsultasi 15 menit</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={executeCanonicalWorkflow} style={{ background: brandColor, color: "#fff", padding: "14px 22px", borderRadius: 12, fontWeight: 800, border: "none", cursor: "pointer" }}>
                ✅ Ya, hubungkan saya sekarang
              </button>
              <button onClick={() => setStage("conversation")} style={{ background: "#fff", color: brandColor, padding: "14px 22px", borderRadius: 12, fontWeight: 700, border: "2px solid " + brandColorAccent, cursor: "pointer" }}>
                ↩ Kembali ke obrolan
              </button>
            </div>
          </div>
        )}

        {stage === "status" && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #fed7aa", padding: 36, maxWidth: 820, margin: "0 auto" }}>
            <h2 style={{ color: "#431407", margin: 0, marginBottom: 8 }}>Permintaan Anda</h2>
            <p style={{ color: "#78350f", fontSize: 14, margin: "0 0 20px" }}>
              Pantau status secara <b>realtime</b>. Sumber data = Work Item repository (bukan animasi).
            </p>
            <div style={{ marginBottom: 22, padding: 16, background: workPollState?.status === "verified" ? "#dcfce7" : "#fffbeb", borderRadius: 12, border: `1px solid ${workPollState?.status === "verified" ? "#16a34a" : brandColorAccent}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <div><span style={{ color: "#78350f", fontWeight: 800 }}>🆔 Work ID:</span> <span style={{ fontFamily: "ui-monospace,monospace", color: "#431407", fontWeight: 700 }}>{activeWorkId ?? "(menunggu backend)"}</span></div>
                <div><span style={{ color: "#78350f", fontWeight: 800 }}>📦 Status:</span> <span style={{ color: workPollState?.status === "verified" ? "#166534" : "#431407", fontWeight: 700 }}>{workPollState?.status ?? "(pending)"}</span></div>
                <div><span style={{ color: "#78350f", fontWeight: 800 }}>👤 Owner Saat Ini:</span> <span style={{ color: "#431407", fontWeight: 700 }}>{workPollState?.owner ?? "(belum ada — AI masih memproses)"}</span></div>
                <div><span style={{ color: "#78350f", fontWeight: 800 }}>✅ Verifikasi:</span> <span style={{ color: workPollState?.verificationStatus === "passed" ? "#166534" : "#431407", fontWeight: 700 }}>{workPollState?.verificationStatus ?? "(belum)"}</span></div>
                {workPollState?.handoffReady === true && (
                  <div style={{ gridColumn: "1 / -1" }}><span style={{ padding: "4px 10px", borderRadius: 999, background: "#fde68a", color: "#78350f", fontSize: 12, fontWeight: 800 }}>🔁 [HANDOFF READY] Konteks percakapan dilekatkan ke Work Item — profesional TIDAK PERLU bertanya dari awal.</span></div>
                )}
              </div>
            </div>
            {workPollState?.title && (
              <div style={{ marginBottom: 18, padding: 12, background: "#fff", border: "1px dashed #fed7aa", borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: brandColor, fontWeight: 800, marginBottom: 4 }}>JUDUL PEKERJAAN SAAT INI</div>
                <div style={{ fontSize: 14, color: "#431407", fontWeight: 700 }}>{workPollState.title}</div>
                {workPollState.summary && <div style={{ fontSize: 13, color: "#78350f", marginTop: 6 }}>{workPollState.summary}</div>}
              </div>
            )}
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
              {statusSteps.map((s, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "center", gap: 14, transition: "all 0.3s ease" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.done ? "#16a34a" : s.current ? brandColor : "#fef3c7", color: s.done || s.current ? "#fff" : "#a16207", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, boxShadow: s.current ? "0 0 0 8px rgba(180,83,9,0.15)" : s.done ? "0 0 0 4px rgba(22,163,74,0.12)" : undefined }}>
                    {s.done ? "✓" : idx + 1}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: s.current ? 800 : 600, color: s.done || s.current ? "#431407" : "#a16207", transform: s.current ? "translateX(4px)" : "translateX(0)" }}>
                    {s.label} {s.current && !s.done ? " — sedang diproses..." : s.done ? " ✅ selesai" : ""}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {stage === "outcome" && execution && (
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 18 }}>
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #fed7aa", padding: 28, boxShadow: "0 10px 30px rgba(180,83,9,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ padding: "4px 10px", borderRadius: 999, background: execution.workVerification === "passed" ? "#dcfce7" : "#fde68a", color: execution.workVerification === "passed" ? "#166534" : "#78350f", fontSize: 12, fontWeight: 800 }}>✅ {execution.workVerification === "passed" ? "Selesai Diproses & Terverifikasi" : "Selesai Diproses"}</div>
                {execution.handoffReady === true && <div style={{ padding: "4px 10px", borderRadius: 999, background: "#fde68a", color: "#78350f", fontSize: 12, fontWeight: 800 }}>🔁 HANDOFF READY</div>}
                {execution.operatorAssigned && <div style={{ padding: "4px 10px", borderRadius: 999, background: "#dbeafe", color: "#1e3a8a", fontSize: 12, fontWeight: 800 }}>👤 Owner: {execution.operatorAssigned}</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "8px 0 14px", fontSize: 13 }}>
                <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: 10 }}>
                  <div style={{ color: "#78350f", fontWeight: 800, marginBottom: 2 }}>🆔 WORK ID</div>
                  <div style={{ fontFamily: "ui-monospace,monospace", color: "#431407", fontWeight: 700 }}>{execution.workId ?? "(tidak tersedia)"}</div>
                </div>
                <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: 10 }}>
                  <div style={{ color: "#78350f", fontWeight: 800, marginBottom: 2 }}>📦 WORK STATUS</div>
                  <div style={{ color: "#431407", fontWeight: 700 }}>{execution.workStatus ?? "(tidak tersedia)"}</div>
                </div>
                <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: 10 }}>
                  <div style={{ color: "#78350f", fontWeight: 800, marginBottom: 2 }}>✅ VERIFIKASI</div>
                  <div style={{ color: execution.workVerification === "passed" ? "#166534" : "#431407", fontWeight: 700 }}>{execution.workVerification ?? "(tidak tersedia)"}</div>
                </div>
                <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: 10 }}>
                  <div style={{ color: "#78350f", fontWeight: 800, marginBottom: 2 }}>📋 TIPE PEKERJAAN</div>
                  <div style={{ color: "#431407", fontWeight: 700 }}>{execution.type}</div>
                </div>
              </div>
              <h2 style={{ color: "#431407", margin: "4px 0 8px", fontSize: 24, letterSpacing: -0.3 }}>{execution.title}</h2>
              <h3 style={{ color: brandColor, fontSize: 15, margin: "22px 0 10px" }}>📄 Dokumen</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {execution.notes.length === 0 && <div style={{ fontSize: 13, color: "#78350f" }}>—</div>}
                {execution.notes.map((note, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 10, background: "#fffbeb", border: "1px solid #fed7aa", color: "#431407", fontSize: 14 }}>
                    {note}
                  </div>
                ))}
              </div>
              <h3 style={{ color: brandColor, fontSize: 15, margin: "22px 0 10px" }}>📋 Bukti transaksi</h3>
              <div style={{ display: "grid", gap: 6 }}>
                {execution.evidence.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px dashed #fed7aa", fontSize: 13 }}>
                    <span style={{ color: "#78350f", fontWeight: 700 }}>{e.label}</span>
                    <span style={{ color: "#431407", fontFamily: "ui-monospace,monospace" }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside style={{ display: "grid", gap: 14, gridTemplateRows: "auto auto 1fr" }}>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #fed7aa", padding: 18 }}>
                <div style={{ fontSize: 12, color: brandColor, fontWeight: 800, marginBottom: 6 }}>CATATAN HASIL</div>
                <div style={{ fontSize: 15, color: "#431407", lineHeight: 1.6, fontWeight: 600 }}>
                  Pekerjaan hukum selesai. Dokumen dan bukti tersimpan. Anda bisa unduh dokumen atau mulai kebutuhan lain kapan saja.
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #fed7aa", padding: 18 }}>
                <div style={{ fontSize: 12, color: brandColor, fontWeight: 800, marginBottom: 8 }}>🎯 LANGKAH BERIKUTNYA</div>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#78350f", lineHeight: 1.8 }}>
                  {execution.nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <button onClick={() => { setStage("landing"); setSelectedNeed(null); setMessages([]); setExecution(null); }} style={{ padding: 14, borderRadius: 12, background: brandColor, color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}>
                  🆕 Selesai · Mulai kebutuhan lain
                </button>
                <button onClick={() => setStage("conversation")} style={{ padding: 14, borderRadius: 12, background: "#fff", color: brandColor, border: "2px solid " + brandColorAccent, fontWeight: 700, cursor: "pointer" }}>
                  💬 Tanya-tanya lagi tentang hasil ini
                </button>
              </div>
            </aside>
          </div>
        )}

        {stage === "outcome" && !execution && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <p style={{ color: "#78350f" }}>Belum ada hasil. Jalankan proses terlebih dahulu.</p>
            <button onClick={() => setStage("conversation")} style={{ marginTop: 10, padding: "12px 18px", borderRadius: 12, background: brandColor, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
              Kembali
            </button>
          </div>
        )}
      </section>

      <footer style={{ textAlign: "center", padding: 30, color: "#92400e", fontSize: 12 }}>
        © {new Date().getFullYear()} CommsMe · Pendamping Hukum Terpercaya untuk UMKM.
      </footer>
    </main>
  );
}
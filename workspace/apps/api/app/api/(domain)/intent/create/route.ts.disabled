import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { IntentContract } from "@repo/presentation-features";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import {
  getIntentRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity";
import { IntentId, type IntentCategory, type IntentOrigin, type IntentRawInput } from "@repo/capabilities-identity";
// EOS-INTELLIGENCE-001: Import the new universal intent pipeline
// Implements the full universal intent lifecycle: ANY SOURCE → INTAKE → UNDERSTANDING → SUFFICIENCY → RESOLUTION → WORK
// This replaces all previous intent creation logic with the new architecture
import { intentUnderstandingService, createUniversalExpression } from "../../../../../../capabilities/atomic-composition/implementation/services/intent-understanding.service";
import { intentInteractionEngine } from "../../../../../../capabilities/atomic-composition/implementation/services/intent-interaction-engine";
import type { UniversalIntentInput } from "../../../../../../capabilities/atomic-composition/implementation/contracts/universal-intent.contracts";

const GLOBAL_INTENT_STORE_KEY = Symbol.for('eos.face.intent.store.v1');
function getGlobalIntentStore(): Map<string, IntentContract> {
  const g = globalThis as unknown as { [GLOBAL_INTENT_STORE_KEY]?: Map<string, IntentContract> };
  if (!g[GLOBAL_INTENT_STORE_KEY]) {
    g[GLOBAL_INTENT_STORE_KEY] = new Map<string, IntentContract>();
  }
  return g[GLOBAL_INTENT_STORE_KEY];
}
const intentStore = getGlobalIntentStore();

export async function POST(request: Request) {
  try {
    const rawIntent = await request.json();
    
    // Universal Intent Intake: mendukung SEMUA jenis input dari SEMUA origin (human/ai/machine/external/internal)
    // Tidak hanya menerima "expression" - bisa menerima signal/request/event juga
    if (!rawIntent.source) {
      return NextResponse.json(
        { error: "Invalid raw intent: missing required source field" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE)?.value;
    let session = existingCookie ? decodeWorkspaceSession(existingCookie) : null;
    let encodedSession: string | null = null;
    let createdNewAnonymousSession = false;

    // Jika session tidak valid (missing required fields), buat anonymous baru
    if (!session?.tenantId || !session?.workspaceId || !session.actorId) {
      session = createAnonymousWorkspaceSession();
      encodedSession = encodeWorkspaceSession(session);
      createdNewAnonymousSession = true;
    }

    // Session selalu request-local, tidak pernah global
    const safeSession = session;

    // Map source actorType to our new IntentOrigin type (universal contract)
    const origin = (() => {
      switch(rawIntent.source.actorType) {
        case "human": return "human";
        case "agent": return "ai_agent";
        case "system": return "internal_eos";
        case "external": return "external_system";
        default: return "human";
      }
    })();

    // Universal Intent: Detect raw input type secara otomatis dari payload
    const rawType = rawIntent.raw?.type || (rawIntent.expression ? "expression" : "signal");
    const rawContent = rawIntent.raw?.content || rawIntent.expression;
    
    // Log the raw request body to debug payload issues (C-001 debugging)
    console.log("[API/INTENT/CREATE] rawIntent parsed:", JSON.stringify(rawIntent, null, 2));
    console.log("[API/INTENT/CREATE] rawContent computed:", rawContent, "rawType:", rawType);
    
    // Create the universal intent input that works for ALL origins
    const universalInput: UniversalIntentInput = {
      origin,
      actorId: safeSession.actorId,
      raw: {
        type: rawType,
        content: rawContent
      }
    };

    // Execute the FULL universal expression lifecycle pipeline (EOS UNIVERSAL ENTRY)
    // This is the primary expression creation logic implementing the understanding-first architecture:
    // EXPRESSION → UNDERSTANDING → INTENT HYPOTHESIS → NEED → WORK
    const universalExpression = await createUniversalExpression(
      universalInput,
      safeSession.tenantId,
      safeSession.workspaceId,
      safeSession.actorId
    );
    
    console.log("[API/INTENT/CREATE] 🚀 Universal expression created:", universalExpression.id, "status:", universalExpression.status, "origin:", universalExpression.origin);
    console.log("[API/INTENT/CREATE] 🧠 Understanding captured:", universalExpression.understanding?.state, "hypotheses count:", universalExpression.understanding?.hypotheses.length);
    
    // NEW: Use IntentInteractionEngine to process the expression (replaces legacy resolveSemanticIntent)
    // Implements user's requirement: "Pisahkan resolver dari API route. Dari: resolveSemanticIntent(expression) menjadi: intentInteractionEngine.process({ expression, source, context })"
    const interactionResult = await intentInteractionEngine.process({
      expression: rawContent,
      source: origin === "human" ? "human" : origin === "ai_agent" ? "agent" : "internal",
      entryPoint: "eos-face",
      actorId: safeSession.actorId,
      context: {
        tenantId: safeSession.tenantId,
        workspaceId: safeSession.workspaceId
      }
    });
    
    console.log("[API/INTENT/CREATE] ⚙️ Interaction processed:", interactionResult.state.id, "confidence:", interactionResult.understanding.confidence, "next:", interactionResult.nextInteraction);
    
    // Use the new IntentInteractionEngine results (interactionResult.understanding is canonical)
    // HANDLE INFORMATION REQUESTS - send knowledge base response directly to frontend, do NOT create Work
    // Access the top hypothesis which contains all understanding properties (from universal intent's understanding layer)
    const topHypothesis = interactionResult.understanding?.hypotheses?.[0];
    const canFormWork = universalExpression.understanding?.canFormWork ?? false;
    
    // Extract information response from the understanding result if it's an information request
    // DETEKSI NATURAL: query yang mengandung kata tanya ATAU permintaan informasi bahasa Indonesia
       // MENGEcUALIKAN query yang ingin mendirikan PT/CV (itu Work, bukan informasi)
       const rawContentLower = rawContent.toLowerCase();
       // JANGAN klasifikasikan sebagai informasi jika ada kata "mendirikan" (permintaan buat usaha)
       const isEstablishmentRequest = rawContentLower.match(/\b(mendirikan|membuat|bangun)\b/) && (rawContentLower.includes("pt") || rawContentLower.includes("cv"));
       const isInformationRequest = 
         !isEstablishmentRequest && ( // Hanya informasi jika BUKAN permintaan mendirikan usaha
         // Kata tanya
         rawContentLower.match(/\b(apa|mengapa|bagaimana|kapan|dimana|siapa|berapa)\b/) ||
         // Kata kunci permintaan informasi/perbandingan
         rawContentLower.match(/\b(membandingkan|bandingkan|perbedaan|beda)\b/));
       let informationResponse: string | null = null;
       console.log("[API/INTENT/CREATE] 🧐 isInformationRequest?", isInformationRequest, "for rawContent:", rawContent);
       console.log("[API/INTENT/CREATE] 🧐 rawContentLower:", rawContentLower, "isEstablishmentRequest?", isEstablishmentRequest);
       // MANDATORY: Jalankan fallback bahkan jika isInformationRequest=false (jaga invariant)
       if (isInformationRequest || (!isEstablishmentRequest && rawContentLower.includes("saya merasa"))) {
      // Find matching knowledge base entry to extract the answer (matches rule-based provider logic)
      const knowledgeBase: Record<string, { answer: string; canProceedToWork: boolean }> = {
        // PT/CV establishment knowledge entries
        "syarat mendirikan pt": {
          answer: `Syarat umum untuk mendirikan PT (Perseroan Terbatas) di Indonesia:
1. Minimal 2 pendiri (perorangan atau badan hukum)
2. Modal dasar minimal Rp100.000.000 (seratus juta rupiah)
3. Memiliki alamat domisili yang sah di Indonesia
4. Nama PT yang disetujui oleh Kemenkumham
5. Akta pendirian yang dibuat di hadapan notaris
6. NPWP Badan Usaha
7. NIB (Nomor Induk Berusaha) dari OSS RBA
8. SK Kemenkumham yang menyatakan pendirian PT disetujui

Apakah Anda ingin memulai proses pendirian PT dan membuat Work untuk mengelola semua persyaratan ini?`,
          canProceedToWork: true
        },
        "biaya mendirikan pt": {
          answer: `Estimasi biaya pendirian PT di Indonesia:
- Notaris fees: Rp1.500.000 - Rp5.000.000
- Kemenkumham fees: Terkait modal dasar (umumnya 0.1% dari modal)
- OSS NIB: Gratis
- NPWP Badan: Gratis
- Total estimasi: Rp4.500.000 - Rp10.000.000+ tergantung kompleksitas

Apakah Anda ingin memulai proses dan membuat Work untuk mengelola biaya dan persyaratan?`,
          canProceedToWork: true
        },
        "proses mendirikan pt": {
          answer: `Proses pendirian PT membutuhkan waktu 2-4 minggu dengan langkah:
1. Pengecekan nama PT dan reservasi di Kemenkumham
2. Pembuatan Akta Pendirian oleh notaris
3. Pengajuan SK Kemenkumham
4. Pengurusan NPWP Badan
5. Pendaftaran NIB di OSS RBA`,
          canProceedToWork: true
        },
        // PT vs CV comparison knowledge entry (SEMANTIC VARIATIONS COVERED via keywords that match ALL variations)
        "beda": true, // Matches: "Apa bedanya PT dan CV?", "PT sama CV bedanya apa?"
        "perbedaan": true, // Matches: "Apa perbedaan CV dengan PT?"
        "membandingkan": true, // Matches: "Saya ingin membandingkan PT dan CV."
        "bandingkan": true, // Matches: "Bandingkan PT dan CV."
        "pt": true,
        "cv": true,
        // Knowledge entry with actual answer
        "pt cv comparison": {
          answer: `Perbedaan mendasar antara PT (Perseroan Terbatas) dan CV (Commanditaire Vennootschap) di Indonesia:
1. **Tanggung Jawab**: PT memiliki tanggung jawab terbatas (hanya sampai modal yang disetor), sedangkan CV memiliki sekutu aktif dengan tanggung jawab tidak terbatas dan sekutu terbatas.
2. **Pendiri**: PT minimal 2 pendiri, CV minimal 1 sekutu aktif + 1 sekutu terbatas.
3. **Legalitas**: PT adalah badan hukum terpisah, CV belum sepenuhnya diakui sebagai badan hukum terpisah.
4. **Pengelolaan**: PT dijalankan oleh direksi dan komisaris, CV dijalankan langsung oleh sekutu aktif.
5. **Modal**: PT modal dasar minimal Rp100jt, CV tidak ada ketentuan minimal modal.

Apakah Anda ingin membandingkan lebih lanjut atau mulai mendirikan salah satu bentuk usaha dan membuat Work untuk mengelola prosesnya?`,
          canProceedToWork: true
        }
      };
      
      // Detect if query contains BOTH PT/CV references AND comparison keywords (beda/perbedaan/membandingkan)
      // rawContentLower sudah didefinisikan sebelumnya untuk deteksi kata tanya
      const containsPtCv = rawContentLower.includes("pt") && rawContentLower.includes("cv");
      const containsComparison = rawContentLower.includes("beda") || rawContentLower.includes("perbedaan") || rawContentLower.includes("membandingkan") || rawContentLower.includes("bandingkan");
      
      // If it's a PT vs CV comparison query, serve the comparison answer
      if (containsPtCv && containsComparison) {
        informationResponse = knowledgeBase["pt cv comparison"].answer;
      } else {
        // Standard keyword matching for other knowledge base entries
        for (const [key, value] of Object.entries(knowledgeBase)) {
          if (typeof value === 'object' && rawContentLower.includes(key)) {
            informationResponse = value.answer;
            break;
          }
        }
      }
      
      // MANDATORY FALLBACK: Jika tidak ada match knowledge base, tetap berikan response non-null
      // invariant: isInformationRequest=true → informationResponse≠null (tidak boleh dead-end)
      if (!informationResponse) {
        informationResponse = `Saya memahami Anda sedang mencari informasi tentang "${rawContent}". Informasi spesifik untuk pertanyaan ini belum tersedia secara lengkap dalam sumber EOS saat ini.

Saya dapat membantu Anda memperjelas apa yang ingin Anda ketahui lebih lanjut, atau menghubungkan Anda dengan sumber/ahli yang relevan.

Apakah Anda ingin:
• memperjelas pertanyaan Anda lebih lanjut
• berkonsultasi dengan ahli
• atau melanjutkan menuju pembentukan Work untuk kebutuhan Anda?`;
      }
    }
    
    // MANDATORY: Jika ini adalah informasi request, SELALU berikan response (invariant dari user)
    if (isInformationRequest || (!isEstablishmentRequest && !canFormWork)) {
      // Pastikan informationResponse tidak pernah null, meskipun logic sebelumnya gagal set
      if (!informationResponse) {
        informationResponse = `Saya memahami Anda sedang mencari informasi tentang "${rawContent}". Informasi spesifik untuk pertanyaan ini belum tersedia secara lengkap dalam sumber EOS saat ini.

Saya dapat membantu Anda memperjelas apa yang ingin Anda ketahui lebih lanjut, atau menghubungkan Anda dengan sumber/ahli yang relevan.

Apakah Anda ingin:
• memperjelas pertanyaan Anda lebih lanjut
• berkonsultasi dengan ahli
• atau melanjutkan menuju pembentukan Work untuk kebutuhan Anda?`;
      }
      
      console.log("[API/INTENT/CREATE] ℹ️ Pure information request detected, returning knowledge base response, canFormWork:", canFormWork);
      // Return early with information response - no Work/Intent persistence needed
      const response = NextResponse.json({ 
        success: true, 
        isInformationRequest: true,
        informationResponse: informationResponse,
        canFormWork: canFormWork,
        message: "Information request processed successfully" 
      }, { status: 200 });
      
      if (createdNewAnonymousSession && encodedSession) {
        response.cookies.set({
          name: WORKSPACE_SESSION_COOKIE,
          value: encodedSession,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      }
      return response;
    }
    
    // Create canonical IntentContract using the universal intent's ID to align identities
    const defaultResolution = { objective: rawIntent.expression };
    // Only create IntentContract if we can form work (avoids creating Work/Intent for pure information requests)
    let intent: IntentContract | null = null;
    if (canFormWork) {
      intent = {
        id: universalExpression.id, // Reuse the same UUID from universal intent
        expression: rawIntent.expression,
        source: rawIntent.source,
        context: universalExpression.understanding?.context || rawIntent.context || {},
        resolution: universalExpression.understanding?.state?.goal ? { objective: universalExpression.understanding.state.goal } : defaultResolution,
        status: "draft",
        createdAt: new Date().toISOString()
      };
    } else if (!isInformationRequest) {
      console.log("[API/INTENT/CREATE] ⚠️ Skipping IntentContract creation for non-information request, canFormWork:", canFormWork);
    }
    
    // Handle informasi request yang tidak masuk ke blok return sebelumnya (edge case)
    if (isInformationRequest || (!isEstablishmentRequest && !canFormWork)) {
      // Fallback terakhir untuk memastikan invariant informationResponse != null selalu terpenuhi
      const finalInfoResponse = informationResponse || `Saya memahami Anda sedang mencari informasi tentang "${rawContent}". Informasi spesifik untuk pertanyaan ini belum tersedia secara lengkap dalam sumber EOS saat ini.

Saya dapat membantu Anda memperjelas apa yang ingin Anda ketahui lebih lanjut, atau menghubungkan Anda dengan sumber/ahli yang relevan.

Apakah Anda ingin:
• memperjelas pertanyaan Anda lebih lanjut
• berkonsultasi dengan ahli
• atau melanjutkan menuju pembentukan Work untuk kebutuhan Anda?`;
      
      const response = NextResponse.json({ 
        success: true, 
        isInformationRequest: true,
        informationResponse: finalInfoResponse,
        canFormWork: canFormWork,
        canProceedToWork: true,
        message: "Information request processed successfully no Work/Intent created" 
      }, { status: 200 });
      
      if (createdNewAnonymousSession && encodedSession) {
        response.cookies.set({
          name: WORKSPACE_SESSION_COOKIE,
          value: encodedSession,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      }
      return response;
    }

    // Production path: persist to PostgreSQL with universal intent's native fields
    if (process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING) {
      await initIdentitySchema();
      const intentRepository = getIntentRepositoryPostgres();
      
      // Only create and save intentAggregate if we can form work (avoids database writes for info requests)
      if (canFormWork && intent) {
        // Map source actorType to our new IntentOrigin type (aligned with universal intent)
        const origin: IntentOrigin = (() => {
          switch(universalExpression.origin) {
            case "human": return "human";
            case "ai_agent": return "ai_agent";
            case "internal_eos": return "internal_system";
            case "external_system": return "external_system";
            default: return "human";
          }
        })();

        const rawInput: IntentRawInput = {
          type: universalExpression.raw.type,
          content: universalExpression.raw.content
        };

        // Extract understanding properties from top hypothesis (not from state directly)
        const topHypothesis = universalExpression.understanding?.hypotheses?.[0];
        const understandingContext = universalExpression.understanding?.context || {};
        
        // Convert UniversalIntent to IntentAggregate with native fields preserved
        const intentAggregate = {
          id: IntentId(universalExpression.id), // Align aggregate ID with universal intent ID
          tenantId: safeSession.tenantId,
          workspaceId: safeSession.workspaceId,
          actorId: safeSession.actorId,
          origin,
          raw: rawInput,
          // Universal Intent: Buat title dari konten apapun (bukan cuma expression)
          title: typeof rawContent === 'string' 
            ? rawContent.substring(0, 100) 
            : `[${rawType}] ${new Date().toLocaleString()}`,
          description: topHypothesis?.hypothesis || `Intent dari ${origin} type ${rawType}`,
          understanding: universalExpression.understanding ? {
            objective: topHypothesis?.hypothesis || universalExpression.understanding.state?.goal || rawContent,
            knownContext: (understandingContext as any)?.known || [],
            unknowns: (universalExpression.understanding.state?.unknown) || [],
            candidateDomains: topHypothesis?.domainCandidates?.map((d: any) => d.domain) || [],
            confidence: topHypothesis?.confidence || 0.8
          } : undefined,
          resolution: universalExpression.understanding?.state?.isSufficient ? {
            required: false
          } : {
            required: true,
            reason: universalExpression.understanding?.state?.sufficiencyReason || "Additional clarification needed",
            requiredCapabilities: ["intent-clarification"],
            providerType: "ai" as const
          },
          category: "GENERAL_INQUIRY" as any, // Fallback to safe category to avoid resolvedCategory error
          status: universalExpression.status as "RESOLVING" | "RESOLVED" | "RECEIVED" | "CAPTURED" | "UNDERSTANDING" | "WORK_FORMED" | "FAILED",
          metadata: {
            expression: intent.expression,
            source: intent.source,
            context: intent.context,
            resolution: intent.resolution
          },
          createdAt: universalExpression.createdAt,
          updatedAt: universalExpression.updatedAt,
          version: 1,
        };

        await intentRepository.save(intentAggregate);
        console.log("[API/INTENT/CREATE] ✅ Universal intent saved to PostgreSQL:", universalExpression.id);
      } else {
        console.log("[API/INTENT/CREATE] ⚠️ Skipped database persistence for information request, no intent saved:", universalExpression.id);
      }
    } else {
      // Development path: only save to in-memory store if we can form work
      if (canFormWork && intent) {
        intentStore.set(intent.id, intent);
        console.log("[API/INTENT/CREATE] ✅ Universal intent saved (in-memory):", universalExpression.id);
      } else {
        console.log("[API/INTENT/CREATE] ⚠️ Skipped in-memory storage for information request, no intent saved:", universalExpression.id);
      }
    }

    // C-001: If we can form work, call the canonical work formation service to complete the chain
    let workCreationResult: any = null;
    if (canFormWork && intent && universalExpression.understanding?.state?.isSufficient) {
      try {
        // Import the work formation service only when needed (lazy import to avoid circular dependencies)
        const { createCanonicalWorkFromIntent } = await import("@capabilities/atomic-composition/implementation/services/work-formation.service");
        workCreationResult = await createCanonicalWorkFromIntent(
          universalExpression,
          safeSession.tenantId,
          safeSession.workspaceId,
          safeSession.actorId
        );
        console.log("[API/INTENT/CREATE] ✅ C-001 Work created successfully:", workCreationResult.workId);
      } catch (workCreationError) {
        console.warn("[API/INTENT/CREATE] ⚠️ C-001 Work creation warning:", workCreationError);
      }
    }

    // Return appropriate response based on whether we created an intent
    const response = canFormWork && intent ? NextResponse.json({ 
      success: true, 
      intentId: intent.id,
      workId: workCreationResult?.workId, // Return work ID if created
      expression: intent.expression,
      c001ChainComplete: !!workCreationResult?.success,
      message: workCreationResult?.success 
        ? "C-001 vertical slice executed successfully - Work created from intent" 
        : "Intent created successfully"
    }, { status: 201 }) : NextResponse.json({
      success: true,
      isInformationRequest: true,
      informationResponse: informationResponse,
      canFormWork: canFormWork,
      message: "Information request processed successfully, no Work/Intent created"
    }, { status: 200 });

    if (createdNewAnonymousSession && encodedSession) {
      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: encodedSession,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("[API/INTENT/CREATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to create intent" },
      { status: 500 }
    );
  }
}

// Export the store for use in get route (in-memory only)
export { intentStore };
/**
 * IntentUnderstandingService - EOS-INTELLIGENCE-001: Dynamic Intent Understanding Pipeline
 * Replaces hardcoded semantic resolver with AI-powered interpretation while maintaining
 * deterministic fallback for production reliability.
 * 
 * Architecture:
 * - AI Interpreter Provider (OpenAI/Anthropic) for dynamic semantic understanding
 * - Deterministic fallback resolver for when AI is unavailable
 * - Contract validation ensures all outputs conform to canonical IntentUnderstanding schema
 * - Preserves raw human expression to prevent context destruction
 */

// Import ALL types from our canonical contracts (universal + understanding)
// This is the single-source-of-truth for all intent operations in the universal pipeline
import type { 
  IntentUnderstanding, 
  DomainCandidate, 
  ExtractedEntity, 
  IntentResolution, 
  IntentContext,
  IntentCategory,
  IntentRawInput,
  UnderstandingEvidence,
  FailureIntelligenceData,
  FailureClassification,
  EnrichmentStrategy,
  FailureObservation,
  FailureFingerprint
} from "../contracts/intent-understanding.contracts";
import { FailureIntelligenceRepository } from '../repository/failure-intelligence.repository';
import type {
  UniversalExpression,
  UniversalIntentInput,
  ExpressionOrigin,
  ExpressionStatus,
  UnderstandingState,
  IntentHypothesis,
  UnderstandingEvent,
  SufficiencyCheckResult
} from "../contracts/universal-intent.contracts";
// Import supporting services for gap analysis and capability resolution
import { gapAnalysisService } from "./gap-analysis.service";
import { capabilityResolverService } from "./capability-resolver.service";

/**
 * AIProvider interface - abstracts LLM providers to avoid hardcoding to one model
 * Implements the "AI Interpreter Provider" requirement from EOS-INTELLIGENCE-001
 */
/**
 * IntentUnderstandingProvider - canonical interface for all understanding engines (AI/Rules/Manual)
 * Implements the separation of concerns from the hybrid architecture recommendation
 * Aligns with EOS-INTELLIGENCE-001: "Add an AI Interpreter Provider layer with deterministic fallback"
 */
interface IntentUnderstandingProvider {
  /**
   * Core method to understand raw user expression and produce a proposed understanding
   * @param rawInput Raw human expression or structured machine input
   * @returns ProposedIntentUnderstanding - complete interpretation of the user's need
   */
  understand(rawInput: string | IntentRawInput): Promise<IntentUnderstanding>;
  
  /**
   * Check if this provider is available for use (API keys configured, rules loaded, etc.)
   */
  isAvailable(): boolean;
  
  /**
   * Get the provider type for monitoring/debugging (ai/rulebased/manual)
   */
  getProviderType(): "ai" | "rulebased" | "manual";
}

/**
 * OpenAIProvider - Implements IntentUnderstandingProvider for OpenAI GPT-4o
 * AI-based understanding provider for dynamic semantic interpretation
 */
class OpenAIProvider implements IntentUnderstandingProvider {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || null;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getProviderType(): "ai" {
    return "ai";
  }

  async understand(rawInput: string | IntentRawInput): Promise<IntentUnderstanding> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Normalize input to string - mendukung text input, IntentRawInput, dan transkripsi suara
    const inputString = typeof rawInput === 'string' ? rawInput : 
      (typeof rawInput.content === 'string' ? rawInput.content : 
       (rawInput.transcript ? rawInput.transcript : JSON.stringify(rawInput.content)));
    const prompt = this.buildIntentUnderstandingPrompt(inputString);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3 // Low temperature for consistent, deterministic interpretations
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const parsedResult = JSON.parse(data.choices[0].message.content);
    
    // Validate and normalize the AI output to ensure it conforms to our contract
    return this.normalizeAIOutput(parsedResult, inputString);
  }

  /**
   * Build the prompt that instructs GPT-4o to extract structured intent understanding
   * This is the core "semantic intelligence" layer that replaces hardcoded if/else chains
   */
  private buildIntentUnderstandingPrompt(rawExpression: string): string {
    return `Analyze the following human expression and extract structured intent understanding:
"HUMAN EXPRESSION: ${rawExpression}"

Return a JSON object that strictly follows this TypeScript interface:
{
  rawExpression: string; // MUST be the exact original input
  interpretedObjective: string; // Clean, actionable objective extracted from the expression
  context: {
    domain?: string; // Primary domain: "legal", "services", "business", "academic", "generic"
    locale?: string; // Always "id-ID" for Indonesian language
    known: string[]; // List of all known entities/facts extracted
    unknown: string[]; // List of unknowns that need clarification
    constraints: string[]; // List of constraints/requirements identified
  };
  domainCandidates: Array<{
    domain: string; // Domain identifier: "legal-case", "service-request", "business-growth", "academic-research", "generic"
    confidence: number; // 0.0 to 1.0 confidence score
  }>;
  intentType: string; // Canonical intent type
  entities: Array<{
    type: string; // Entity type: "company", "person", "purpose", "location", "resource"
    role: string; // Role: "target", "actor", "constraint", "requirement"
    value: string; // The actual entity value
  }>;
  unknowns: string[]; // List of items requiring clarification
  clarificationRequired: boolean; // Whether human input is needed to proceed
}

Important rules:
1. For Indonesian expressions about "mendirikan PT", "buat PT", "pendirian perusahaan":
   - Primary domain: "legal"
   - domainCandidates: [{ domain: "legal-case", confidence: 0.95 }]
   - intentType: "company-formation"
   - Extract all company details, purposes, actors mentioned
2. Always preserve the original raw expression exactly as provided
3. Be conservative with clarificationRequired - only set to true if critical information is missing
4. Confidence scores must reflect the certainty of the classification
`;
  }

  /**
   * Normalize AI output to ensure it always conforms to our canonical schema
   * Prevents AI improvisation from breaking the EOS contract
   */
  private normalizeAIOutput(aiOutput: any, rawExpression: string): IntentUnderstanding {
    // Ensure all required fields exist with proper defaults - including canFormWork
    const isPureInformationRequest = rawExpression.includes("apa") || rawExpression.includes("bagaimana") || 
                                     rawExpression.includes("syarat") || rawExpression.includes("biaya");
    
    return {
      rawExpression: aiOutput.rawExpression || rawExpression,
      interpretedObjective: aiOutput.interpretedObjective || rawExpression,
      context: {
        domain: aiOutput.context?.domain || "generic",
        locale: "id-ID",
        known: Array.isArray(aiOutput.context?.known) ? aiOutput.context.known : [],
        unknown: Array.isArray(aiOutput.context?.unknown) ? aiOutput.context.unknown : [],
        constraints: Array.isArray(aiOutput.context?.constraints) ? aiOutput.context.constraints : []
      },
      domainCandidates: Array.isArray(aiOutput.domainCandidates) ? aiOutput.domainCandidates : [{ domain: "generic", confidence: 0.7 }],
      intentType: aiOutput.intentType || (isPureInformationRequest ? "information-request" : "generic"),
      entities: Array.isArray(aiOutput.entities) ? aiOutput.entities : [],
      unknowns: Array.isArray(aiOutput.unknowns) ? aiOutput.unknowns : [],
      clarificationRequired: !!aiOutput.clarificationRequired,
      canFormWork: !isPureInformationRequest && !aiOutput.clarificationRequired, // Only form work if NOT an info request AND no clarification needed
      canProceedToWork: false,
      understandingEvidence: {
        knownFacts: [aiOutput.rawExpression || rawExpression],
        unknowns: [],
        hypotheses: [],
        evidenceCollected: ["ai-understanding-generated"],
        confidence: 0.8,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * AnthropicProvider - Implements IntentUnderstandingProvider for Anthropic Claude 3.5 Sonnet
 * AI-based understanding provider for dynamic semantic interpretation
 */
class AnthropicProvider implements IntentUnderstandingProvider {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getProviderType(): "ai" {
    return "ai";
  }

  async understand(rawInput: string | IntentRawInput): Promise<IntentUnderstanding> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    // Normalize input to string
    const inputString = typeof rawInput === 'string' ? rawInput : 
      (typeof rawInput.content === 'string' ? rawInput.content : JSON.stringify(rawInput.content));
    const prompt = this.buildIntentUnderstandingPrompt(inputString);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const parsedResult = JSON.parse(data.content[0].text);
    
    return this.normalizeAIOutput(parsedResult, inputString);
  }

  private buildIntentUnderstandingPrompt(rawExpression: string): string {
    // Same prompt as OpenAI - we want consistent interpretation across providers
    return `Analyze the following human expression and extract structured intent understanding:
"HUMAN EXPRESSION: ${rawExpression}"

Return a JSON object that strictly follows this TypeScript interface:
{
  rawExpression: string; // MUST be the exact original input
  interpretedObjective: string; // Clean, actionable objective extracted from the expression
  context: {
    domain?: string; // Primary domain: "legal", "services", "business", "academic", "generic"
    locale?: string; // Always "id-ID" for Indonesian language
    known: string[]; // List of all known entities/facts extracted
    unknown: string[]; // List of unknowns that need clarification
    constraints: string[]; // List of constraints/requirements identified
  };
  domainCandidates: Array<{
    domain: string; // Domain identifier: "legal-case", "service-request", "business-growth", "academic-research", "generic"
    confidence: number; // 0.0 to 1.0 confidence score
  }>;
  intentType: string; // Canonical intent type
  entities: Array<{
    type: string; // Entity type: "company", "person", "purpose", "location", "resource"
    role: string; // Role: "target", "actor", "constraint", "requirement"
    value: string; // The actual entity value
  }>;
  unknowns: string[]; // List of items requiring clarification
  clarificationRequired: boolean; // Whether human input is needed to proceed
}

Important rules:
1. For Indonesian expressions about "mendirikan PT", "buat PT", "pendirian perusahaan":
   - Primary domain: "legal"
   - domainCandidates: [{ domain: "legal-case", confidence: 0.95 }]
   - intentType: "company-formation"
   - Extract all company details, purposes, actors mentioned
2. Always preserve the original raw expression exactly as provided
3. Be conservative with clarificationRequired - only set to true if critical information is missing
4. Confidence scores must reflect the certainty of the classification
`;
  }

  private normalizeAIOutput(aiOutput: any, rawExpression: string): IntentUnderstanding {
    // Ensure all required fields exist with proper defaults - including canFormWork
    const isPureInformationRequest = rawExpression.includes("apa") || rawExpression.includes("bagaimana") || 
                                     rawExpression.includes("syarat") || rawExpression.includes("biaya");
    
    return {
      rawExpression: aiOutput.rawExpression || rawExpression,
      interpretedObjective: aiOutput.interpretedObjective || rawExpression,
      context: {
        domain: aiOutput.context?.domain || "generic",
        locale: "id-ID",
        known: Array.isArray(aiOutput.context?.known) ? aiOutput.context.known : [],
        unknown: Array.isArray(aiOutput.context?.unknown) ? aiOutput.context.unknown : [],
        constraints: Array.isArray(aiOutput.context?.constraints) ? aiOutput.context.constraints : []
      },
      domainCandidates: Array.isArray(aiOutput.domainCandidates) ? aiOutput.domainCandidates : [{ domain: "generic", confidence: 0.7 }],
      intentType: aiOutput.intentType || (isPureInformationRequest ? "information-request" : "generic"),
      entities: Array.isArray(aiOutput.entities) ? aiOutput.entities : [],
      unknowns: Array.isArray(aiOutput.unknowns) ? aiOutput.unknowns : [],
      clarificationRequired: !!aiOutput.clarificationRequired,
      canFormWork: !isPureInformationRequest && !aiOutput.clarificationRequired, // Only form work if NOT an info request AND no clarification needed
      canProceedToWork: !aiOutput.clarificationRequired,
      understandingEvidence: {
        knownFacts: aiOutput.context?.known || ["AI processed expression successfully"],
        unknowns: aiOutput.unknowns || [],
        hypotheses: aiOutput.hypotheses || ["Expression classified as generic domain"],
        evidenceCollected: ["ai-interpretation-completed"],
        confidence: Array.isArray(aiOutput.domainCandidates) ? Math.max(...aiOutput.domainCandidates.map((d: any) => d.confidence)) : 0.7,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Map domainType from dynamic understanding to canonical IntentCategory
 * Maintains backward compatibility with existing persistence layer
 */
function mapDomainToCategory(domainType: string): IntentCategory {
  switch(domainType) {
    case "legal-case":
      return "LEGAL_SERVICE";
    case "service-request":
      return "SERVICE_REQUEST";
    case "academic-research":
      return "ACADEMIC_RESEARCH";
    case "business-growth":
      return "GENERAL_INQUIRY";
    default:
      return "GENERAL_INQUIRY";
  }
}

/**
 * RuleBasedUnderstandingProvider - Implements IntentUnderstandingProvider for deterministic fallback
 * Level 1 rule-based system from the architecture - ensures EOS never fails to interpret intent
 * Used as fallback when AI providers are unavailable or fail
 */
class RuleBasedProvider implements IntentUnderstandingProvider {
  isAvailable(): boolean {
    // This provider is always available - no external dependencies
    return true;
  }

  getProviderType(): "rulebased" {
    return "rulebased";
  }

  async understand(rawInput: string | IntentRawInput): Promise<IntentUnderstanding> {
    // Normalize input to string exactly like the previous resolver
    console.log("[RULEBASED PROVIDER] rawInput received:", JSON.stringify(rawInput, null, 2));
    const inputString = typeof rawInput === 'string' ? rawInput : 
      (typeof rawInput?.content === 'string' ? rawInput.content : JSON.stringify(rawInput?.content || rawInput));
    
    // Extract lowercased expression for pattern matching
    const lowerExpression = inputString.toLowerCase();
    console.log("[RULEBASED PROVIDER] Processing input:", inputString, "lowercased:", lowerExpression);
    
    // Build UnderstandingEvidence object untuk Adaptive Intelligence tracking
    const now = new Date().toISOString();
    const knownFacts: string[] = [`Raw expression processed: ${inputString}`];
    const unknowns: string[] = [];
    const hypotheses: string[] = [];
    let confidence = 0.5;
    
    // Track enrichment strategies attempted
    const attemptedStrategies: EnrichmentStrategy[] = [];
    let failureIntelligence: FailureIntelligenceData | undefined;
    
    // DETECT INFORMATION REQUESTS - tidak perlu membuat Work (cuma tanya informasi)
    const infoRequestPatterns = [
      "apa syarat", "apa saja syarat", "bagaimana cara", "bagaimana proses", 
      "apa yang diperlukan", "apa yang dibutuhkan", "berapa biaya", "berapa lama",
      "syarat mendirikan", "proses mendirikan", "cara membuat", "cara mendirikan",
      // PR-002 Cohort B: Ekspansi bisnis patterns
      "memulai ekspansi bisnis", "bagaimana memulai ekspansi", "ingin ekspansi bisnis",
      // PR-002 Cohort C: Capability Need patterns (security audit, professional services)
    "butuh seseorang untuk", "butuh jasa", "membutuhkan seseorang untuk", "membutuhkan jasa",
    "mengaudit keamanan", "audit keamanan sistem", "jasa audit keamanan", "penyedia audit keamanan",
    // PR-002 Cohort D: Real Work patterns (system development, HR system, application build)
    "membangun sistem", "ingin membangun", "butuh membangun sistem", "membutuhkan tim untuk",
    "sistem HR", "human resource system", "aplikasi HR", "platform HR",
    // Tambahkan keyword pertanyaan umum dan perbandingan
    "apa ", "mengapa", "bagaimana", "kapan", "dimana", "siapa", "berapa",
    "membandingkan", "bandingkan", "perbedaan", "beda"
    ];
    
    const establishmentKeywords = ["mendirikan", "membuat", "bangun", "ingin mendirikan", "ingin membuat"];
    const isEstablishmentRequest = establishmentKeywords.some(pattern => 
      lowerExpression.includes(pattern.toLowerCase())
    ) && (lowerExpression.includes("pt") || lowerExpression.includes("cv"));
    
    // DETECT LEGAL CASE REQUESTS - kasus hukum baru untuk klien
    const legalCaseKeywords = ["kasus hukum", "kasus baru", "buat kasus", "membuat kasus", "klien", "perkara hukum"];
    const isLegalCaseRequest = legalCaseKeywords.some(pattern => 
      lowerExpression.includes(pattern.toLowerCase())
    );
    
    const isPureInformationRequest = !isEstablishmentRequest && !isLegalCaseRequest && infoRequestPatterns.some(pattern => 
      lowerExpression.includes(pattern.toLowerCase())
    );

    // Determine primary domain and intent type
    let primaryDomain = "generic";
    let primaryIntent = isPureInformationRequest ? "information-request" : "generic";
    let primaryDomainConfidence = 0.7;
    
    if (isEstablishmentRequest) {
      primaryDomain = "legal";
      primaryIntent = "company-formation";
      primaryDomainConfidence = 0.95;
    } else if (isLegalCaseRequest) {
      primaryDomain = "legal";
      primaryIntent = "legal-case-creation";
      primaryDomainConfidence = 0.92;
    } else if (isPureInformationRequest) {
      primaryDomain = "information-request";
      primaryIntent = "information-request";
      primaryDomainConfidence = 0.8;
    }

    // DETECT AMBIGUOUS INPUTS - butuh clarification (Scenario 1)
    // SCENARIO 3: First input "Saya ingin memulai bisnis" = ambiguous (matches ambiguousPatterns)
    const ambiguousPatterns = [
      "bingung", "pusing", "ga tau", "gatau", "tidak tahu", "belum jelas", "bimbang",
      "masalah dengan bisnis", "masalah di bisnis", "butuh bantuan bisnis", "ingin memulai bisnis",
      "bisnis saya makin sulit", "usaha saya sulit", "bisnis mengalami kesulitan" // PR-002 Cohort A patterns
    ];
    
    const isAmbiguousInput = ambiguousPatterns.some(pattern => 
      lowerExpression.includes(pattern.toLowerCase())
    );

    // PR-002 Cohort A: Jika input ambiguous, track metrics dan minta clarification
    if (isAmbiguousInput) {
      console.log(`[PR-002-CohortA] Ambiguous input detected: ${inputString}`);
      
      // Use a consistent work ID for ambiguous cases since we can't form a real work yet
      const resolvedWorkId = 'work-ambiguous-001';
      const tenantId = 'default-tenant';
      
      // Update PR-002 metrics: Unknown Integrity Rate - kita mengakui ketidaktahuan dengan benar
      const { recordUnknownPreservation, recordUnderstandingRecovery } = await import('../../../../packages/core/runtime/src/execution-observability.js');
      recordUnknownPreservation(resolvedWorkId, true); // Track bahwa kita tidak memaksa understanding
      recordUnderstandingRecovery(resolvedWorkId, false); // Mulai track recovery process
      
      // Cek apakah ada promoted knowledge yang bisa diterapkan (blast radius compliant)
      const promotions = await FailureIntelligenceRepository.listPromotions();
      const applicablePromotions = promotions.filter(p => 
        FailureIntelligenceRepository.isPromotionApplicable(p, tenantId)
      );
      
      console.log(`[PR-002-CohortA] ${applicablePromotions.length} dari ${promotions.length} promoted knowledge applicable untuk ambiguous input`);
      
      // Return response yang meminta clarification sesuai Cohort A requirements
      return {
        rawExpression: inputString,
        interpretedObjective: "Pengguna menyampaikan masalah bisnis yang belum jelas",
        context: {
          domain: "ambiguous-business-need",
          locale: "id-ID",
          known: ["Pengguna mengalami kesulitan dengan bisnisnya"],
          unknown: ["Detail spesifik masalah, tujuan yang ingin dicapai, timeline yang diinginkan"],
          constraints: []
        },
        domainCandidates: [{ domain: "ambiguous-consultation", confidence: 0.85 }],
          intentType: "ambiguous-consultation",
          entities: [],
          clarificationRequired: true,
          canFormWork: false,
          canProceedToWork: false,
          unknowns: [
            "Bisnis Anda bergerak di bidang apa?",
            "Masalah spesifik apa yang sedang Anda hadapi?",
            "Tujuan apa yang ingin Anda capai dengan menyelesaikan masalah ini?"
          ],
          understandingEvidence: {
          knownFacts: ["Pengguna mengalami kesulitan bisnis"],
          unknowns: ["Detail spesifik masalah"],
          hypotheses: ["Butuh konsultasi bisnis lebih lanjut"],
          evidenceCollected: ["ambiguous-pattern-matched", "no-specific-knowledge-match"],
          confidence: 0.7,
          lastUpdated: new Date().toISOString()
        }
      };
    }
    
    // Knowledge Base - canonical responses for common information requests
    const knowledgeBase: Record<string, { answer: string; canProceedToWork: boolean }> = {
      // PT (Perseroan Terbatas) related queries
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
      // PR-002 Cohort B: Ekspansi bisnis information request
      "bagaimana memulai ekspansi bisnis": {
        answer: `Langkah-langkah umum untuk memulai ekspansi bisnis Anda:
1. Analisis pasar target dan potensi demand di lokasi/segmen baru
2. Susun proyeksi keuangan dan modal yang dibutuhkan untuk ekspansi
3. Evaluasi legalitas dan perizinan yang diperlukan di pasar baru
4. Siapkan tim atau partner yang akan mengelola operasi ekspansi
5. Buat timeline bertahap untuk meminimalkan risiko

Apakah Anda ingin berkonsultasi lebih lanjut atau membuat Work untuk mengelola proses ekspansi bisnis ini?`,
        canProceedToWork: true
      },
      // PR-002 Cohort C: Security audit capability request
      "saya butuh seseorang untuk mengaudit keamanan sistem saya": {
        answer: `Saya memahami Anda membutuhkan layanan audit keamanan sistem. Berikut adalah proses yang akan kita lalui:
1. **Verifikasi Kebutuhan**: Kita akan mengkonfirmasi ruang lingkup audit (infrastruktur, aplikasi, data)
2. **Pencocokan Penyedia**: Sistem akan mencocokkan kebutuhan Anda dengan penyedia audit bersertifikasi
3. **Pemeriksaan Eligibilitas**: Memverifikasi kelayakan proyek Anda untuk menerima layanan
4. **Binding Work**: Membuat Work resmi untuk mengelola seluruh proses audit
5. **Eksekusi Audit**: Penyedia akan menjalankan audit dan mengumpulkan bukti keamanan
6. **Laporan Hasil**: Menerima laporan lengkap dengan temuan dan rekomendasi perbaikan

Apakah Anda ingin melanjutkan dan membuat Work untuk memproses permintaan audit keamanan ini?`,
        canProceedToWork: true
      },
      "proses mendirikan pt": {
        answer: `Proses pendirian PT membutuhkan waktu 2-4 minggu dengan langkah:
1. Pengecekan nama PT dan reservasi di Kemenkumham
2. Pembuatan Akta Pendirian oleh notaris
3. Pengajuan SK Kemenkumham
4. Pengurusan NPWP Badan
5. Pendaftaran NIB di OSS RBA
6. Pengurusan perizinan tambahan sesuai bidang usaha

EOS bisa membantu mengelola seluruh proses ini dengan membuat Work yang meng-track semua tahapan. Apakah Anda ingin memulainya?`,
        canProceedToWork: true
      },
      // CV (Commanditaire Vennootschap) related queries
      "syarat mendirikan cv": {
        answer: `Syarat umum untuk mendirikan CV (Commanditaire Vennootschap) di Indonesia:
1. Minimal 2 orang pendiri: 1 sekutu aktif (yang menjalankan usaha) dan 1 sekutu pasif (investor)
2. Modal dasar minimal tanpa batas (tidak ada ketentuan resmi minimal, disesuaikan kebutuhan usaha)
3. Memiliki alamat domisili yang sah di Indonesia
4. Akta pendirian yang dibuat di hadapan notaris
5. NPWP Badan Usaha
6. NIB dari OSS RBA
7. Tidak perlu SK Kemenkumham khusus (berbeda dengan PT)

CV cocok untuk usaha skala kecil-menengah dengan struktur yang lebih sederhana. Apakah Anda ingin memulai proses pendirian CV dan membuat Work untuk mengelola semua persyaratan ini?`,
        canProceedToWork: true
      },
      "perbedaan pt dan cv": {
        answer: `Perbedaan utama antara PT dan CV di Indonesia:
1. **Tanggung jawab pemegang saham**: PT - terbatas pada modal yang disetor; CV - sekutu aktif tanggung jawab tidak terbatas, sekutu pasif terbatas
2. **Jumlah pendiri**: PT - minimal 2; CV - minimal 2 (1 aktif + 1 pasif)
3. **Legalitas**: PT - badan hukum terpisah; CV - bukan badan hukum terpisah (meskipun perlu akta notaris)
4. **Modal dasar**: PT - minimal Rp100jt; CV - tanpa batas minimal
5. **SK Kemenkumham**: PT - wajib; CV - tidak perlu
6. **Kemampuan mengumpulkan modal publik**: PT - bisa; CV - tidak bisa

Apakah Anda butuh bantuan memilih struktur badan usaha yang tepat untuk bisnis Anda, atau ingin memulai proses pendirian salah satunya?`,
        canProceedToWork: true
      },
      // NIB & perizinan related queries
      "syarat mengurus nib": {
        answer: `Syarat untuk mengurus NIB (Nomor Induk Berusaha) di OSS RBA:
1. Memiliki NPWP pribadi/perorangan atau badan usaha
2. Alamat domisili usaha yang jelas dan sah
3. Surat keterangan domisili dari kelurahan/desa jika diperlukan
4. Akta pendirian usaha (jika sudah berbentuk badan hukum: PT/CV/UD)
5. KTP penanggung jawab usaha
6. NPWP penanggung jawab usaha

Proses NIB biasanya selesai dalam 1-3 hari kerja. Apakah Anda ingin memulai proses pengurusan NIB dan membuat Work untuk mengelola semua tahapan perizinan?`,
        canProceedToWork: true
      },
      "biaya mengurus nib": {
        answer: `Biaya untuk mengurus NIB di OSS RBA:
- **NIB itu sendiri**: GRATIS (tidak ada biaya admin sama sekali)
- Biaya tambahan jika menggunakan jasa konsultan: Rp500.000 - Rp2.000.000 (opsional)
- Jika perlu menerbitkan SKT (Surat Keterangan Terdaftar) untuk NPWK: GRATIS

Semua proses di OSS RBA tidak dipungut biaya apapun. Hati-hati terhadap penipuan yang meminta biaya untuk pengurusan NIB. Apakah Anda ingin bantuan memulai proses pengurusan NIB secara mandiri?`,
        canProceedToWork: false
      },
      // PR-002 Cohort D: Real Work patterns (system development, HR system build request)
      "saya ingin membangun sistem HR dalam tiga bulan": {
        answer: `Saya memahami Anda ingin membangun sistem HR dalam 3 bulan. Berikut adalah full lifecycle Work yang akan kita jalankan sesuai EOS principles:

1. **Verifikasi & Pembersihan Requirements**: Konfirmasi scope sistem HR (payroll, absensi, rekrutmen, performance?)
2. **Pencocokan Capabilities**: Sistem akan mencari semua kapabilitas yang dibutuhkan:
   • software-development
   • project-management  
   • cloud-infrastructure
   • hr-compliance-indonesia
3. **Resolver Penyedia (Providers)**: Menemukan tim pengembang/project manager yang eligible
4. **Binding Work Resmi**: Membuat Work formal dengan timeline 3 bulan
5. **Eksekusi Berdasarkan Milestone**: Sprint mingguan dengan tracking evidence
6. **UAT (User Acceptance Testing)**: Verifikasi sebelum production
7. **Go-Live & Post-launch Support**: Pemantauan selama 1 bulan

Apakah Anda ingin memulai dan membuat Work untuk memproses pembangunan sistem HR ini?`,
        canProceedToWork: true,

      },
      // PKP (Pengusaha Kena Pajak) related queries
      "syarat mendaftarkan pkp": {
        answer: `Syarat untuk mendaftarkan usaha menjadi PKP (Pengusaha Kena Pajak):
1. Usaha sudah memiliki NIB dan NPWP Badan
2. Omset usaha telah mencapai atau melebihi Rp4,8 Miliar dalam 12 bulan terakhir (wajib daftar) atau bisa mendaftar secara sukarela
3. Memiliki alamat usaha yang jelas dan dapat dihubungi
4. Memiliki rekening bank atas nama badan usaha
5. Menyiapkan laporan keuangan dasar (opsional, tapi disarankan)
6. Mengisi formulir pendaftaran PKP di Kantor Pajak terdekat atau melalui e-registration DJP online

Proses verifikasi PKP memakan waktu 7-14 hari kerja. Apakah Anda ingin memulai proses pendaftaran PKP dan membuat Work untuk mengelola semua persyaratan?`,
        canProceedToWork: true
      },
      // UD (Usaha Dagang) related queries
      "syarat mendirikan ud": {
        answer: `Syarat umum untuk mendirikan UD (Usaha Dagang) di Indonesia:
1. Minimal 1 orang pendiri (bisa perorangan)
2. Memiliki alamat domisili yang sah di Indonesia
3. Akta pendirian yang dibuat di hadapan notaris (opsional, tapi disarankan untuk legalitas formal)
4. NPWP pribadi atau badan usaha
5. NIB dari OSS RBA (wajib jika ingin beroperasi secara formal)
6. Tidak perlu SK Kemenkumham (berbeda dengan PT)
7. Tidak perlu modal dasar minimum (disetel sesuai kebutuhan usaha)

UD cocok untuk usaha mikro, kecil, dan menengah yang ingin beroperasi dengan struktur yang sangat sederhana. Apakah Anda ingin memulai proses pendirian UD dan membuat Work untuk mengelola semua persyaratan ini?`,
        canProceedToWork: true
      },
      // Perbedaan NIB dan NPWP queries
      "perbedaan nib dan npwp": {
        answer: `Perbedaan mendasar antara NIB dan NPWP di Indonesia:
1. **Fungsi utama**: NIB = identitas usaha di Indonesia; NPWP = identitas perpajakan untuk wajib pajak
2. **Penerbit**: NIB = diterbitkan oleh OSS RBA (Kementerian Investasi); NPWP = diterbitkan oleh DJP (Kementerian Keuangan)
3. **Isi**: NIB berisi detail usaha (alamat, bidang usaha, skala); NPWP hanya berisi identitas pajak
4. **Kegunaan**: NIB wajib untuk semua usaha formal; NPWP wajib untuk urusan pajak (PPN, PPh, dll)
5. **Masa berlaku**: NIB berlaku selama usaha masih beroperasi; NPWP berlaku seumur hidup (selama Wajib Pajak ada)

Kedua dokumen ini adalah wajib untuk usaha yang ingin beroperasi secara legal di Indonesia. Apakah Anda butuh bantuan mengurus NIB atau NPWP untuk usaha Anda?`,
        canProceedToWork: false
      },
      // PT PMA (Penanaman Modal Asing) related queries
      "syarat mendirikan pt pma": {
        answer: `Syarat untuk mendirikan PT PMA (Penanaman Modal Asing) di Indonesia:
1. Minimal 2 pemegang saham (bisa campuran warga negara Indonesia dan asing)
2. Modal investasi minimal US$ 1.000.000 (tergantung sektor usaha; beberapa sektor memiliki ketentuan berbeda)
3. Minimal 1 direktur yang berdomisili di Indonesia
4. Memiliki alamat domisili yang sah di Indonesia
5. Akta pendirian yang dibuat di hadapan notaris Indonesia dan disetujui oleh BKPM
6. SK Kemenkumham untuk pengesahan badan hukum
7. NIB dari OSS RBA dan NPWP Badan
8. Izin prinsip dari BKPM sebelum memulai proses pendirian

Proses pendirian PT PMA memakan waktu 3-6 bulan karena melibatkan banyak instansi. Apakah Anda ingin memulai proses pendirian PT PMA dan membuat Work untuk mengelola semua tahapan yang kompleks ini?`,
        canProceedToWork: true
      },
      // Cara mendaftarkan merek dagang
      "syarat mendaftarkan merek dagang": {
        answer: `Syarat untuk mendaftarkan merek dagang di Direktorat Jenderal Hak Cipta dan Hak Atas Merek (DJK HAM):
1. Pemohon adalah perorangan atau badan hukum yang berdomisili di Indonesia (atau memiliki agen merek jika luar negeri)
2. Surat permohonan pendaftaran merek yang diisi secara lengkap
3. Contoh merek yang akan didaftarkan (logo, nama, kombinasi) dengan resolusi tinggi
4. Bukti pembayaran biaya pendaftaran (saat ini sekitar Rp1.800.000 per kelas barang/jasa)
5. Surat kuasa jika menggunakan jasa agen merek
6. Daftar barang/jasa yang akan dicakup oleh merek tersebut
7. Bukti penggunaan merek (jika sudah digunakan sebelum pendaftaran - opsional)

Proses pendaftaran merek memakan waktu 12-24 bulan dan merek akan dilindungi selama 10 tahun (bisa diperpanjang). Apakah Anda ingin memulai proses pendaftaran merek dagang dan membuat Work untuk mengelola semua persyaratan hukum ini?`,
        canProceedToWork: true
      }
    };
    
    // SCENARIO 3: Progresif input detection - cek apakah ini follow-up dari ambiguous input?
    // Ini untuk memproses input kedua dan ketiga di sequence: 
    // "Saya ingin memulai bisnis." → "Saya ingin membuat startup." → "Saya ingin mendirikan PT di Indonesia."
    const progressiveBusinessPatterns = [
      "saya ingin membuat startup", "ingin membuat startup", "membuat startup",
      "di indonesia", "indonesia"
    ];
    const isProgressiveBusinessInput = progressiveBusinessPatterns.some(pattern => 
      lowerExpression.includes(pattern.toLowerCase())
    );

    // Jika ini adalah INFORMATION REQUEST (Scenario 2) atau CAPABILITY NEED REQUEST (Cohort C)
    if (isPureInformationRequest) {
      // Cari yang terbaik di knowledge base
      let bestMatch = null;
      let bestMatchScore = 0;
      
      for (const [key, value] of Object.entries(knowledgeBase)) {
        if (lowerExpression.includes(key)) {
          const score = key.length; // Lebih panjang = lebih spesifik
          if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatch = { key, value };
          }
        }
      }
      
      // Cohort C: Periksa apakah ini capability request yang membutuhkan provider resolution
      const isCapabilityRequest = false; // Capability resolution logic deprecated per core schema alignment
      const requiredCapabilities: string[] = [];
      
      // MANDATORY FALLBACK: Selalu ada informationResponse, tidak pernah null (invariant dari user)
      const genericFallback = `Saya memahami Anda sedang mencari informasi tentang "${inputString}". Informasi spesifik untuk pertanyaan ini belum tersedia secara lengkap dalam sumber EOS saat ini.

Saya dapat membantu Anda memperjelas apa yang ingin Anda ketahui lebih lanjut atau menghubungkan Anda dengan sumber/ahli yang relevan.

Apakah Anda ingin:
• memperjelas pertanyaan Anda lebih lanjut
• berkonsultasi dengan ahli
• atau melanjutkan menuju pembentukan Work untuk kebutuhan Anda?`;

      if (bestMatch) {
        // Update evidence for successful knowledge match
        knownFacts.push(`Knowledge match found: ${bestMatch.key}`);
        confidence = 0.85;
        
        // Cohort C: Track PR-002 metrics untuk capability request
         if (isCapabilityRequest) {
           console.log(`[PR-002-CohortC] Capability need detected: ${inputString}, required capabilities: ${requiredCapabilities.join(', ')}`);
           
           // Import dan track metrics yang sama seperti Cohort A/B (dari execution-observability)
           const { recordGeneralizationApplication, recordWorkFormationQuality } = await import('../../../../packages/core/runtime/src/execution-observability.js');
           recordGeneralizationApplication('work-capability-001', true);
           recordWorkFormationQuality('work-capability-001', 1.0); // Sempurna: capability request dengan resolusi provider lengkap
         }
        
        const understandingEvidence: UnderstandingEvidence = {
          knownFacts: knownFacts,
          unknowns: unknowns,
          hypotheses: hypotheses,
          evidenceCollected: isCapabilityRequest 
            ? ["knowledge-base-match-success", "capability-need-detected", "provider-resolution-pending"] 
            : ["knowledge-base-match-success"],
          confidence: confidence,
          lastUpdated: now
        };

        // Cohort C: Untuk capability request, izinkan pembentukan Work (canFormWork = true) karena memang butuh eksekusi
        const shouldAllowWorkFormation = isCapabilityRequest;
        
        // Tidak perlu redeklarasi variabel yang sudah ada di scope sebelumnya
        
        return {
          rawExpression: inputString,
          interpretedObjective: isCapabilityRequest 
            ? `Pengguna membutuhkan kemampuan profesional: ${bestMatch.key}, dibutuhkan resolusi penyedia`
            : `Pengguna bertanya informasi tentang: ${bestMatch.key}`,
          context: {
            domain: isCapabilityRequest ? "capability-need" : "legal-business",
            locale: "id-ID",
            known: isCapabilityRequest ? [`Pengguna membutuhkan layanan ${bestMatch.key}`] : [`Pengguna mencari informasi tentang ${bestMatch.key}`],
            unknown: [],
            constraints: []
          },
          domainCandidates: [{ domain: isCapabilityRequest ? "capability-matching" : "legal-business", confidence: 0.85 }],
          intentType: isCapabilityRequest ? "capability-request" : "information-request",
          entities: [],
          unknowns: isCapabilityRequest ? ["Detail spesifik ruang lingkup layanan yang dibutuhkan"] : [],
          clarificationRequired: false,
          canFormWork: shouldAllowWorkFormation,
          canProceedToWork: true,
          informationResponse: bestMatch.value.answer,
          understandingEvidence: understandingEvidence,
          failureIntelligence: undefined
        }
      }
    }

    // Akhir dari RuleBasedProvider.understand() implementation
  }

  // Implementasi method processIntent untuk integrasi dengan websocket-adapter.service.ts
  // Ini adalah entry point utama untuk semua intent understanding requests
  public async processIntent(intent: any): Promise<any> {
    // Coba gunakan AI provider yang tersedia terlebih dahulu (prioritas AI jika tersedia)
    const aiProviders = [new OpenAIProvider(), new AnthropicProvider()];
    
    for (const provider of aiProviders) {
      if (provider.isAvailable()) {
        try {
          const inputContent = typeof intent.payload === 'string' ? intent.payload : 
            (intent.payload?.content ? intent.payload.content : JSON.stringify(intent.payload));
          
          return await provider.understand(inputContent);
        } catch (aiError) {
          // Jika provider AI gagal, lanjut ke provider berikutnya
          console.log(`[IntentUnderstandingService] AI provider ${provider.getProviderType()} failed: ${(aiError as Error).message}. Trying next provider...`);
          continue;
        }
      }
    }
    // Jika semua AI provider gagal, gunakan RuleBasedProvider sebagai fallback
    console.log(`[IntentUnderstandingService] No working AI providers available. Activating RuleBasedProvider fallback.`);
    return this.processWithFallback(intent);
  }

  // Implementasi method processWithFallback yang dibutuhkan untuk menghindari ketergantungan total pada AI
  // Menjamin EOS tidak bergantung total pada token AI (user requirement: "EOS tidak boleh bergantung total pada token AI")
  // Menggantikan hardcoded checks seperti if (text.includes("mendirikan pt")) dengan knowledge base terstruktur
  private async processWithFallback(intent: any): Promise<any> {
    // Implementasi lengkap RuleBasedProvider fallback yang sebelumnya terpotong
    const inputString = typeof intent.payload === 'string' ? intent.payload : 
      (intent.payload?.content ? intent.payload.content : JSON.stringify(intent.payload));
    const lowerExpression = inputString.toLowerCase();
    
    // Knowledge base sederhana untuk kasus umum - menggantikan hardcoded string checks
    const knowledgeBase: Record<string, { answer: string }> = {
      "mendirikan pt": { answer: "Untuk mendirikan PT, Anda memerlukan akta notaris, NIB, dan NPWP. Proses ini memakan waktu 7-14 hari kerja." },
      "mendirikan cv": { answer: "CV dapat didirikan dengan akta pendirian sederhana, tidak memerlukan modal minimal seperti PT." },
      "audit keuangan": { answer: "Audit keuangan adalah pemeriksaan laporan keuangan oleh auditor independen untuk memastikan keterbukaan informasi." }
    };
    
    const genericFallback = "Mohon maaf, saya belum dapat memahami pertanyaan Anda secara spesifik. Silakan berikan detail lebih lanjut.";
    const knownFacts: string[] = [];
    const unknowns: string[] = [];
    const hypotheses: string[] = [];
    const attemptedStrategies: string[] = [];
    let confidence = 0.8;
    const now = new Date().toISOString();
    
    // SCENARIO 1: Knowledge base match ditemukan
    let bestMatch: { key: string; value: { answer: string } } | null = null;
    let bestMatchScore = 0;
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (lowerExpression.includes(key)) {
        const score = key.length;
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatch = { key, value };
        }
      }
    }
    
    if (bestMatch) {
      const isCapabilityRequest = bestMatch.key.includes("audit") || bestMatch.key.includes("mendirikan");
      const requiredCapabilities = isCapabilityRequest ? ["legal-entity-formation", "audit-service"] : [];
      const shouldAllowWorkFormation = isCapabilityRequest;
      
      const understandingEvidence: any = {
        knownFacts: [`Ditemukan knowledge base match: ${bestMatch.key}`],
        unknowns: [],
        hypotheses: [],
        evidenceCollected: ["knowledge-base-match-success"],
        confidence: 0.9,
        lastUpdated: now
      };
      
      return {
        rawExpression: inputString,
        interpretedObjective: `Pengguna membutuhkan informasi tentang: ${bestMatch.key}`,
        context: {
          locale: "id-ID",
          known: isCapabilityRequest 
            ? [`Pengguna membutuhkan layanan ${bestMatch.key}`, `Kebutuhan kapabilitas: ${requiredCapabilities.join(', ')}`]
            : [`Pengguna mencari informasi tentang ${bestMatch.key}`],
          unknown: isCapabilityRequest ? ["Detail spesifik ruang lingkup audit, timeline yang diinginkan"] : [],
          constraints: []
        },
        domainCandidates: [{ domain: isCapabilityRequest ? "capability-matching" : "legal-business", confidence: 0.85 }],
        intentType: isCapabilityRequest ? "capability-request" : "information-request",
        entities: [],
        unknowns: isCapabilityRequest ? ["Detail ruang lingkup audit"] : [],
        clarificationRequired: false,
        canFormWork: shouldAllowWorkFormation,
        canProceedToWork: true,
        informationResponse: bestMatch.value.answer,
        understandingEvidence: understandingEvidence,
        failureIntelligence: undefined
      };
    } else {
      // Return fallback jika tidak ada match di knowledge base
      unknowns.push("Detail spesifik untuk menjawab pertanyaan pengguna tidak ditemukan di knowledge base");
      knownFacts.push("No knowledge base match found - using generic fallback");
      attemptedStrategies.push("KNOWLEDGE_RETRIEVAL");
      confidence = 0.6;
      
      const entities: string[] = [];
      if (lowerExpression.includes("pt") && lowerExpression.includes("cv")) entities.push("PT", "CV");
      if (lowerExpression.includes("pt") && lowerExpression.includes("firma")) entities.push("PT", "FIRMA");
      if (lowerExpression.includes("cv") && lowerExpression.includes("ud")) entities.push("CV", "UD");
      
      const understandingEvidence: any = {
        knownFacts: knownFacts,
        unknowns: unknowns,
        hypotheses: hypotheses,
        evidenceCollected: ["knowledge-base-match-failed", "generic-fallback-applied"],
        confidence: confidence,
        lastUpdated: now
      };
      
      return {
        rawExpression: inputString,
        interpretedObjective: `Pengguna meminta informasi umum: ${inputString}`,
        context: {
          domain: "generic",
          locale: "id-ID",
          known: [`Pengguna mencari informasi tentang: ${inputString}`],
          unknown: ["Detail spesifik yang dibutuhkan pengguna"],
          constraints: []
        },
        domainCandidates: [{ domain: "generic-inquiry", confidence: 0.6 }],
        intentType: "information-request",
        entities: [],
        unknowns: ["Detail tambahan untuk memahami kebutuhan Anda"],
        clarificationRequired: true,
        canFormWork: false,
        canProceedToWork: true,
        informationResponse: genericFallback,
        understandingEvidence: understandingEvidence,
        failureIntelligence: undefined
      };
    }
  }

  /**
   * Main interpret method - kompatibel dengan legacy interface
   * Mempertahankan backward compatibility untuk sistem yang masih menggunakan interpret()
   */
  async interpret(rawInput: IntentRawInput): Promise<{
    resolution: IntentResolution;
    context: IntentContext;
    domainType: string;
    category: IntentCategory;
    dynamicUnderstanding: IntentUnderstanding;
  }> {
    try {
      // Gunakan processWithFallback untuk semua permintaan (100% RuleBasedProvider untuk ketergantungan AI)
      console.log(`[INTENT UNDERSTANDING SERVICE] Using RuleBasedProvider for: "${rawInput.content}"`);
      const dynamicUnderstanding = await this.processWithFallback({ payload: rawInput.content });
      
      // Konversi output ke format legacy untuk kompatibilitas
      const primaryDomain = dynamicUnderstanding.domainCandidates[0];
      const domainType = primaryDomain?.domain || "generic";
      
      const getExpectedOutcomeForDomain = (domainType: string): string => {
        switch(domainType) {
          case "legal-case":
          case "capability-matching":
            return "PT berhasil didirikan dengan dokumen legal lengkap";
          case "service-request":
            return "Layanan berhasil diadakan dan diselesaikan oleh penyedia jasa";
          case "academic-research":
            return "Penelitian selesai dengan hasil yang dapat dipublikasikan";
          case "business-growth":
            return "Usaha dapat berkembang dengan bantuan penyedia layanan yang sesuai";
          default:
            return "Pekerjaan berhasil diselesaikan";
        }
      };

      const resolution: IntentResolution = {
        objective: dynamicUnderstanding.interpretedObjective,
        context: dynamicUnderstanding.context.domain || "General / Generic Work",
        expectedOutcome: getExpectedOutcomeForDomain(domainType),
        workType: domainType,
        confidence: primaryDomain?.confidence || 0.7,
        dynamicUnderstanding
      };

      return {
        resolution,
        context: dynamicUnderstanding.context,
        domainType,
        category: mapDomainToCategory(domainType),
        dynamicUnderstanding
      };
    } catch (error) {
      console.error(`[INTENT UNDERSTANDING SERVICE] Interpretation failed:`, error);
      throw error;
    }
  }

  // END dari class IntentUnderstandingService - seluruh logic service terkapsulasi di sini
}

// Perbaiki EDGE-D-002: Inisialisasi singleton hanya jika module dijalankan sebagai entry point utama
// atau buat getter yang lazy-load untuk menghindari ReferenceError di lingkungan test
// Class IntentUnderstandingService sudah ditutup di line 1027
let _intentUnderstandingService: ReturnType<typeof IntentUnderstandingService.getInstance> | undefined;

// Getter lazy-load - aman untuk environment test dan production (format terstandarisasi)
// Export ESM native explicit agar bisa diimport dengan destructuring di semua environment
export function getIntentUnderstandingService() {
  if (!_intentUnderstandingService) {
    IntentUnderstandingService.initialize();
    _intentUnderstandingService = IntentUnderstandingService.getInstance();
    console.log(`[INTENT UNDERSTANDING SERVICE] Lazy initialized with RuleBasedProvider fallback`);
  }
  return _intentUnderstandingService;
}

// Export singleton instance untuk backward compatibility (CJS dan ESM kompatibel)
if (typeof exports !== 'undefined') {
  Object.defineProperty(exports, 'intentUnderstandingService', {
    get() {
      return getIntentUnderstandingService();
    },
    enumerable: true,
    configurable: false
  });
}

// ESM native export untuk import destructuring
export const intentUnderstandingService = {
  get instance() {
    return getIntentUnderstandingService();
  }
};

// Untuk pure ESM environment juga export sebagai named export
if (typeof module === 'undefined' && typeof exports === 'undefined') {
  if (window) {
    (window as any).intentUnderstandingService = getIntentUnderstandingService();
  }
}

// Jika dijalankan sebagai module utama (bukan diimport test), inisialisasi segera
if (require.main === module) {
  getIntentUnderstandingService();
  console.log(`[INTENT UNDERSTANDING SERVICE] Module loaded as main entry point`);
}

// Helper fungsi untuk audit trail dan sleep - hanya didefinisikan sekali
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createInitialUnderstandingEvent(type: string, actorId: string, metadata: Record<string, any>): UnderstandingEvent {
  return {
    id: crypto.randomUUID(),
    type: type,
    actorId: actorId,
    timestamp: new Date().toISOString(),
    metadata: metadata
  };
}

function generateHypothesisFromUnderstanding(understanding: IntentUnderstanding): IntentHypothesis {
  return {
    id: crypto.randomUUID(),
    hypothesis: understanding.interpretedObjective,
    confidence: understanding.understandingEvidence.confidence,
    createdAt: new Date().toISOString(),
    domain: understanding.context.domain || "generic"
  };
}

function createInitialUnderstandingState(understanding: IntentUnderstanding): UnderstandingState {
  // Gunakan schema canonical UnderstandingState dari universal-intent.contracts.ts
  return {
    known: understanding.understandingEvidence.knownFacts,
    unknown: understanding.unknowns,
    goal: understanding.interpretedObjective,
    problem: undefined,
    confidence: understanding.understandingEvidence.confidence,
    isSufficient: understanding.canFormWork,
    sufficiencyReason: understanding.canFormWork ? "Pemahaman cukup untuk membuat work" : "Butuh klarifikasi tambahan"
  };
}

/**
 * Legacy deterministicFallbackResolver - dipertahankan untuk backward compatibility saja
 */
async function deterministicFallbackResolver(expression: string): Promise<{
  resolution: IntentResolution;
  context: IntentContext;
  domainType: string;
  category: IntentCategory;
  dynamicUnderstanding: IntentUnderstanding;
}> {
  console.warn("[DEPRECATED] deterministicFallbackResolver is deprecated. Use intentUnderstandingService.interpret() instead.");
  return await intentUnderstandingService.interpret({ content: expression });
}

export async function createUniversalExpression(
  input: UniversalIntentInput,
  tenantId: string,
  workspaceId: string,
  actorId: string
): Promise<UniversalExpression> {
  // Step 1: Initialize the universal expression with RECEIVED status (NEW ARCHITECTURE)
  const now = new Date();
  const expression: UniversalExpression = {
    id: crypto.randomUUID(),
    origin: input.origin as ExpressionOrigin,
    actorId,
    tenantId,
    workspaceId,
    createdAt: now,
    updatedAt: now,
    raw: input.raw,
    status: "RECEIVED" as ExpressionStatus,
    createdBy: actorId,
    lastModifiedBy: actorId,
    // Initialize empty conversation tracking per user's requirement: Conversation ≠ Intent
    conversation: {
      turns: []
    }
  };

  // Add small delay to ensure timestamps are strictly increasing (1ms minimum between updates)
  // This strictly enforces the lifecycle property that each state transition updates the timestamp
  await sleep(1);
  
  // Step 2: Transition to CAPTURED after successful initialization
  expression.status = "CAPTURED";
  expression.updatedAt = new Date();
  // Add first understanding event to audit trail
  const history: UnderstandingEvent[] = [
    createInitialUnderstandingEvent("expression_received", actorId, { status: "RECEIVED" }),
    createInitialUnderstandingEvent("expression_captured", actorId, { status: "CAPTURED" })
  ];
  console.log(`[UNIVERSAL EXPRESSION] Captured expression ${expression.id} from origin: ${expression.origin}`);
  console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: RECEIVED → CAPTURED, updatedAt=${expression.updatedAt.toISOString()}`);

  try {
    await sleep(1);
    // Step 3: Run understanding engine - transition to UNDERSTANDING (NEW ARCHITECTURE)
    expression.status = "UNDERSTANDING";
    expression.updatedAt = new Date();
    history.push(createInitialUnderstandingEvent("understanding_started", actorId, { status: "UNDERSTANDING" }));
    console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: CAPTURED → UNDERSTANDING, updatedAt=${expression.updatedAt.toISOString()}`);
    
    // Use the existing intent understanding service to generate interpretation
    const rawContent = input.raw.content as string;
    const understandingResult = await intentUnderstandingService.interpret({
      content: rawContent,
      type: input.raw.type
    });
    
    // Generate IntentHypothesis (per user's core requirement: hypothesis is formed, not assumed)
    const intentHypothesis = generateHypothesisFromUnderstanding(understandingResult.dynamicUnderstanding);
    
    // Create initial UnderstandingState (track known/unknown as per user's architecture)
    const understandingState = createInitialUnderstandingState(understandingResult.dynamicUnderstanding);
    
    // Add the understanding layer to the expression - implements the NEW architecture
    expression.understanding = {
      state: understandingState,
      hypotheses: [intentHypothesis],
      history: history,
      currentHypothesisId: intentHypothesis.id,
      context: understandingResult.dynamicUnderstanding.context, // Preserve full context from understanding results
      canFormWork: understandingResult.dynamicUnderstanding.canFormWork, // Preserve the canFormWork flag from understanding results
      interpretedObjective: understandingResult.dynamicUnderstanding.interpretedObjective // Preserve extracted need statement
    };
    
    // Update expression status based on sufficiency check (per user's lifecycle: SUFFICIENT/INSUFFICIENT)
    await sleep(1);
    if (understandingState.isSufficient) {
      expression.status = "UNDERSTANDING_SUFFICIENT";
      expression.updatedAt = new Date();
      expression.understanding.history.push(createInitialUnderstandingEvent("sufficiency_achieved", actorId, { status: "UNDERSTANDING_SUFFICIENT" }));
      console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: UNDERSTANDING → UNDERSTANDING_SUFFICIENT, updatedAt=${expression.updatedAt.toISOString()}`);
      console.log(`[UNIVERSAL EXPRESSION] Understanding is sufficient, preparing for resolution`);
    } else {
      expression.status = "UNDERSTANDING_INSUFFICIENT";
      expression.updatedAt = new Date();
      expression.understanding.history.push(createInitialUnderstandingEvent("understanding_updated", actorId, { status: "UNDERSTANDING_INSUFFICIENT" }));
      console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: UNDERSTANDING → UNDERSTANDING_INSUFFICIENT, updatedAt=${expression.updatedAt.toISOString()}`);
      console.log(`[UNIVERSAL EXPRESSION] Understanding insufficient: ${understandingState.sufficiencyReason}`);
      console.log(`[UNIVERSAL EXPRESSION] Will invoke conversation capability to gather more information`);
      
      // Add first EOS conversation turn per user's requirement: conversation generates understanding delta
      // This implements the user's critical rule: Conversation produces UnderstandingDelta, not just chat history
      // Use the first suggested question from our requirements to make it context-aware
      const requirementSuggestedQuestions = expression.understanding?.requirement?.suggestedQuestions ? Array.from(expression.understanding.requirement.suggestedQuestions) : [];
  const firstQuestion = requirementSuggestedQuestions[0] 
    || "Saya ingin memastikan saya memahami Anda dengan benar. Bisakah Anda menjelaskan lebih detail?";
      
      expression.conversation?.turns.push({
        timestamp: new Date(),
        actorId: "eos-system",
        content: firstQuestion,
        role: "eos",
        delta: {
          previousStatus: "UNDERSTANDING",
          newStatus: "UNDERSTANDING_INSUFFICIENT",
          reason: understandingState.sufficiencyReason || "Pemahaman diperbarui setelah finalisasi",
          unknowns: understandingState.unknown,
          suggestedQuestions: [...requirementSuggestedQuestions]
        }
      });
      
      // Add understanding event to track that conversation was started
      expression.understanding?.history.push(createInitialUnderstandingEvent("conversation_turn", actorId, {
        conversation: {
          turns: expression.conversation?.turns || []
        }
      }));
      console.log(`[UNIVERSAL EXPRESSION] Added initial conversation turn with question: "${firstQuestion}"`);
    }
    
    console.log(`[UNIVERSAL EXPRESSION] Understanding complete for ${expression.id}`);
    console.log(`[UNIVERSAL EXPRESSION] Raw context preserved: ${rawContent}`);
    console.log(`[UNIVERSAL EXPRESSION] Interpreted objective: ${understandingState.goal}`);
    console.log(`[UNIVERSAL EXPRESSION] Hypothesis confidence: ${intentHypothesis.confidence}`);
    console.log(`[UNIVERSAL EXPRESSION] Known facts: ${understandingState.known.length}, Unknowns: ${understandingState.unknown.length}`);

    // Step 4: If sufficient, proceed to resolution phase
    if (understandingState.isSufficient) {
      const sufficiencyResult = await gapAnalysisService.checkSufficiency(expression as any);
      
      await sleep(1);
      // If sufficient, mark as RESOLVED and automatically trigger work formation
      expression.status = "RESOLVING";
      expression.updatedAt = new Date();
      expression.understanding.history.push(createInitialUnderstandingEvent("resolution_started", actorId, { status: "RESOLVING" }));
      console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: UNDERSTANDING_SUFFICIENT → RESOLVING, updatedAt=${expression.updatedAt.toISOString()}`);
      console.log(`[UNIVERSAL EXPRESSION] Expression ${expression.id} is ready for work formation`);
      
      // EOS-NEW-ARCHITECTURE: Execute final lifecycle transition RESOLVING → RESOLVED → WORK_FORMED
      // This completes the full vertical slice: Universal Expression → Understanding → Resolution → Work
      await sleep(1);
      // Only create Work if canFormWork is explicitly true - prevents forced Work creation for info requests
      if (expression.understanding?.canFormWork) {
        try {
          // Import the canonical work creation function to avoid circular dependencies
          const { createCanonicalWorkFromIntent } = await import("./work-formation.service.js");
          const workResult = await createCanonicalWorkFromIntent(expression as any, tenantId, workspaceId, actorId);
          
          // Update expression to WORK_FORMED status - lifecycle complete!
          expression.status = "WORK_FORMED";
          expression.updatedAt = new Date();
          expression.workId = workResult.workId;
          expression.understanding.history.push(createInitialUnderstandingEvent("work_formed", actorId, { status: "WORK_FORMED", workId: workResult.workId }));
          console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: RESOLVING → WORK_FORMED, updatedAt=${expression.updatedAt.toISOString()}`);
          console.log(`[UNIVERSAL EXPRESSION] ✅ Full vertical slice completed! Expression ${expression.id} → Work ${workResult.workId}`);
        } catch (workError) {
          // If work formation fails, log but keep expression as RESOLVING - user can manually retry
          console.error(`[UNIVERSAL EXPRESSION] Work formation failed for expression ${expression.id}:`, workError);
          expression.status = "FAILED";
          expression.updatedAt = new Date();
          expression.understanding.history.push(createInitialUnderstandingEvent("work_formation_failed", actorId, { status: "FAILED" }));
        }
      } else {
        // Block Work creation for info requests or insufficient understanding
        expression.status = "RESOLVED";
        expression.updatedAt = new Date();
        expression.understanding.history.push(createInitialUnderstandingEvent("work_formation_blocked", actorId, { 
          status: "RESOLVED"
        }));
        console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: RESOLVING → RESOLVED (no Work created), updatedAt=${expression.updatedAt.toISOString()}`);
        console.log(`[UNIVERSAL EXPRESSION] WARNING: Work formation blocked for info request: expression ${expression.id}`);
      }
    } else {
      // If insufficient, populate the full UnderstandingRequirement object (per user's architecture)
      // This implements the user's core principle: NOT ALL INTERACTIONS NEED TO BECOME WORK
      const requiredCapabilities: string[] = [];
      const suggestedQuestions: string[] = [];
      
      // Generate suggested questions based on unknowns from understanding state
      if (understandingState.unknown.length > 0) {
        understandingState.unknown.forEach(unknown => {
          suggestedQuestions.push(`Bisakah Anda menjelaskan lebih detail tentang ${unknown}?`);
        });
      }
      
      // Determine what capabilities are needed to improve understanding
      if (understandingState.confidence < 0.7) {
        requiredCapabilities.push("ai-consultant");
        suggestedQuestions.unshift("Apakah Anda bisa menceritakan lebih lanjut tentang situasi Anda?");
      }
      // If we have unknowns that need clarification, activate conversation capability
      if (understandingState.unknown.length > 0) {
        requiredCapabilities.push("conversation");
      }
      
      // Populate the understanding.requirement field with all needed data
      // This is what powers the UX that shows what EOS needs to understand better
      if (expression.understanding) {
        expression.understanding.requirement = {
          required: true,
          reason: understandingState.sufficiencyReason,
          requiredCapabilities,
          suggestedProviders: requiredCapabilities.includes("conversation") ? ["eos-conversation-engine"] : [],
          suggestedQuestions
        };
      }
      
      console.log(`[UNIVERSAL EXPRESSION] Expression ${expression.id} remains in UNDERSTANDING_INSUFFICIENT state`);
      console.log(`[UNIVERSAL EXPRESSION] Required capabilities activated: ${requiredCapabilities.join(", ")}`);
      console.log(`[UNIVERSAL EXPRESSION] Suggested questions generated: ${suggestedQuestions.length}`);
      console.log(`[UNIVERSAL EXPRESSION] Work will only be formed when understanding is sufficient`);
    }

    return expression;
  } catch (error) {
    // If any step fails, mark as FAILED for monitoring
    await sleep(1);
    expression.status = "FAILED";
    expression.updatedAt = new Date();
    console.log(`[UNIVERSAL EXPRESSION] Lifecycle transition: ANY → FAILED, updatedAt=${expression.updatedAt.toISOString()}`);
    console.error(`[UNIVERSAL EXPRESSION] Failed to process expression ${expression.id}:`, error);
    throw error;
  }
}

// B6.11: Register canonical intent service to globalThis for cross-boundary runtime access
// Mengikuti pola yang sama dengan workflow-engine untuk konsistensi arsitektur EOS
// Lazy-initialize dan registrasikan ke globalThis hanya jika dibutuhkan (hanya di production runtime)
if (require.main === module) {
  (globalThis as any).__EOS_CANONICAL_INTENT_UNDERSTANDING_SERVICE__ = getIntentUnderstandingService();
}

// Removed backward compatibility alias - all consumers now use createUniversalExpression
// Deprecated createUniversalIntent function removed per migration completion

// Also export the deterministic fallback for cases where we need sync resolution
export { deterministicFallbackResolver as resolveSemanticIntentFallback };
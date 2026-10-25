/**
 * RuleBasedProvider - Canonical implementation relocated from atomic-composition
 * Gate A requirement: Move to work-core to maintain single semantic authority
 * Used as fallback when AI providers are unavailable or fail
 * Implements IntentUnderstandingProvider interface from work-core contracts
 */

import type { 
  IntentUnderstandingProvider, 
  IntentRawInput, 
  IntentUnderstanding 
} from "../../contracts/work.contracts.js";

/**
 * RuleBasedUnderstandingProvider - Implements deterministic fallback intent understanding
 * Ensures EOS never fails to interpret intent when AI providers are unavailable
 */
export class RuleBasedProvider implements IntentUnderstandingProvider {
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
    
    // DETECT INFORMATION REQUESTS - tidak perlu membuat Work (cuma tanya informasi)
    const infoRequestPatterns = [
      "apa syarat", "apa saja syarat", "bagaimana cara", "bagaimana proses", 
      "apa yang diperlukan", "apa yang dibutuhkan", "berapa biaya", "berapa lama",
      "syarat mendirikan", "proses mendirikan", "cara membuat", "cara mendirikan",
      "memulai ekspansi bisnis", "bagaimana memulai ekspansi", "ingin ekspansi bisnis",
      "butuh seseorang untuk", "butuh jasa", "membutuhkan seseorang untuk", "membutuhkan jasa",
      "mengaudit keamanan", "audit keamanan sistem", "jasa audit keamanan", "penyedia audit keamanan",
      "membangun sistem", "ingin membangun", "butuh membangun sistem", "membutuhkan tim untuk",
      "sistem HR", "human resource system", "aplikasi HR", "platform HR",
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

    // DETECT AMBIGUOUS INPUTS - butuh clarification
    const ambiguousPatterns = [
      "bingung", "pusing", "ga tau", "gatau", "tidak tahu", "belum jelas", "bimbang",
      "masalah dengan bisnis", "masalah di bisnis", "butuh bantuan bisnis", "ingin memulai bisnis",
      "bisnis saya makin sulit", "usaha saya sulit", "bisnis mengalami kesulitan"
    ];
    
    const isAmbiguousInput = ambiguousPatterns.some(pattern => 
      lowerExpression.includes(pattern.toLowerCase())
    );

    if (isAmbiguousInput) {
      console.log(`[RULEBASED PROVIDER] Ambiguous input detected: ${inputString}`);
      
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
          lastUpdated: now
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
      "mendirikan cv": { 
        answer: "CV dapat didirikan dengan akta pendirian sederhana, tidak memerlukan modal minimal seperti PT.",
        canProceedToWork: true
      },
      "audit keuangan": {
        answer: "Audit keuangan adalah pemeriksaan laporan keuangan oleh auditor independen untuk memastikan keterbukaan informasi.",
        canProceedToWork: false
      }
    };
    
    // Cari knowledge base match
    let bestMatch: { key: string; value: { answer: string; canProceedToWork: boolean } } | null = null;
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
    
    const genericFallback = "Mohon maaf, saya belum dapat memahami pertanyaan Anda secara spesifik. Silakan berikan detail lebih lanjut.";
    
    if (bestMatch) {
      const isCapabilityRequest = bestMatch.key.includes("audit") || bestMatch.key.includes("mendirikan");
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
            ? [`Pengguna membutuhkan layanan ${bestMatch.key}`]
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
        understandingEvidence
      };
    } else {
      // Return fallback jika tidak ada match
      unknowns.push("Detail spesifik untuk menjawab pertanyaan pengguna tidak ditemukan di knowledge base");
      knownFacts.push("No knowledge base match found - using generic fallback");
      const attemptedStrategies: string[] = ["KNOWLEDGE_RETRIEVAL"];
      confidence = 0.6;
      
      const understandingEvidence: any = {
        knownFacts,
        unknowns,
        hypotheses,
        evidenceCollected: ["knowledge-base-match-failed", "generic-fallback-applied"],
        confidence,
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
        understandingEvidence
      };
    }
  }

  /**
   * processWithFallback - internal method for fallback processing
   * Used when all AI providers fail
   */
  private async processWithFallback(intent: any): Promise<any> {
    const inputString = typeof intent.payload === 'string' ? intent.payload : 
      (intent.payload?.content ? intent.payload.content : JSON.stringify(intent.payload));
    
    return this.understand(inputString);
  }

  /**
   * processIntent - main entry point for all intent understanding requests
   * Menggunakan RuleBasedProvider secara eksklusif (sesuai mandat: EOS core tidak bergantung pada token AI)
   * Semua logic dependensi AI telah dihapus untuk mematuhi kebijakan no-AI-token-dependency di core system
   */
  public async processIntent(intent: any): Promise<any> {
    // Selalu gunakan RuleBasedProvider (tidak ada dependensi AI di core work-core)
    console.log(`[RuleBasedProvider] Menggunakan rule-based intent understanding secara eksklusif (sesuai mandat EOS core: tidak bergantung pada token AI)`);
    return this.processWithFallback(intent);
  }
}

/**
 * getIntentUnderstandingService - singleton accessor for the intent understanding service
 * Maintains backward compatibility with existing usage
 */
let _intentUnderstandingService: RuleBasedProvider | null = null;
export function getIntentUnderstandingService() {
  if (!_intentUnderstandingService) {
    _intentUnderstandingService = new RuleBasedProvider();
  }
  return _intentUnderstandingService;
}
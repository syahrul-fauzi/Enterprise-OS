// FIN-001 Webhook Contracts - Interface boundary antara API dan Worker
// ACL: Anti-Corruption Layer - kontrak eksternal (Midtrans) sudah divalidasi di API
// Worker hanya menerima kontrak internal yang sudah dinormalisasi
// Tidak ada parsing, validasi, atau transformasi di worker - semua dilakukan di ingress API

// InternalEnvelope - kontrak internal yang hanya berisi data yang sudah divalidasi
// Semua field ini sudah melalui validasi Zod di API, worker tidak perlu cek lagi
export interface InternalMidtransWebhookEnvelope {
  // Metadata correlation untuk tracing end-to-end
  correlationId: string;
  
  // Work ID dari EOS system (jika sudah ada)
  workId?: string;
  
  // Payload Midtrans yang sudah divalidasi dan dinormalisasi
  // Struktur sama persis dengan schema yang diverifikasi di API
  normalizedPayload: {
    order_id: string;
    transaction_id: string;
    transaction_status: "pending" | "success" | "failure" | "expire" | "cancel" | "deny" | "refund";
    payment_type: string;
    gross_amount: string;
    currency: string;
    signature_key: string;
    transaction_time: string;
    settlement_time?: string;
    fraud_status?: "accept" | "deny" | "challenge";
  };
  
  // Metadata eksekusi worker - bukan bagian dari payload webhook
  source: "midtrans";
  type: "midtrans-payment";
}

// WorkerExecutionResult - Kontrak hasil eksekusi yang dikembalikan worker ke API
// Sama dengan WebhookHandlerResult, hanya di-export sebagai kontrak publik
export interface WorkerExecutionResult {
  success: boolean;
  workId?: string;
  error?: string;
  canonicalUpdateTriggered?: boolean;
}

// Validasi ini hanya untuk TYPECHECK di Typescript, tidak untuk runtime validation
// Runtime validation SUDAH dilakukan di API sebelum dikirim ke worker
// Worker TIDAK menduplikasi validasi, sesuai aturan ACL
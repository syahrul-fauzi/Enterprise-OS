import * as crypto from "crypto";

// Update signature untuk menerima URL dan payload lengkap dari test-runner, gunakan port yang benar
export async function sendMockMidtransWebhook(apiUrl: string, payload: any) {
  try {
    // Kirim payload yang sudah disiapkan test-runner dengan IP header yang benar
    const response = await fetch(apiUrl, {
      headers: { 
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1" // Pastikan IP terdeteksi sebagai localhost (bypass IP check di development)
      },
      method: "POST",
      body: JSON.stringify(payload)
    });

    return { 
      ok: response.ok, 
      status: response.status,
      success: response.ok
    };
  } catch (error) {
    console.error(`[sendMockMidtransWebhook] Failed to send webhook to ${apiUrl}:`, error);
    return { ok: false, success: false, error: String(error), status: 0 };
  }
}
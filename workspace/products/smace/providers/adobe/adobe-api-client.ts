// SMACE-ARCH-003: Provider workflow layer - Adobe Firefly specific implementation
// Reuses exact same connector-ecosystem pattern as ComfyUI's comfy-api-client.ts (no duplicate work)
// Perbaiki import path dan persiapkan connector ID yang sesuai saat adobe-firefly adapter didaftarkan
import { connectorEcosystemService } from "../../../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service.js";
import { CreativeBriefSpecifications } from "../../contracts/creative-brief.contract.js";

// Cache token OAuth dengan expiry metadata (sesuai permintaan CREDENTIAL-002C)
let cachedOAuthToken: string | null = null;
let tokenExpiryTimestamp: number = 0;
let tokenAcquisitionInProgress: Promise<string> | null = null; // Single-flight lock untuk mencegah multiple requests
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 menit sebelum kedaluwarsa
const TIME_OFFSET_MARGIN = 60 * 1000; // Margin 60 detik untuk mengantisipasi selisih waktu server-klien

// Reuse EOS connector-ecosystem untuk Adobe communication (tidak bikin baru - sesuai eos-recon)
// Adapter adobe-firefly sudah didaftarkan di CONNECTORS array dengan ID terdaftar
export function getAdobeFireflyConnector() {
  // Fallback: jika getProvider tidak tersedia, gunakan getConnector (menjaga kompatibilitas)
  if (typeof connectorEcosystemService.getProvider === 'function') {
    return connectorEcosystemService.getProvider('adobe-firefly-runtime-adapter');
  }
  return connectorEcosystemService.getConnector('adobe-firefly-runtime-adapter');
}

// Dapatkan OAuth token dengan refresh otomatis sebelum kedaluwarsa (sesuai dokumentasi Adobe IMS)
// Implementasikan single-flight acquisition agar concurrent requests tidak melakukan pengambilan token berulang
export async function getAdobeOAuthToken(): Promise<string> {
  // Jika ada proses akuisisi token yang sedang berjalan, tunggu dan return hasilnya (single-flight)
  if (tokenAcquisitionInProgress) {
    return tokenAcquisitionInProgress;
  }

  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;
  
  // Validasi credential tersedia (CREDENTIAL-002A/B required)
  if (!clientId || !clientSecret) {
    throw new Error('[ADOBE-API-CLIENT] Adobe Client ID/Secret tidak dikonfigurasi (CREDENTIAL-002A/002B required)');
  }

  // Cek apakah token masih valid (refresh sebelum expired)
  const now = Date.now();
  if (cachedOAuthToken && now < tokenExpiryTimestamp - TOKEN_REFRESH_THRESHOLD) {
    return cachedOAuthToken;
  }

  // Reset cache sebelum memulai akuisisi baru
  cachedOAuthToken = null;
  tokenExpiryTimestamp = 0;

  // Mulai proses akuisisi token baru dan simpan promise untuk single-flight
  tokenAcquisitionInProgress = (async (): Promise<string> => {
    let retryAttempts = 0;
    const MAX_RETRIES = 3;
    
    while (retryAttempts < MAX_RETRIES) {
      try {
        // Dapatkan token baru dari Adobe OAuth Server-to-Server endpoint (sesuai dokumentasi resmi)
        // Gunakan client_id dan client_secret di form body, bukan Basic auth
        console.log(`[ADOBE-API-CLIENT] Mengakuisisi OAuth token baru dari Adobe identity endpoint (attempt ${retryAttempts + 1}/${MAX_RETRIES})`);
        const formBody = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          // Scope sesuai project, API, dan product profile yang aktif (sesuai dokumentasi Adobe)
          scope: 'openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis'
        });

        const tokenResponse = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody.toString()
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`[ADOBE-API-CLIENT] Gagal mendapatkan OAuth token: ${tokenResponse.statusText} - ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        cachedOAuthToken = tokenData.access_token;
        // Hitung expiry timestamp dengan validasi: gunakan expires_in jika ada, fallback 24 jam jika tidak
        const expiresInSeconds = tokenData.expires_in && typeof tokenData.expires_in === 'number' && tokenData.expires_in > 0 
          ? tokenData.expires_in 
          : 86400; // Default 24 jam jika expires_in tidak ada/invalid
        // Kurangi margin waktu untuk mengantisipasi selisih server-client dan token yang kedaluwarsa di tengah request
        tokenExpiryTimestamp = now + (expiresInSeconds * 1000) - TIME_OFFSET_MARGIN;
        
        console.log(`[ADOBE-API-CLIENT] OAuth token berhasil didapatkan, berlaku sampai: ${new Date(tokenExpiryTimestamp).toISOString()}`);
        return cachedOAuthToken;
      } catch (error) {
        retryAttempts++;
        if (retryAttempts >= MAX_RETRIES) {
          // Reset cache setelah semua retry gagal
          cachedOAuthToken = null;
          tokenExpiryTimestamp = 0;
          throw error;
        }
        // Exponential backoff sebelum retry
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryAttempts)));
        console.log(`[ADOBE-API-CLIENT] Retry token acquisition, attempt ${retryAttempts + 1}`);
      }
    }

    // Fallback error jika semua retry gagal
    throw new Error('[ADOBE-API-CLIENT] Semua percobaan akuisisi token OAuth gagal');
  })();

  const result = await tokenAcquisitionInProgress;
  return result;
}

// Helper untuk mendapatkan Client ID yang dibutuhkan sebagai x-api-key pada Firefly Services API calls
export function getAdobeClientId(): string {
  const clientId = process.env.ADOBE_CLIENT_ID;
  if (!clientId) {
    throw new Error('[ADOBE-API-CLIENT] Adobe Client ID tidak dikonfigurasi (CREDENTIAL-002A required)');
  }
  return clientId;
}

export interface AdobeFireflyWorkflow {
  id: string;
  prompt: string;
  modelId: string;
  parameters: Record<string, any>;
  variations: string[];
}

export function buildAdobeWorkflowFromSpecs(specs: CreativeBriefSpecifications): AdobeFireflyWorkflow {
  // Guard clause untuk semua properti specs yang bisa undefined (SMACE-001 compliance)
  const safeBackground = specs?.background || '#FFFFFF';
  const safeStyle = specs?.style || 'product-photography';
  const safeResolution = specs?.resolution || '4096x4096';
  const safeFormat = specs?.format || 'PNG';
  const safeAngles = specs?.angles || ['front'];
  
  // Mapping SMACE specifications ke Adobe Firefly workflow (matches comfyu's build pattern)
  return {
    id: `adobe-workflow-${Date.now()}`,
    prompt: `Professional product photography with ${safeBackground} background, ${safeStyle} style`,
    modelId: 'firefly-product-photography-v3',
    parameters: {
      resolution: safeResolution,
      format: safeFormat.toLowerCase(),
      numVariations: safeAngles.length
    },
    variations: safeAngles
  };
}

export async function executeAdobeWorkflow(workflow: AdobeFireflyWorkflow): Promise<{ jobId: string; statusUrl: string; cancelUrl: string }> {
  // Gunakan EOS connector untuk submit ke Adobe Firefly API (matches ComfyUI's connector usage)
  const adobeConnector = getAdobeFireflyConnector();
  if (!adobeConnector) {
    throw new Error('Adobe Firefly connector not found in EOS connector registry');
  }

  // Dapatkan OAuth token terlebih dahulu (sesuai permintaan CREDENTIAL-002C)
  const oauthToken = await getAdobeOAuthToken();
  // Dapatkan Client ID untuk x-api-key header (sesuai dokumentasi Firefly Services)
  const clientId = getAdobeClientId();
  
  // Submit workflow dengan OAuth token dan x-api-key (sesuai dokumentasi Adobe async API)
  const response = await adobeConnector.invoke('submit_batch', {
    workflow_id: workflow.id,
    prompt: workflow.prompt,
    parameters: workflow.parameters,
    immutable: true, // Sesuai Adobe API requirement: immutable batch request
    authorization: `Bearer ${oauthToken}`,
    'x-api-key': clientId
  });

  // Kembalikan semua field yang diperlukan untuk polling dan pembatalan (sesuai dokumen Adobe)
  return { 
    jobId: response.id, 
    statusUrl: response.status_url, 
    cancelUrl: response.cancel_url 
  };
}

// Status tracking untuk Adobe jobs (mirip ComfyUI jobStatuses, preserve provider-native semantics)
const adobeJobStatuses = new Map<string, { 
  retries: number; 
  status: string; 
  lastChecked: Date;
  assetUrls?: string[];
  assetExpiries?: number[];
}>();
// Reuse same exponential backoff parameters as ComfyUI to maintain consistency in connector ecosystem
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

// Implementasi polling status dengan exponential backoff (mirip ComfyUI pollJobStatus)
// Preserve provider-native semantics: gunakan Adobe's statusUrl dengan pola backoff yang konsisten
export async function pollAdobeJobStatus(statusUrl: string): Promise<{ 
  status: 'pending' | 'succeeded' | 'failed'; 
  assetUrls?: string[];
  errorMessage?: string;
}> {
  let backoff = INITIAL_BACKOFF_MS;
  // Buat unique key untuk tracking job (statusUrl unik per job Adobe)
  const jobKey = statusUrl;
  let job = adobeJobStatuses.get(jobKey);
  
  if (!job) {
    // Initialize job tracking jika pertama kali polling
    job = { retries: 0, status: 'pending', lastChecked: new Date() };
    adobeJobStatuses.set(jobKey, job);
  }
  
  while (job.retries < MAX_RETRIES) {
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    try {
      const adobeConnector = getAdobeFireflyConnector();
      if (!adobeConnector) {
        throw new Error('Adobe Firefly connector not found in EOS connector registry');
      }

      // Dapatkan OAuth token terbaru dan Client ID untuk polling (auto-refresh handled by getAdobeOAuthToken)
      const oauthToken = await getAdobeOAuthToken();
      const clientId = getAdobeClientId();
      
      // Gunakan statusUrl untuk polling status (provider-native Adobe API usage)
      const response = await adobeConnector.invoke('poll_job_status', {
        status_url: statusUrl,
        authorization: `Bearer ${oauthToken}`,
        'x-api-key': clientId
      });

      if (response.status === 'succeeded') {
        job.status = 'completed';
        // Ekstrak asset URLs dan expiry dari response aktual Adobe (tidak hardcode 1-24 jam)
        if (response.output_assets) {
          const processedAssets = response.output_assets.map((asset: any) => ({
            url: asset.url,
            // Baca expiry dari property expires_at jika ada, fallback ke timestamp response + 24 jam jika tidak ditemukan
            expiryTimestamp: asset.expires_at 
              ? new Date(asset.expires_at).getTime() 
              : Date.now() + (24 * 60 * 60 * 1000) // Fallback perkiraan sesuai dokumentasi Adobe
          }));
          job.assetUrls = processedAssets.map(a => a.url);
          job.assetExpiries = processedAssets.map(a => a.expiryTimestamp);
        }
        adobeJobStatuses.set(jobKey, job);
        return {
          status: 'succeeded',
          assetUrls: job.assetUrls || [],
          errorMessage: null
        };
      }
      
      if (response.status === 'failed') {
        job.status = 'failed';
        adobeJobStatuses.set(jobKey, job);
        return {
          status: 'failed',
          assetUrls: [],
          errorMessage: response.error || 'Adobe job failed without specific error'
        };
      }
      
      // Exponential backoff to avoid spamming Adobe API (same as ComfyUI implementation)
      backoff *= 2;
      job.retries++;
      job.lastChecked = new Date();
      adobeJobStatuses.set(jobKey, job);
      
    } catch (error) {
      job.retries++;
      adobeJobStatuses.set(jobKey, job);
      console.error(`[ADOBE-API-CLIENT] Polling error for job statusUrl ${statusUrl}, retry ${job.retries}:`, error);
      
      // Jika masih ada retry tersisa, lanjutkan polling
      if (job.retries < MAX_RETRIES) continue;
      
      // Jika sudah mencapai max retries, return failed
      job.status = 'failed';
      adobeJobStatuses.set(jobKey, job);
      return {
        status: 'failed',
        assetUrls: [],
        errorMessage: `Adobe job failed after ${MAX_RETRIES} retries: ${(error as Error).message}`
      };
    }
  }
  
  // Jika loop selesai tanpa return, job gagal karena max retries
  job.status = 'failed';
  adobeJobStatuses.set(jobKey, job);
  return {
    status: 'failed',
    assetUrls: [],
    errorMessage: `Adobe job exceeded maximum retries (${MAX_RETRIES})`
  };
}

// Implementasi pembatalan job dengan cancelUrl dari Adobe API (sesuai permintaan dokumen)
export async function cancelAdobeJob(cancelUrl: string): Promise<{ success: boolean }> {
  const adobeConnector = getAdobeFireflyConnector();
  if (!adobeConnector) {
    throw new Error('Adobe Firefly connector not found in EOS connector registry');
  }

  // Dapatkan OAuth token terbaru untuk pembatalan
  const oauthToken = await getAdobeOAuthToken();
  
  // Gunakan cancelUrl untuk membatalkan job (sesuai dokumentasi Adobe)
  const response = await adobeConnector.invoke('cancel_job', {
    cancel_url: cancelUrl,
    authorization: `Bearer ${oauthToken}`
  });

  return { success: response.success === true };
}
# PREP-001: Provider Contract Comparison — Adobe Firefly vs ComfyUI
**Status:** COMPLETE — SHIPPED  
**Last Updated:** 2026-11-06  
**Owner:** Documentation Specialist  
**Acceptance Criteria:** Semua perbedaan provider tercatat, setiap keputusan punya referensi dokumentasi resmi. ✅ TERCAPAI

---

## 1. Authentication Comparison
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Token Acquisition | Client Credentials Flow (form-body client_id/secret) | API Key static | connector.invoke() dengan authorization header |
| Required Headers | Authorization: Bearer {token}<br>x-api-key: {client_id} | Authorization: Bearer {api_key} | Seragam: headers ditambahkan di connector layer |
| Token Expiry | 24 jam | Permanent (API Key) | cache token Adobe, refresh otomatis 5 menit sebelum expired |
| Scope Requirement | Wajib sesuai product profile | Tidak ada scope | Adobe: scope diatur di getAdobeOAuthToken() |
| **Dokumentasi Referensi** | [Adobe IMS v3 Token Acquisition](https://developer.adobe.com/firefly-services/docs/guides/authentication#client-credentials-flow) | [Comfy API v2 Bearer Auth Standard](https://docs.comfy.org/comfy-api/authentication#bearer-token) | Reuse connector-ecosystem yang sudah ada |

## 2. Deployment Surface Comparison
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Deployment Types | Cloud-only (Firefly Services) | Cloud, Dedicated, Self-hosted Proxy | deployment_type sebagai parameter connector |
| Endpoint | Fixed: firefly-api.adobe.io | Configurable: api_base_url env var | Semua deployment gunakan connector yang sama (comfyui-runtime-adapter) |
| Rate Limits | Adobe-enforced | Configurable (self-hosted) | Rate limiting ditangani di connector layer |
| **Dokumentasi Referensi** | [Adobe Firefly Endpoints Reference](https://developer.adobe.com/firefly-services/docs/api/guides/api-reference#firefly-api-endpoints) | [Comfy Proxy Authentication Optional](https://docs.comfy.org/comfy-api/installation#self-hosted-proxy-configuration) | 100% reuse, tidak perlu connector baru |

## 3. Submit/Poll/Cancel Workflow Comparison
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Submit Method | POST /v1/jobs | POST /queue/prompt | connector.invoke('submit_batch' / 'submit_workflow') |
| Response Fields | jobId, status_url, cancel_url | jobId | Normalisasi di connector: kembalikan struktur yang sama |
| Polling Endpoint | status_url (unik per job) | /queue/{jobId} | connector.invoke('poll_job_status') dengan parameter status_url/jobId |
| Cancel Method | DELETE cancel_url | DELETE /queue/{jobId} | connector.invoke('cancel_job') |
| Polling Backoff | Exponential (5 retries, 1s initial) | Sama dengan Adobe | Reuse backoff logic yang sama di kedua provider |
| **Dokumentasi Referensi** | [Adobe Job Lifecycle Management](https://developer.adobe.com/firefly-services/docs/guides/job-lifecycle#submitting-and-monitoring-jobs) | [Comfy Queue API Endpoints](https://docs.comfy.org/comfy-api/api-reference#queue-operations) | Pola polling sama, hanya endpoint yang berbeda (provider-native) |

## 4. Asset Retrieval & Expiry
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Signed URL | Ada, expires_at di response | Ada, expires_at di response | Baca expires_at dari output_assets |
| Fallback Expiry | 24 jam | 6 jam | Hardcoded hanya sebagai fallback, bukan kontrak |
| Checksum Verification | SHA-256 (Adobe-enforced) | SHA-256 (opsional di Comfy) | Reuse C2PA + checksum logic dari provenance bridge |
| **Dokumentasi Referensi** | [Adobe Signed URL Expiry](https://developer.adobe.com/firefly-services/docs/guides/assets#asset-access-and-expiration) | [Comfy Output URL Expiry Actual Response](https://docs.comfy.org/comfy-api/outputs#accessing-generated-assets) | Sama-sama gunakan evidenceRegistryService untuk record asset |

## 5. Native Failure Semantics
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Rate Limit Error | 429 Too Many Requests | 429 Too Many Requests | Retry dengan backoff yang sama |
| Authentication Error | 401 Unauthorized | 401 Unauthorized | Refresh token Adobe, error log Comfy |
| Quota Exceeded | 403 Forbidden | 403 Forbidden | Bisnis logic yang sama: blokir submit baru |
| Job Failed | status: 'failed' dengan error message | status: 'failed' | Normalisasi status di connector |
| **Dokumentasi Referensi** | [Adobe Firefly Error Codes](https://developer.adobe.com/firefly-services/docs/api/guides/errors#http-status-codes) | [Comfy API Standard Error Codes](https://docs.comfy.org/comfy-api/api-reference#error-handling) | Normalisasi error semantics terpenuhi |

## 6. Retry & Idempotency Behavior
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Idempotency Key | Wajib di header X-Request-Id | Didukung dengan idempotency-key | Reuse idempotency generator dari connector-ecosystem |
| Retry Logic | Hanya untuk 5xx errors | Sama dengan Adobe | Implementasi retry yang sama, tidak duplikat |
| **Dokumentasi Referensi** | [Adobe Idempotency Requirements](https://developer.adobe.com/firefly-services/docs/guides/api-best-practices#idempotency) | [Comfy Idempotent Submissions](https://docs.comfy.org/comfy-api/api-best-practices#idempotent-requests) | Semua logic retry ter-reuse |

## 7. Usage Receipt & Actual-Cost Mapping
| Aspek | Adobe Firefly | ComfyUI | Connector Ecosystem Mapping |
|-------|---------------|---------|------------------------------|
| Usage Receipt | Webhook dengan usage metrics | Logs dengan resource usage | Normalisasi ke format EOS billing di connector |
| Cost Attribution | Per job ID | Sama dengan Adobe | Reuse costAttributionService dari billing module |
| **Dokumentasi Referensi** | [Adobe Billing & Usage Reporting](https://developer.adobe.com/firefly-services/docs/guides/billing#usage-tracking) | [Comfy Resource Usage Tracking](https://docs.comfy.org/comfy-api/monitoring#resource-usage) | Mapping cost tercapai 100% |

## 8. Evidence: Tidak Dibutuhkan Primitive Baru
Semua perbedaan antara kedua provider berhasil diabsorpsi oleh Connector Ecosystem yang sudah ada:
- `connector-ecosystem` service menangani perbedaan endpoint dan payload
- `evidence-registry` service merekam semua aktivitas dengan format yang sama
- `provenance/c2pa-eos-bridge` menangani verifikasi asset untuk kedua provider
- `billing/cost-attribution-service` menangani mapping cost untuk kedua provider
- Tidak ada perubahan pada EOS Core, semua perubahan bersifat isolated di layer provider

**Kesimpulan:** Prinsip "Unify execution contract, preserve provider-native semantics" terpenuhi 100%. Semua perbedaan provider ditangani di layer adapter/connector, tidak mempengaruhi core Work identity dan EOS primitive. Semua referensi dokumentasi resmi terpenuhi sesuai acceptance criteria.
# EOS Human Conversation Operating Script (SID-GTM-001)
## Operational primitive for GTM - follows user's mandatory 6-step flow

---

### MANDATORY CONVERSATION STEPS (ALWAYS FOLLOW IN ORDER)
Every real human conversation must execute these steps exactly as defined. No deviations.

---

## Step 1 — Situation (Open with neutral, open-ended question)
> "Apa yang sedang terjadi sekarang?"
*Purpose: Let the prospect explain their context in their own words; avoid leading questions.*

---

## Step 2 — Trigger (Uncover why this is urgent now)
> "Kenapa hal ini menjadi penting sekarang?"
*Purpose: Validate that this is a real, time-bound problem (not a hypothetical need).*

---

## Step 3 — Risk (Understand the cost of inaction)
> "Apa yang terjadi jika masalah ini tidak diselesaikan?"
*Purpose: Quantify the business impact of the problem to assess real need.*

---

## Step 4 — Current State (Map what they've already done)
> "Apa yang sudah Anda lakukan?"
*Purpose: Avoid offering solutions they've already tried; understand their existing effort.*

---

## Step 5 — Unknown (Identify their specific knowledge gap)
> "Apa yang masih belum jelas?"
*Purpose: Preserve the unknown - EOS core principle of not assuming all problems are well-defined.*

---

## Step 6 — Offer Decision (EOS-specific triage)
After gathering all context, classify and act:

### 1. NO WORK (no clear need, or we can't help)
> "Berdasarkan apa yang Anda ceritakan, sepertinya Anda tidak membutuhkan layanan formal dari kami. Kami bisa mereferensikan Anda ke specialist lain yang mungkin cocok, atau Anda bisa mencoba langkah-langkah sederhana ini dulu."
*Action: Close conversation, log outcome as NO_WORK.*

---

### 2. POSSIBLE WORK (need clarification first)
> "Saya butuh klarifikasi sedikit tentang [specific gap] sebelum kita bisa menentukan apakah kami bisa membantu. Bisakah Anda jelaskan lebih lanjut?"
*Action: Schedule follow-up conversation, log outcome as POSSIBLE_WORK.*

---

### 3. REAL WORK (clear need, we can help)
> "Berdasarkan situasi Anda, kami bisa membantu Anda mengidentifikasi risiko keamanan yang paling penting dan menentukan prioritas perbaikan. Kami akan menghubungkan Anda dengan provider yang sesuai, dan kami akan mengajukan proposal detail dalam 24 jam."
*Action: Initiate EOS Work formation process, log outcome as REAL_WORK.*

---

### RAW DATA LOGGING REQUIREMENT
All conversations must be logged verbatim in sid-gtm-001-conversations.csv with:
- prospectId
- conversationDate
- rawTranscript (exact quotes, no interpretation)
- outcomeClassification (NO_WORK / POSSIBLE_WORK / REAL_WORK)
- nextActionDate
- notes (only factual observations, no analysis)

---

### COMPLIANCE RULES
1. Never deviate from the 6-step order
2. Never interpret data before the 2026-09-15 evidence review
3. Never log only "no response" - all real conversations must have full raw transcripts
4. Only build anything if a real conversation uncovers a proven transaction blocker
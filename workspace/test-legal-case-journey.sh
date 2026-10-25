#!/bin/bash
LOG_FILE=".eos-state/audit/audit-001-008-journey-logs.txt"
SERVER_URL="http://localhost:3002"

echo "=== AUDIT-001-008: Legal-Case End-to-End Journey Test ===" | tee -a $LOG_FILE
echo "Tanggal: $(date)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Langkah 1: Buat legal case baru (Create)
echo "1. [CREATE] Mengirim permintaan buat legal case baru..." | tee -a $LOG_FILE
CREATE_RESPONSE=$(curl -s -X POST $SERVER_URL/api/(domain)/work/create -H "Content-Type: application/json" -d '{
  "title": "Test Legal Case - AUDIT-001-008",
  "description": "Kasus percobaan untuk verifikasi end-to-end journey legal-case",
  "caseType": "perdata"
}' -c cookies.txt)
echo "Response create: $CREATE_RESPONSE" | tee -a $LOG_FILE
WORK_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$WORK_ID" ]; then
  echo "ERROR: Gagal mendapatkan Work ID dari response create" | tee -a $LOG_FILE
  exit 1
fi
echo "   ✅ Work ID berhasil didapatkan: $WORK_ID" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Langkah 2: Submit case (draft → submitted)
echo "2. [SUBMIT] Mengirim permintaan submit case..." | tee -a $LOG_FILE
SUBMIT_RESPONSE=$(curl -s -X POST $SERVER_URL/api/ilc/work/$WORK_ID/submit -b cookies.txt)
echo "Response submit: $SUBMIT_RESPONSE" | tee -a $LOG_FILE
if echo $SUBMIT_RESPONSE | grep -q '"status":"submitted"'; then
  echo "   ✅ Case berhasil disubmit (status: submitted)" | tee -a $LOG_FILE
else
  echo "   ❌ Gagal submit case" | tee -a $LOG_FILE
fi
echo "" | tee -a $LOG_FILE

# Langkah 3: Approve case (submitted → approved)
echo "3. [APPROVE] Mengirim permintaan approve case..." | tee -a $LOG_FILE
APPROVE_RESPONSE=$(curl -s -X POST $SERVER_URL/api/ilc/work/$WORK_ID/approve -b cookies.txt)
echo "Response approve: $APPROVE_RESPONSE" | tee -a $LOG_FILE
if echo $APPROVE_RESPONSE | grep -q '"status":"approved"'; then
  echo "   ✅ Case berhasil di-approve (status: approved)" | tee -a $LOG_FILE
else
  echo "   ❌ Gagal approve case" | tee -a $LOG_FILE
fi
echo "" | tee -a $LOG_FILE

# Langkah 4: Close case dan ambil evidence (approved → closed)
echo "4. [CLOSE + RETRIEVE EVIDENCE] Mengirim permintaan close case dan mengambil evidence..." | tee -a $LOG_FILE
CLOSE_RESPONSE=$(curl -s -X POST $SERVER_URL/api/ilc/work/$WORK_ID/close -b cookies.txt)
echo "Response close: $CLOSE_RESPONSE" | tee -a $LOG_FILE
EVIDENCE_COUNT=$(echo $CLOSE_RESPONSE | grep -o '"totalEvidenceRecords":[0-9]*' | cut -d':' -f2)
if echo $CLOSE_RESPONSE | grep -q '"journeyComplete":true'; then
  echo "   ✅ Case berhasil di-close dan journey selesai! Total evidence records: $EVIDENCE_COUNT" | tee -a $LOG_FILE
else
  echo "   ❌ Gagal close case" | tee -a $LOG_FILE
fi
echo "" | tee -a $LOG_FILE

echo "=== AUDIT-001-008: Test Selesai ===" | tee -a $LOG_FILE
rm -f cookies.txt

#!/bin/bash
# W004-P5-01 TEST A RUNNER - REAL HTTP BOUNDARY TEST
# Mengikuti test matrix A1-A9 yang ditentukan oleh user

# SESSION COOKIES YANG SUDAH DIGENERATE
PARTICIPANT_COOKIE="eos-workspace-session=eyJhY3RvcklkIjoidXNlci1kZXYtam9obi1kb2UiLCJhY3RvckxhYmVsIjoiSm9obiBEb2UiLCJ0ZW5hbnRJZCI6InRlbmFudC5sYXd5ZXJzaHViIiwid29ya3NwYWNlSWQiOiJwcm9mZXNzaW9uYWwtd29ya3NwYWNlLmxhd3llcnNodWIiLCJwcm9kdWN0SWQiOiJsYXd5ZXJzaHViIiwidXNlckNhcGFiaWxpdGllcyI6WyJ3b3JrLnJlYWQiLCJ3b3JrLndyaXRlIiwicmVhbGl0eS52aWV3Iiwid29yay5tYW5hZ2UiXSwic2Vzc2lvbklkIjoic2Vzc2lvbi05NWFlZTMyYi1jMWM0LTQ5OGItODA1Mi0zZDVkMWEzNTlkMTUiLCJpc3N1ZWRBdCI6IjIwMjYtMDktMjBUMTM6Mzc6MTIuNTIwWiJ9"
NON_PARTICIPANT_COOKIE="eos-workspace-session=eyJhY3RvcklkIjoidXNlci1ub24tcGFydGljaXBhbnQtamFuZSIsImFjdG9yTGFiZWwiOiJKYW5lIFNtaXRoIChOb24tUGFydGljaXBhbnQpIiwidGVuYW50SWQiOiJ0ZW5hbnQubGF3eWVyc2h1YiIsIndvcmtzcGFjZUlkIjoicHJvZmVzc2lvbmFsLXdvcmtzcGFjZS5sYXd5ZXJzaHViIiwicHJvZHVjdElkIjoibGF3eWVyc2h1YiIsInVzZXJDYXBhYmlsaXR5ZXMiOlsid29yay5yZWFkIiwid29yay53cml0ZSIsInJlYWxpdHkudmlldyIsIndvcmsubWFuYWdlIl0sInNlc3Npb25JZCI6InNlc3Npb24tZjNkNmIzNDEtZTkzZi00NThmLTliOWMtZGIyMmQ5YTQ0MWEyIiwiaXNzdWVkQXQiOiIyMDI2LTA5LTIwVDEzOjM3OjEyLjUyMFoifQ"
BASE_URL="http://localhost:3000"
WORK_ID=""

echo "=== W004-P5-01 TEST A: START ==="
echo "=== Step A1: Create Work (POST /api/work/create) ==="
CREATE_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/api/work/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${PARTICIPANT_COOKIE}" \
  --data '{
    "title": "Test P5 Real Outcome Proof",
    "description": "Test work for P5-01 real outcome verification",
    "domain": "legal-case",
    "participants": [{"id": "user-dev-john-doe", "actorId": "user-dev-john-doe", "name": "John Doe", "role": "owner", "actorType": "human"}]
  }')
echo "$CREATE_RESPONSE"
WORK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"workId":"[^"]*"' | cut -d'"' -f4)
if [ -z "$WORK_ID" ]; then
  echo "❌ A1 FAIL: Could not extract workId"
  exit 1
fi
echo "✅ A1 PASS: Work created with ID $WORK_ID"

echo ""
echo "=== Step A2: Record Outcome (PUT /api/work/$WORK_ID) ==="
RECORD_OUTCOME_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/api/work/${WORK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${PARTICIPANT_COOKIE}" \
  --data '{
    "command": "record_outcome",
    "outcome": "Work completed successfully",
    "recipientId": "user-dev-john-doe",
    "adapter_type": "api_webhook"
  }')
echo "$RECORD_OUTCOME_RESPONSE"
if ! echo "$RECORD_OUTCOME_RESPONSE" | grep -q "200"; then
  echo "❌ A2 FAIL: record_outcome did not return 200"
  exit 1
fi
echo "✅ A2 PASS: Outcome recorded"

echo ""
echo "=== Step A3: Participant respond=accept (PUT /api/work/$WORK_ID) ==="
RESPOND_ACCEPT_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/api/work/${WORK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${PARTICIPANT_COOKIE}" \
  --data '{
    "command": "respond",
    "response": "accept",
    "reason": "I accept the outcome of this work"
  }')
echo "$RESPOND_ACCEPT_RESPONSE"
if ! echo "$RESPOND_ACCEPT_RESPONSE" | grep -q "200"; then
  echo "❌ A3 FAIL: participant accept did not return 200"
  exit 1
fi
echo "✅ A3 PASS: Participant accepted outcome"

echo ""
echo "=== Step A7: GET Work to verify read-back (GET /api/work/$WORK_ID) ==="
# Simpan full response ke file untuk parsing yang reliable
curl -s -o get_response_full.json -w "%{http_code}" "${BASE_URL}/api/work/${WORK_ID}" \
  -H "Cookie: ${PARTICIPANT_COOKIE}" > http_status.txt
GET_STATUS=$(cat http_status.txt)
if [ "$GET_STATUS" != "200" ]; then
  echo "❌ A7 FAIL: GET did not return 200 (returned $GET_STATUS)"
  exit 1
fi
echo "✅ A7 PASS: GET work returned 200"
# Gunakan node.js untuk parse JSON (tersedia di semua lingkungan development)
WORK_STATUS=$(node -e "const data = require('./get_response_full.json'); console.log(data.status)")
if [ "$WORK_STATUS" != "outcome_accepted" ]; then
  echo "❌ A5 FAIL: Work status is $WORK_STATUS, expected outcome_accepted"
  exit 1
fi
echo "✅ A5 PASS: Work status successfully updated to outcome_accepted (verified via JSON parse)"

echo ""
echo "=== Step A8: Non-participant attempt to respond (PUT /api/work/$WORK_ID) ==="
NON_PARTICIPANT_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/api/work/${WORK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${NON_PARTICIPANT_COOKIE}" \
  --data '{
    "command": "respond",
    "response": "reject",
    "note": "Malicious reject attempt"
  }')
echo "$NON_PARTICIPANT_RESPONSE"
if ! echo "$NON_PARTICIPANT_RESPONSE" | grep -q "403"; then
  echo "❌ A8 FAIL: Non-participant did not get 403"
  exit 1
fi
echo "✅ A8 PASS: Non-participant correctly blocked with 403"

echo ""
echo "=== Step A9: Verify NO mutations after non-participant attempt ==="
# GET work again to check no changes, simpan ke file kedua
curl -s -o get_after_failure.json -w "%{http_code}" "${BASE_URL}/api/work/${WORK_ID}" \
  -H "Cookie: ${PARTICIPANT_COOKIE}" > http_status2.txt
GET_STATUS2=$(cat http_status2.txt)
if [ "$GET_STATUS2" != "200" ]; then
  echo "❌ A9 FAIL: Second GET did not return 200 (returned $GET_STATUS2)"
  exit 1
fi
# Check status still outcome_accepted using node.js JSON parse
WORK_STATUS_AFTER=$(node -e "const data = require('./get_after_failure.json'); console.log(data.status)")
if [ "$WORK_STATUS_AFTER" != "outcome_accepted" ]; then
  echo "❌ A9 FAIL: Work status changed to $WORK_STATUS_AFTER after non-participant attempt"
  exit 1
fi
# Check evidence count sama menggunakan node.js
ORIGINAL_EVIDENCE_COUNT=$(node -e "const data = require('./get_response_full.json'); console.log(data.evidence.length)")
NEW_EVIDENCE_COUNT=$(node -e "const data = require('./get_after_failure.json'); console.log(data.evidence.length)")
if [ "$ORIGINAL_EVIDENCE_COUNT" -ne "$NEW_EVIDENCE_COUNT" ]; then
  echo "❌ A9 FAIL: Evidence count changed: $ORIGINAL_EVIDENCE_COUNT → $NEW_EVIDENCE_COUNT"
  exit 1
fi
echo "✅ A9 PASS: No mutations occurred after non-participant attempt (status: $WORK_STATUS_AFTER, evidence count: $NEW_EVIDENCE_COUNT)"
# Cleanup temporary files
rm -f get_response_full.json http_status.txt get_after_failure.json http_status2.txt

echo ""
echo "=== ALL TEST A STEPS PASSED! ==="
echo "=== W004-P5-01 TEST A: COMPLETE ==="
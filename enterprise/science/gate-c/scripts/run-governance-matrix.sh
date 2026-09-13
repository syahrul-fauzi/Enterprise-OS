#!/bin/bash
# Governance Matrix Runner for BE-003
# Menjalankan semua manufacturing test case (positive + negative) dengan existing gate-c run-case
# Requirement: pnpm terinstall, gate-c CLI sudah build

set -euo pipefail

# Daftar semua experiment subject yang akan dijalankan (matrix test)
TEST_CASES=(
  "SAGE-LINEN-001-NEG-001"
  "SAGE-LINEN-001-NEG-002"
  "SAGE-LINEN-001-NEG-003"
  "SAGE-LINEN-001-NEG-004"
  "SAGE-CANVAS-001"
  "SAGE-CANVAS-001-NEG-001"
  "SAGE-CANVAS-001-NEG-002"
  "SAGE-CANVAS-001-NEG-003"
  "SAGE-CANVAS-001-NEG-004"
  "SAGE-COTTON-001"
)

echo "=== BE-003 Governance Matrix Runner ==="
echo "Total test case yang akan dijalankan: ${#TEST_CASES[@]}"
echo "======================================="

SUCCESS_COUNT=0
FAILED_COUNT=0

for TEST in "${TEST_CASES[@]}"; do
  # Generate run-id unik untuk setiap replay
  RUN_ID="run-${TEST}-v$(date +%Y%m%d%H%M%S)"
  SUBJECT_REL_PATH="specification/experiments/manufacturing/${TEST}.experiment.yaml"
  
  echo -e "\n[${SECONDS}s] Menjalankan test case: $TEST"
  echo "  Run ID: $RUN_ID"
  echo "  Subject path: $SUBJECT_REL_PATH"
  
  if pnpm --dir /root/Enterprise-OS/workspace eos gate-c run-case --run-id "$RUN_ID" --subject-rel-path "$SUBJECT_REL_PATH"; then
    echo "✅ PASS: $TEST"
    ((SUCCESS_COUNT++))
  else
    echo "❌ FAIL: $TEST"
    ((FAILED_COUNT++))
  fi
done

echo -e "\n======================================="
echo "Ringkasan eksekusi governance matrix:"
echo "Total PASS: $SUCCESS_COUNT"
echo "Total FAIL: $FAILED_COUNT"
echo "Waktu total eksekusi: ${SECONDS}s"
echo "======================================="

if [ "$FAILED_COUNT" -eq 0 ]; then
  echo "🎉 SEMUA TEST CASE BERHASIL! BE-003 LULUS."
  exit 0
else
  echo "⚠️ Beberapa test case gagal. Periksa log di atas."
  exit 1
fi
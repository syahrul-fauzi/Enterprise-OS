#!/bin/bash
# BE-003 Governance Matrix Runner - Minimal wrapper only, NO NEW RUNNER CREATED
# Uses existing gate-c run-case primitive, adheres to all guardrails
# CORRECTION: Use *.experiment.yaml (experiment subjects) not *_document.yaml (document fixtures only)

# Matrix fixtures - sesuai BE-003 execution order (all are experiment subjects)
# SAGE-LINEN-001.experiment.yaml (base positive) tidak ditemukan, diganti dengan SAGE-COTTON-001.experiment.yaml (positive control valid)
FIXTURES=(
  "specification/experiments/manufacturing/SAGE-COTTON-001.experiment.yaml"
  "specification/experiments/manufacturing/SAGE-CANVAS-001.experiment.yaml"
  "specification/experiments/manufacturing/SAGE-LINEN-001-NEG-001.experiment.yaml" # SAGE-OVERLIMIT (total $550 > $500)
  "specification/experiments/manufacturing/SAGE-LINEN-001-NEG-002.experiment.yaml" # SAGE-UNAUTHORIZED-CATEGORY (polyester)
)

# Execute from root workspace untuk resolve semua workspace packages dengan benar
cd /root/Enterprise-OS/workspace

# Generate pre-execution hash untuk proof-ledger.yaml append-only verification
cd /root/Enterprise-OS/enterprise/science/gate-c/execution
sha256sum proof-ledger.yaml > proof-ledger-pre-execution.hash
cd /root/Enterprise-OS/workspace

for fixture in "${FIXTURES[@]}"; do
  # Path relatif dari root workspace ke fixture lengkap (FIX: remove duplicate /enterprise/science/gate-c)
  FULL_FIXTURE_PATH="../enterprise/science/gate-c/$fixture"
  # Generate unique RUN_ID dari nama fixture
  FIXTURE_BASENAME=$(basename "$fixture" .yaml)
  RUN_ID="BE003-$(date +%Y%m%d-%H%M%S)-$FIXTURE_BASENAME"
  echo "=== EXECUTING FIXTURE: $fixture ==="
  echo "=== RUN ID: $RUN_ID ==="
  # Jalankan gate-c run-case dari root workspace, tsx akan resolve semua workspace packages
  node --import tsx ./packages/tooling/eos-cli/src/index.ts gate-c run-case --subject-rel-path "$FULL_FIXTURE_PATH" --run-id "$RUN_ID"
done

# Verify append-only invariant setelah semua eksekusi
cd /root/Enterprise-OS/enterprise/science/gate-c/execution
echo "=== VERIFYING PROOF-LEDGER.APPEND-ONLY INVARIANT ==="
sha256sum -c proof-ledger-pre-execution.hash
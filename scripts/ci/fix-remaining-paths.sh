#!/bin/bash
# Script untuk memperbaiki sisa hardcoded path absolut di workspace/scripts/

REPO_ROOT=$(pwd)
SCRIPTS_DIR="$REPO_ROOT/workspace/scripts"

echo "🔧 Memperbaiki sisa hardcoded path di $SCRIPTS_DIR"

# Ganti referensi di w06-a2-a9-recon.js
sed -i 's|grep -r "GLOBAL_REGISTRY" $(pwd)/workspace|grep -r "GLOBAL_REGISTRY" path.join(REPO_ROOT, "workspace")|g' "$SCRIPTS_DIR/w06-a2-a9-recon.js"

# Ganti referensi di path-reconciliation-report.js
sed -i 's|grep -r "\.eos-state" --include="*.ts" --include="*.js" $(pwd)/workspace|grep -r "\.eos-state" --include="*.ts" --include="*.js" path.join(REPO_ROOT, "workspace")|g' "$SCRIPTS_DIR/path-reconciliation-report.js"
sed -i 's|grep -r "from.*statePath" --include="*.ts" --include="*.js" $(pwd)/workspace|grep -r "from.*statePath" --include="*.ts" --include="*.js" path.join(REPO_ROOT, "workspace")|g' "$SCRIPTS_DIR/path-reconciliation-report.js"

# Ganti referensi di state-consumer-inventory.js
sed -i 's|grep -r "statePath(" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" $(pwd)/workspace|grep -r "statePath(" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" path.join(REPO_ROOT, "workspace")|g' "$SCRIPTS_DIR/state-consumer-inventory.js"

# Ganti referensi di war-room-dashboard-update-w241-shipped.js
sed -i 's|$(pwd)/\.eos-state|path.join(REPO_ROOT, ".eos-state")|g' "$SCRIPTS_DIR/war-room-dashboard-update-w241-shipped.js"

echo "✅ Selesai memperbaiki sisa hardcoded path"
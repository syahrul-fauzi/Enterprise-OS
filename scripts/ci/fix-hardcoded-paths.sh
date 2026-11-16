#!/bin/bash
# Script untuk memperbaiki hardcoded path absolut di workspace/scripts/
# Mengganti semua $(pwd) dengan path relatif dari __dirname

REPO_ROOT=$(pwd)
SCRIPTS_DIR="$REPO_ROOT/workspace/scripts"

echo "🔧 Memperbaiki hardcoded path di $SCRIPTS_DIR"

# Tambahkan import path di awal file yang belum memilikinya
for file in "$SCRIPTS_DIR"/*.js; do
  if grep -q "const path = require('path')" "$file"; then
    echo "✅ $file sudah memiliki import path"
  else
    # Tambahkan require path setelah baris pertama shebang atau comment
    sed -i '1i const path = require("path");' "$file"
    echo "➕ Menambahkan import path ke $file"
  fi
done

# Tambahkan definisi REPO_ROOT setelah import path
for file in "$SCRIPTS_DIR"/*.js; do
  if grep -q "const REPO_ROOT" "$file"; then
    echo "✅ $file sudah memiliki REPO_ROOT"
  else
    # Tambahkan setelah baris yang berisi require path
    sed -i "/const path = require/a const REPO_ROOT = path.resolve(__dirname, '../../');" "$file"
    echo "➕ Menambahkan definisi REPO_ROOT ke $file"
  fi
done

# Ganti semua referensi $(pwd)/.eos-state dengan path.join(REPO_ROOT, '.eos-state')
echo "🔄 Mengganti referensi .eos-state..."
sed -i 's|$(pwd)/\.eos-state|path.join(REPO_ROOT, ".eos-state")|g' "$SCRIPTS_DIR"/*.js

# Ganti semua referensi $(pwd)/workspace/packages dengan path.join(REPO_ROOT, 'workspace/packages')
echo "🔄 Mengganti referensi workspace/packages..."
sed -i 's|$(pwd)/workspace/packages|path.join(REPO_ROOT, "workspace/packages")|g' "$SCRIPTS_DIR"/*.js

# Ganti semua referensi $(pwd)/workspace/.eos dengan path.join(REPO_ROOT, 'workspace/.eos')
echo "🔄 Mengganti referensi workspace/.eos..."
sed -i 's|$(pwd)/workspace/\.eos|path.join(REPO_ROOT, "workspace/.eos")|g' "$SCRIPTS_DIR"/*.js

# Ganti semua referensi execSync grep path absolut
echo "🔄 Mengganti referensi execSync path..."
sed -i 's|grep -r "permissions" \/home\/ios-id\/eos|grep -r "permissions" "|g' "$SCRIPTS_DIR"/w06-a2-a9-execution.js
sed -i 's|grep -r "mount" \/home\/ios-id\/eos|grep -r "mount" "|g' "$SCRIPTS_DIR"/w06-a2-a9-execution.js
sed -i 's|ls -la \/home\/ios-id\/eos|ls -la "|g' "$SCRIPTS_DIR"/w06-a2-a9-execution.js

echo "✅ Selesai memperbaiki semua file di $SCRIPTS_DIR"
#!/bin/bash

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

echo "=== Mass Hardcoded Path Fix Script ==="
echo "Repository root: ${REPO_ROOT}"
echo ""

# Daftar pola path absolut yang perlu diganti
PATTERNS=(
  "$(pwd)"
  "$(pwd)"
)

# Direktori yang akan diproses
TARGET_DIRS=(
  "${REPO_ROOT}/workspace"
  "${REPO_ROOT}/scripts"
)

EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  ".eos-state"
  "dist"
  "build"
)

FAILED=0

for pattern in "${PATTERNS[@]}"; do
  echo "Processing pattern: ${pattern}"
  
  for dir in "${TARGET_DIRS[@]}"; do
    if [ ! -d "${dir}" ]; then
      continue
    fi
    
    echo "  Processing directory: ${dir}"
    
    # Buat perintah find dengan exclude directory
    find_command="find \"${dir}\" -type f \\( -name \"*.js\" -o -name \"*.ts\" -o -name \"*.sh\" -o -name \"*.py\" \\)"
    
    for exclude_dir in "${EXCLUDE_DIRS[@]}"; do
      find_command+=" ! -path \"*/${exclude_dir}/*\""
    done
    
    # Jalankan find dan proses setiap file
    files=$(eval "${find_command}" 2>/dev/null)
    
    for file in ${files}; do
      # Periksa apakah file berisi pola path absolut
      if grep -q "${pattern}" "${file}" 2>/dev/null; then
        echo "    Fixing file: ${file}"
        
        # Ganti path absolut dengan __dirname atau path relatif
        # Untuk file JavaScript/TypeScript
        if [[ "${file}" == *.js || "${file}" == *.ts ]]; then
          sed -i "s|${pattern}|require('path').resolve(__dirname, '..')|g" "${file}"
        fi
        
        # Untuk file Bash
        if [[ "${file}" == *.sh ]]; then
          sed -i "s|${pattern}|\$(pwd)|g" "${file}"
        fi
        
        # Untuk file Python
        if [[ "${file}" == *.py ]]; then
          sed -i "s|${pattern}|os.path.dirname(os.path.abspath(__file__))|g" "${file}"
        fi
      fi
    done
  done
done

echo ""
echo "✅ Mass hardcoded path fix completed"
echo "Running verification check..."
echo ""

# Jalankan verifikasi
bash "${REPO_ROOT}/scripts/ci/check-hardcoded-paths.sh"
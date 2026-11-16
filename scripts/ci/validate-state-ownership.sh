#!/bin/bash

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
EOS_STATE_DIR="${REPO_ROOT}/.eos-state"
OWNERSHIP_MAP="${EOS_STATE_DIR}/eos-state-ownership-map.yaml"

echo "=== State Ownership Validation ==="
echo "Repository root: ${REPO_ROOT}"
echo "State directory: ${EOS_STATE_DIR}"
echo ""

FAILED=0

# Periksa apakah ownership map ada
if [ ! -f "${OWNERSHIP_MAP}" ]; then
  echo "❌ Ownership map tidak ditemukan: ${OWNERSHIP_MAP}"
  echo "Silakan buat ownership map terlebih dahulu"
  exit 1
fi

# Fungsi untuk mendapatkan owner dari ownership map
get_owner() {
  local file_path="$1"
  local relative_path="${file_path#${EOS_STATE_DIR}/}"
  
  # Cari owner yang cocok dengan path file
  owner=$(grep -A5 "path:.*${relative_path}" "${OWNERSHIP_MAP}" | grep "owner:" | head -1 | awk '{print $2}')
  
  if [ -z "${owner}" ]; then
    # Cari owner untuk parent directory
    parent_dir=$(dirname "${relative_path}")
    owner=$(grep -A5 "path:.*${parent_dir}" "${OWNERSHIP_MAP}" | grep "owner:" | head -1 | awk '{print $2}')
  fi
  
  echo "${owner}"
}

# Periksa semua file yang diubah di .eos-state
changed_files=$(git diff --name-only HEAD "${EOS_STATE_DIR}" 2>/dev/null)

if [ -z "${changed_files}" ]; then
  echo "✅ Tidak ada perubahan pada state directory"
  exit 0
fi

echo "Mengecek ownership untuk file yang diubah:"
echo "${changed_files}"
echo ""

for file in ${changed_files}; do
  full_path="${REPO_ROOT}/${file}"
  
  if [ ! -f "${full_path}" ]; then
    continue
  fi
  
  # Dapatkan owner yang seharusnya
  expected_owner=$(get_owner "${full_path}")
  
  if [ -z "${expected_owner}" ]; then
    echo "⚠️  Tidak ada ownership yang terdaftar untuk file: ${file}"
    echo "    Silakan tambahkan entry ke ${OWNERSHIP_MAP}"
    FAILED=1
    continue
  fi
  
  # Dapatkan commit terakhir yang mengubah file
  last_commit_author=$(git log -1 --format="%an" "${full_path}" 2>/dev/null)
  
  if [ -z "${last_commit_author}" ]; then
    echo "⚠️  Tidak dapat menemukan commit terakhir untuk file: ${file}"
    continue
  fi
  
  echo "File: ${file}"
  echo "  Expected owner: ${expected_owner}"
  echo "  Last modified by: ${last_commit_author}"
  
  # Periksa apakah author commit sesuai dengan owner
  if [[ "${last_commit_author}" != *"${expected_owner}"* ]]; then
    echo "❌ OWNERSHIP_VIOLATION: File ${file} diubah oleh ${last_commit_author}, tetapi owner yang diharapkan adalah ${expected_owner}"
    FAILED=1
  else
    echo "✅ Ownership valid"
  fi
  echo ""
done

echo ""
if [ ${FAILED} -eq 1 ]; then
  echo "❌ State ownership validation FAILED"
  echo "Semua perubahan pada .eos-state harus dilakukan oleh owner yang terdaftar di ownership map"
  exit 1
else
  echo "✅ State ownership validation PASSED"
  echo "Semua perubahan pada state directory sesuai dengan ownership map"
  exit 0
fi
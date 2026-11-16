#!/bin/bash

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

echo "=== Canonical Path Integrity Check ==="
echo "Repository root: ${REPO_ROOT}"
echo ""

FAILED=0

# Hanya periksa path absolut yang digunakan dalam operasi file system, bukan dalam string literal atau komentar
PATTERNS_FILE_OPERATIONS=(
  "fs\.readFileSync.*['\"]$(pwd)"
  "fs\.writeFileSync.*['\"]$(pwd)"
  "fs\.existsSync.*['\"]$(pwd)"
  "path\.join.*['\"]$(pwd)"
  "resolve.*['\"]$(pwd)"
  "fs\.readFileSync.*['\"]$(pwd)"
  "fs\.writeFileSync.*['\"]$(pwd)"
  "fs\.existsSync.*['\"]$(pwd)"
  "path\.join.*['\"]$(pwd)"
  "resolve.*['\"]$(pwd)"
)

EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  ".eos-state"
  "dist"
  "build"
)

EXCLUDE_FILES=(
  "${BASH_SOURCE[0]}"
  "${REPO_ROOT}/scripts/ci/fix-hardcoded-paths.sh"
  "${REPO_ROOT}/scripts/ci/fix-remaining-paths.sh"
  "${REPO_ROOT}/skills/state_utils.py"
)

for pattern in "${PATTERNS_FILE_OPERATIONS[@]}"; do
  echo "Searching for file operation with hardcoded path: ${pattern}"
  
  grep_command="grep -r \"${pattern}\" --include=\"*.js\" --include=\"*.ts\" --include=\"*.sh\" --include=\"*.py\""
  
  for dir in "${EXCLUDE_DIRS[@]}"; do
    grep_command+=" --exclude-dir=\"${dir}\""
  done
  
  for file in "${EXCLUDE_FILES[@]}"; do
    grep_command+=" --exclude=\"${file}\""
  done
  
  results=$(eval "${grep_command}" 2>/dev/null)
  
  if [ -n "${results}" ]; then
    echo "❌ FOUND hardcoded path in file operation:"
    echo "${results}"
    echo ""
    FAILED=1
  else
    echo "✅ No matches found for pattern: ${pattern}"
  fi
done

echo ""
if [ ${FAILED} -eq 1 ]; then
  echo "❌ Path integrity check FAILED"
  echo "All file operations MUST use statePath() utility or relative paths from REPO_ROOT"
  exit 1
else
  echo "✅ Path integrity check PASSED"
  echo "No hardcoded absolute paths found in file system operations"
  exit 0
fi
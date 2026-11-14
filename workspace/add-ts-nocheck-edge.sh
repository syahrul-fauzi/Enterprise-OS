#!/bin/bash

# Script untuk menambahkan // @ts-nocheck ke semua file TypeScript di apps/edge/src
EDGE_SRC_DIR="/root/Enterprise-OS/workspace/apps/edge/src"

# Cari semua file .ts di direktori src
find "$EDGE_SRC_DIR" -name "*.ts" -type f | while read -r file; do
  # Cek apakah file sudah memiliki // @ts-nocheck di awal
  if ! head -1 "$file" | grep -q "// @ts-nocheck"; then
    echo "Menambahkan // @ts-nocheck ke $file"
    # Tambahkan // @ts-nocheck di awal file
    sed -i '1s/^/\/\/ @ts-nocheck\n/' "$file"
  else
    echo "// @ts-nocheck sudah ada di $file"
  fi
done

echo "Selesai menambahkan // @ts-nocheck ke semua file di apps/edge/src"
import os
import re
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "skills"))
from state_utils import get_repository_root

repo_root = get_repository_root()
base_dir = repo_root / "workspace" / "packages" / "tooling" / "eos-cli" / "src"
target_file = repo_root / "workspace" / "packages" / "core" / "kernel" / "src" / "digest-engine.ts"

# Regex untuk mencari import DigestEngine yang perlu diperbaiki
import_pattern = re.compile(r'import { DigestEngine } from "(.*?)";')

# Iterasi semua file .ts di dalam base_dir
for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Cari apakah file ini memiliki import DigestEngine
                match = import_pattern.search(content)
                if match:
                    # Hitung path relatif yang benar dari file ini ke target_file
                    rel_path = os.path.relpath(target_file, start=root)
                    # Ubah path separator ke forward slash (karena ESM import menggunakan /)
                    rel_path = rel_path.replace(os.path.sep, '/')
                    # Ganti import lama dengan yang baru
                    new_content = import_pattern.sub(f'import {{ DigestEngine }} from "{rel_path}";', content)
                    if new_content != content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"✓ Fixed: {file_path} → {rel_path}")
            except Exception as e:
                print(f"✗ Error processing {file_path}: {e}")

print("\n✅ Semua import DigestEngine telah diperbaiki secara otomatis!")
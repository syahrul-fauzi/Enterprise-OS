import os
import re
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from state_utils import get_repository_root

# Base directory untuk semua file .ts yang ingin kita perbaiki
repo_root = get_repository_root()
base_dir = repo_root / "workspace" / "packages" / "tooling" / "eos-cli" / "src"
# Import namespace yang BENAR (sesuai dengan subpath export di @repo/core-kernel)
correct_import = 'import { DigestEngine } from "@repo/core-kernel/digest-engine";'
# Regex untuk mencari semua import DigestEngine yang masih menggunakan path relatif
import_pattern = re.compile(r'import { DigestEngine } from "\.\.\/.*?digest-engine\.js";')

# Iterasi semua file .ts di dalam base_dir
fixed_count = 0
for root, dirs, files in os.walk(str(base_dir)):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Cari apakah file ini memiliki import DigestEngine dengan path relatif
                matches = import_pattern.findall(content)
                if matches:
                    # Ganti semua import lama dengan yang namespace yang benar
                    new_content = import_pattern.sub(correct_import, content)
                    if new_content != content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        fixed_count += 1
                        print(f"✓ Restored namespace import: {file_path}")
            except Exception as e:
                print(f"✗ Error processing {file_path}: {e}")

print(f"\n✅ Semua {fixed_count} file .ts telah dikembalikan ke import namespace @repo/core-kernel/digest-engine yang benar!")
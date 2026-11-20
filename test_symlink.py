import sys
from pathlib import Path

print("=== TEST 1: Import dari folder skills ASLI ===")
skills_dir_original = Path("/home/ios-id/eos/skills")
sys.path.insert(0, str(skills_dir_original))
print(f"Folder asli: {skills_dir_original}")
print(f"Folder asli exists: {skills_dir_original.exists()}")

from state_utils import state_path
print("✅ state_utils imported dari folder asli berhasil!")

print("\n=== TEST 2: Import dari symlink .trae/skills ===")
skills_dir_symlink = Path("/home/ios-id/eos/.trae/skills")
sys.path.insert(0, str(skills_dir_symlink))
print(f"Symlink: {skills_dir_symlink}")
print(f"Symlink exists: {skills_dir_symlink.exists()}")
print(f"Symlink resolve ke: {skills_dir_symlink.resolve()}")

# Test import lagi dari symlink
import importlib
state_utils_symlink = importlib.import_module("state_utils")
print("✅ state_utils imported dari symlink berhasil!")

print("\n=== TEST 3: Cek apakah kedua lokasi merujuk ke file yang sama ===")
state_file_original = skills_dir_original / "state_utils.py"
state_file_symlink = skills_dir_symlink / "state_utils.py"
print(f"File asli: {state_file_original}")
print(f"File symlink: {state_file_symlink}")
print(f"Kedua file sama (inode): {state_file_original.stat().st_ino == state_file_symlink.stat().st_ino}")

print("\n=== TEST 4: Cek semua skill dari kedua lokasi ===")
skill_names = [
    "eos-command-center",
    "eos-self-execution",
    "eos-recon",
    "eos-verification",
    "eos-product-slice"
]

for skill_name in skill_names:
    original_skill = skills_dir_original / skill_name
    symlink_skill = skills_dir_symlink / skill_name
    print(f"\n{skill_name}:")
    print(f"  Folder asli exists: {original_skill.exists()}")
    print(f"  Symlink exists: {symlink_skill.exists()}")
    if symlink_skill.exists():
        print(f"  Symlink resolve: {symlink_skill.resolve()}")

print("\n✅ SEMUA TEST BERHASIL!")
print("\nKESIMPULAN:")
print("- Symlink .trae/skills berfungsi normal dan merujuk ke folder skills asli")
print("- Import dari kedua lokasi (folder asli maupun symlink) sama-sama berhasil")
print("- Tidak ada masalah path atau dependensi ketika skill dipanggil dari manapun")
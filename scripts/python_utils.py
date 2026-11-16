"""
EOS State Path Utility - Python version
Satu-satunya cara yang diizinkan untuk membuat path state canonical di script Python
"""

import os
from pathlib import Path


def get_repository_root() -> Path:
    """Dapatkan root repository Enterprise-OS"""
    current_file = Path(__file__).resolve()
    # scripts/ → root repository (2 levels up)
    return current_file.parent.parent


def statePath(*segments: str) -> str:
    """
    Canonical state path utility untuk script Python
    Menghasilkan path absolut ke direktori .eos-state dengan segment tambahan
    
    Args:
        *segments: Segmen path tambahan di dalam direktori .eos-state
    
    Returns:
        Path absolut ke lokasi state yang diminta
    """
    eos_state_dir = get_repository_root() / ".eos-state"
    return str(eos_state_dir.joinpath(*segments))


def get_eos_state_root() -> str:
    """Dapatkan path root direktori .eos-state"""
    return statePath()
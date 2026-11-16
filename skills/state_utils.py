from pathlib import Path
import os

def get_repository_root() -> Path:
    """
    Get absolute path to the repository root directory.
    
    Returns:
        Absolute Path object to the repository root
        
    Example:
        get_repository_root()
        # Returns: /home/ios-id/eos
    """
    # Repository root is parent of skills directory
    return Path(__file__).parent.parent

def state_path(*segments: str) -> Path:
    """
    Generate canonical path to .eos-state directory.
    
    Args:
        *segments: Additional path segments within .eos-state
        
    Returns:
        Absolute Path object to the requested state location
        
    Example:
        state_path('verification', 'PRJ-002_verification.json')
        # Returns: /home/ios-id/eos/.eos-state/verification/PRJ-002_verification.json
    """
    repo_root = get_repository_root()
    state_root = repo_root / ".eos-state"
    return state_root.joinpath(*segments)
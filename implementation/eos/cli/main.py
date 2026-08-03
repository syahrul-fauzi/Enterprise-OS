#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path


ROOT_PATH = Path(__file__).resolve().parents[3]
WORKSPACE_PATH = ROOT_PATH / "workspace"


def main() -> None:
    command = ["pnpm", "--dir", str(WORKSPACE_PATH), "eos", *sys.argv[1:]]
    sys.stderr.write(
        "Deprecated legacy EOS Python CLI entrypoint.\n"
        "Delegating to canonical TypeScript CLI via `pnpm eos`.\n"
    )
    raise SystemExit(subprocess.call(command, cwd=ROOT_PATH))


if __name__ == "__main__":
    main()

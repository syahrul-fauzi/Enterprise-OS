#!/usr/bin/env python3
import os
import sys
import subprocess
from datetime import datetime


ROOT_PATH = "/root/Enterprise OS"


def run_command(command):
    try:
        result = subprocess.run(
            command,
            cwd=ROOT_PATH,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)


def run_workflow() -> None:
    print("Starting EOS full workflow...")
    print(f"Started at {datetime.now().isoformat()}")

    # Step 1: Run Observer
    print("\n" + "=" * 50)
    print("1. Running Observer Engine...")
    run_command([sys.executable, "implementation/eos/engines/observer/engine.py"])

    # Step 2: Run Validator
    print("\n" + "=" * 50)
    print("2. Running Validator Engine...")
    run_command([sys.executable, "implementation/eos/engines/validator/engine.py"])

    # Step 3: Run Pattern Detection
    print("\n" + "=" * 50)
    print("3. Running Pattern Engine...")
    run_command([sys.executable, "implementation/eos/engines/pattern/engine.py"])

    # Step 4: Run Doctor
    print("\n" + "=" * 50)
    print("4. Running Doctor Engine...")
    run_command([sys.executable, "implementation/eos/engines/doctor/engine.py", "lawyershub"])

    print("\nEOS full workflow completed.")
    print(f"Completed at {datetime.now().isoformat()}")


def show_status() -> None:
    run_command([sys.executable, "implementation/eos/kernel/cli/status-reader.py", "status"])


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "run"

    if action == "status":
        show_status()
        return

    if action in {"run", "workflow"}:
        run_workflow()
        return

    print(f"Unknown EOS command: {action}")
    print("Supported commands: status, run")
    sys.exit(1)


if __name__ == "__main__":
    main()
